import { createClient } from '@supabase/supabase-js';

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
  helloasso_checkout_intent_id?: string | null;
  is_active: boolean;
  is_profile_validated: boolean;
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
  helloasso_checkout_intent_id: string | null;
  is_active: boolean;
  is_profile_validated: boolean;
  identity_photo_path?: string;
  notes?: string;
  created_at: string;
}

export interface SubscriptionInsert {
  member_id: string;
  plan_id: string;
  price: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'card' | 'helloasso';
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
 * Checks if a member exists by email and returns their data
 */
export async function checkMemberByEmail(email: string) {
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, birth_date, gender, phone, emergency_phone')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw new Error(`Erreur lors de la recherche: ${error.message}`);
  }

  return {
    exists: Boolean(data),
    memberData: data || null,
  };
}

/**
 * Inserts or updates a member and creates multiple subscriptions
 * Upserts member by email, creates one subscription per plan
 * For new members: inserts all data
 * For returning members: updates only last_name, phone, emergency_phone, and photo path
 */
export async function insertMemberWithSubscriptions(
  memberData: Omit<
    MemberInsert,
    'helloasso_checkout_intent_id' | 'is_active' | 'is_profile_validated' | 'identity_photo_path' | 'discipline_id'
  >,
  planIds: string[],
  identityPhotoPath: string
) {
  try {
    if (planIds.length === 0) {
      throw new Error('Au moins un plan doit être sélectionné');
    }

    // 1. Check if member exists by email
    const { data: existingMember, error: searchError } = await supabase
      .from('members')
      .select('id')
      .eq('email', memberData.email)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Erreur lors de la recherche du membre: ${searchError.message}`);
    }

    let memberId: string;

    if (existingMember) {
      // Returning member - UPDATE only allowed fields
      memberId = existingMember.id;

      const { error: updateError } = await supabase
        .from('members')
        .update({
          last_name: memberData.last_name,
          phone: memberData.phone,
          emergency_phone: memberData.emergency_phone,
          identity_photo_path: identityPhotoPath,
          notes: memberData.notes,
          is_profile_validated: false,
        })
        .eq('id', memberId);

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour du membre: ${updateError.message}`);
      }
    } else {
      // New member - INSERT with all fields
      memberId = crypto.randomUUID();

      const { error: memberError } = await supabase.from('members').insert({
        id: memberId,
        ...memberData,
        discipline_id: null,
        is_active: true,
        is_profile_validated: false,
        identity_photo_path: identityPhotoPath,
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
      payment_method: 'helloasso',
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
