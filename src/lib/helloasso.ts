interface HelloAssoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string | number;
}

interface HelloAssoCheckoutIntentRequest {
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
  metadata: Record<string, string>;
}

const HELLOASSO_API = 'https://api.helloasso.com/v5';
const HELLOASSO_OAUTH_API = 'https://api.helloasso.com/oauth2';

let cachedToken: string | null = null;
let tokenExpiry = 0;

function getEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export async function getHelloAssoAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = getEnv('VITE_HELLOASSO_CLIENT_ID');
  const clientSecret = getEnv('VITE_HELLOASSO_CLIENT_SECRET');

  const response = await fetch(`${HELLOASSO_OAUTH_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
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

export async function createHelloAssoCheckoutIntent(
  params: HelloAssoCheckoutIntentRequest
): Promise<{ id: number; redirectUrl: string }> {
  const token = await getHelloAssoAccessToken();
  const orgSlug = getEnv('VITE_HELLOASSO_ORGANIZATION_SLUG');

  const response = await fetch(`${HELLOASSO_API}/organizations/${orgSlug}/checkout-intents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HelloAsso checkout intent failed: ${response.status} ${errorBody}`);
  }

  const data: HelloAssoCheckoutIntentResponse = await response.json();
  return { id: data.id, redirectUrl: data.redirectUrl };
}
