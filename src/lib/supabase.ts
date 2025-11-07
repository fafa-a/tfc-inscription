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
