import { createClient } from '@supabase/supabase-js';
import { uploadIdentityPhoto } from '../utils/uploadPhoto';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Discipline {
  id: string;
  name: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'season' | 'semester1' | 'quarter' | 'month' | 'yearly';
  duration: 'season' | 'semester1' | 'quarter' | 'month' | 'yearly';
  price: number;
  discipline_id: string;
  audience: 'adult' | 'reduced' | 'teen' | 'child';
  active: boolean;
}

export type AgeGroup = 'enfant' | 'ado' | 'adulte';

export interface MemberInsert {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  emergency_phone: string;
  email: string;
  discipline_id?: string | null;
  stripe_customer_id: string;
  is_active: boolean;
  identity_photo_path?: string;
  notes?: string;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  emergency_phone: string;
  email: string;
  discipline_id: string;
  stripe_customer_id: string;
  is_active: boolean;
  identity_photo_path?: string;
  notes?: string;
  created_at: string;
}

export interface SubscriptionInsert {
  member_id: string;
  plan_id: string;
  price: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'card';
  start_date: string;
  end_date: string;
  notes?: string;
}

/**
 * Converts DD/MM/YYYY format to YYYY-MM-DD format for database
 */
export function convertToISODate(dateStr: string): string {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates subscription end date based on type
 */
export function calculateEndDate(startDate: string, type: string): string {
  const start = new Date(startDate);

  switch (type) {
    case 'yearly':
    case 'season':
      start.setFullYear(start.getFullYear() + 1);
      break;
    case 'semester1':
      start.setMonth(start.getMonth() + 6);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() + 3);
      break;
    case 'month':
      start.setMonth(start.getMonth() + 1);
      break;
    default:
      start.setFullYear(start.getFullYear() + 1);
  }

  return start.toISOString().split('T')[0];
}

/**
 * Generates a temporary Stripe customer ID
 */
export function generateTempStripeId(): string {
  return `fake_${crypto.randomUUID()}`;
}

/**
 * Inserts or updates a member and creates multiple subscriptions
 * Upserts member by email, uploads photo if new member, creates one subscription per plan
 */
export async function insertMemberWithSubscriptions(
  memberData: Omit<
    MemberInsert,
    'stripe_customer_id' | 'is_active' | 'identity_photo_path' | 'discipline_id'
  >,
  planIds: string[],
  identityPhoto: File
) {
  try {
    if (planIds.length === 0) {
      throw new Error('Au moins un plan doit être sélectionné');
    }

    // 1. Check if member exists by email
    const { data: existingMember, error: searchError } = await supabase
      .from('members')
      .select('id, identity_photo_path')
      .eq('email', memberData.email)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Erreur lors de la recherche du membre: ${searchError.message}`);
    }

    let memberId: string;
    let photoPath: string | undefined;

    if (existingMember) {
      // Member exists - use existing ID and photo
      memberId = existingMember.id;
      photoPath = existingMember.identity_photo_path || undefined;
    } else {
      // New member - generate ID and upload photo
      memberId = crypto.randomUUID();

      const uploadResult = await uploadIdentityPhoto(identityPhoto, memberId);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Erreur lors de l'upload de la photo");
      }

      photoPath = uploadResult.path;

      // Insert new member
      const { error: memberError } = await supabase.from('members').insert({
        id: memberId,
        ...memberData,
        discipline_id: null,
        stripe_customer_id: generateTempStripeId(),
        is_active: true,
        identity_photo_path: photoPath,
      });

      if (memberError) {
        throw new Error(`Erreur lors de l'insertion du membre: ${memberError.message}`);
      }
    }

    // 2. Fetch all plan details
    const { data: plans, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, duration, price')
      .in('id', planIds);

    if (planError) {
      throw new Error(`Erreur lors de la récupération des plans: ${planError.message}`);
    }

    if (!plans || plans.length === 0) {
      throw new Error("Plans d'abonnement introuvables");
    }

    // 3. Create subscriptions for each plan
    const startDate = new Date().toISOString().split('T')[0];

    const subscriptionsToInsert: SubscriptionInsert[] = plans.map((plan) => ({
      member_id: memberId,
      plan_id: plan.id,
      price: plan.price,
      payment_status: 'pending',
      payment_method: 'card',
      start_date: startDate,
      end_date: calculateEndDate(startDate, plan.duration),
      notes: 'Abonnement créé depuis formulaire web',
    }));

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(subscriptionsToInsert)
      .select();

    if (subscriptionError) {
      throw new Error(`Erreur lors de l'insertion des abonnements: ${subscriptionError.message}`);
    }

    return {
      success: true,
      memberId,
      subscriptions,
      isNewMember: !existingMember,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
    };
  }
}
