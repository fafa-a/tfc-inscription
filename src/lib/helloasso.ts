import { supabase } from './supabase';

export interface HelloAssoCheckoutIntentRequest {
  totalAmount: number;
  initialAmount: number;
  itemName: string;
  backUrl: string;
  errorUrl: string;
  returnUrl: string;
  containsDonation: boolean;
  payer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  metadata?: Record<string, string>;
}

interface HelloAssoCheckoutIntentResponse {
  id: number;
  redirectUrl: string;
}

export async function createHelloAssoCheckoutIntent(
  params: HelloAssoCheckoutIntentRequest
): Promise<{ id: number; redirectUrl: string }> {
  const { data, error } = await supabase.functions.invoke<HelloAssoCheckoutIntentResponse>(
    'helloasso-checkout',
    { body: params }
  );

  if (error) {
    throw new Error(`HelloAsso checkout intent failed: ${error.message}`);
  }

  if (!data) {
    throw new Error('HelloAsso checkout intent failed: empty response');
  }

  return { id: data.id, redirectUrl: data.redirectUrl };
}
