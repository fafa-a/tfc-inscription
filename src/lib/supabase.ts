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
  season_label: string;
  price: number;
  discipline_id: string;
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
  discipline_id: string;
  stripe_customer_id: string;
  is_active: boolean;
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
  notes?: string;
  created_at: string;
}

export interface SubscriptionInsert {
  member_id: string;
  plan_id: string;
  season_label: string;
  type: string;
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
 * Inserts a new member and their subscription into the database
 */
export async function insertMemberWithSubscription(
  memberData: Omit<MemberInsert, 'stripe_customer_id' | 'is_active'>,
  planId: string,
  seasonLabel: string
) {
  try {
    // 1. Insert the member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        ...memberData,
        stripe_customer_id: generateTempStripeId(),
        is_active: true,
      })
      .select()
      .single();

    if (memberError) {
      throw new Error(`Erreur lors de l'insertion du membre: ${memberError.message}`);
    }

    if (!member) {
      throw new Error("Aucune donnée retournée après l'insertion du membre");
    }

    // 2. Get subscription plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) {
      throw new Error(`Erreur lors de la récupération du plan: ${planError.message}`);
    }

    if (!plan) {
      throw new Error("Plan d'abonnement introuvable");
    }

    // 3. Create subscription
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = calculateEndDate(startDate, plan.type);

    const subscriptionData: SubscriptionInsert = {
      member_id: member.id,
      plan_id: planId,
      season_label: seasonLabel,
      type: plan.type,
      price: plan.price,
      payment_status: 'pending',
      payment_method: 'card',
      start_date: startDate,
      end_date: endDate,
      notes: 'Abonnement créé depuis formulaire web',
    };

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subscriptionError) {
      throw new Error(`Erreur lors de l'insertion de l'abonnement: ${subscriptionError.message}`);
    }

    return {
      success: true,
      member,
      subscription,
    };
  } catch (error) {
    console.error('Error in insertMemberWithSubscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
    };
  }
}
