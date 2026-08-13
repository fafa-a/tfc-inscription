import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// HELLOASSO_WEBHOOK_SECRET must equal the `signatureKey` returned by
// `PUT /partners/me/api-notifications/organizations/{organizationSlug}`
// (HelloAsso API notification configuration), NOT an arbitrary secret.
const HELLOASSO_WEBHOOK_SECRET = Deno.env.get('HELLOASSO_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(HELLOASSO_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = Uint8Array.from(
    signature.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
  );

  return crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(body));
}

interface HelloAssoEvent {
  eventType: string;
  data: {
    id: number;
    checkoutIntentId?: number;
    paymentState?: string;
    order?: {
      id: number;
      state: string;
      checkoutIntentId: number;
    };
  };
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('X-HelloAsso-Signature') || '';
  const body = await req.text();

  if (!HELLOASSO_WEBHOOK_SECRET) {
    console.error('HELLOASSO_WEBHOOK_SECRET not configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const isValid = await verifySignature(body, signature);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event: HelloAssoEvent = JSON.parse(body);

  try {
    switch (event.eventType) {
      case 'Order': {
        const orderState = event.data.order?.state;
        const checkoutIntentId = event.data.order?.checkoutIntentId;

        if (!checkoutIntentId) {
          console.error('Missing checkoutIntentId in Order event');
          break;
        }

        if (orderState === 'Processed' || orderState === 'Authorized') {
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('id')
            .eq('helloasso_checkout_intent_id', String(checkoutIntentId))
            .single();

          if (memberError || !member) {
            console.error('Member not found for checkout intent:', checkoutIntentId);
            break;
          }

          const { error } = await supabase
            .from('subscriptions')
            .update({ payment_status: 'paid' })
            .eq('member_id', member.id);

          if (error) {
            console.error('Failed to update subscriptions:', error.message);
          }
        }
        break;
      }

      case 'Payment': {
        const paymentState = event.data.paymentState;
        const checkoutIntentId = event.data.checkoutIntentId;

        if (!checkoutIntentId) {
          console.error('Missing checkoutIntentId in Payment event');
          break;
        }

        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('helloasso_checkout_intent_id', String(checkoutIntentId))
          .single();

        if (memberError || !member) {
          console.error('Member not found for checkout intent:', checkoutIntentId);
          break;
        }

        const paymentStatus = paymentState === 'Authorized' ? 'paid' : 'failed';

        const { error } = await supabase
          .from('subscriptions')
          .update({ payment_status: paymentStatus })
          .eq('member_id', member.id);

        if (error) {
          console.error('Failed to update subscriptions:', error.message);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.eventType);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
