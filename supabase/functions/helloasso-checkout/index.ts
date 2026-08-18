import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const HELLOASSO_CLIENT_ID = Deno.env.get('HELLOASSO_CLIENT_ID') || '';
const HELLOASSO_CLIENT_SECRET = Deno.env.get('HELLOASSO_CLIENT_SECRET') || '';
const HELLOASSO_ORGANIZATION_SLUG = Deno.env.get('HELLOASSO_ORGANIZATION_SLUG') || '';

const HELLOASSO_API = 'https://api.helloasso.com/v5';
const HELLOASSO_OAUTH_API = 'https://api.helloasso.com/oauth2';

interface HelloAssoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string | number;
}

interface HelloAssoCheckoutIntentResponse {
  id: number;
  redirectUrl: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${HELLOASSO_OAUTH_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: HELLOASSO_CLIENT_ID,
      client_secret: HELLOASSO_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`HelloAsso auth failed: ${response.status} ${response.statusText}`);
  }

  const data: HelloAssoTokenResponse = await response.json();
  const expiresIn = Number(data.expires_in);
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (expiresIn - 60) * 1000;
  return cachedToken;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!HELLOASSO_CLIENT_ID || !HELLOASSO_CLIENT_SECRET || !HELLOASSO_ORGANIZATION_SLUG) {
    return jsonResponse({ error: 'HelloAsso credentials not configured' }, 500);
  }

  try {
    const token = await getAccessToken();
    const payload = await req.json();

    const response = await fetch(
      `${HELLOASSO_API}/organizations/${HELLOASSO_ORGANIZATION_SLUG}/checkout-intents`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return jsonResponse(
        { error: `HelloAsso checkout intent failed: ${response.status} ${errorBody}` },
        response.status
      );
    }

    const data: HelloAssoCheckoutIntentResponse = await response.json();
    return jsonResponse({ id: data.id, redirectUrl: data.redirectUrl }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
