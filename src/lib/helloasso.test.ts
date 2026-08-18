import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { HelloAssoCheckoutIntentRequest } from './helloasso';

const invokeMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { createHelloAssoCheckoutIntent } from './helloasso';

const baseParams: HelloAssoCheckoutIntentRequest = {
  totalAmount: 3000,
  initialAmount: 3000,
  itemName: 'Saison Adulte',
  backUrl: 'https://example.com',
  errorUrl: 'https://example.com',
  returnUrl: 'https://example.com',
  containsDonation: false,
  payer: { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' },
};

describe('createHelloAssoCheckoutIntent', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  test('calls the helloasso-checkout edge function with the payload', async () => {
    invokeMock.mockResolvedValue({
      data: { id: 123, redirectUrl: 'https://checkout.example.com' },
      error: null,
    });

    const result = await createHelloAssoCheckoutIntent(baseParams);

    expect(invokeMock).toHaveBeenCalledWith('helloasso-checkout', { body: baseParams });
    expect(result).toEqual({ id: 123, redirectUrl: 'https://checkout.example.com' });
  });

  test('throws when the edge function returns an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(createHelloAssoCheckoutIntent(baseParams)).rejects.toThrow(
      'HelloAsso checkout intent failed'
    );
  });

  test('throws when the edge function returns no data', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });

    await expect(createHelloAssoCheckoutIntent(baseParams)).rejects.toThrow(
      'HelloAsso checkout intent failed'
    );
  });
});
