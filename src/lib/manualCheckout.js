import { getApiUrl } from './runtime';

export async function createManualCheckout({ accessToken, idempotencyKey }) {
  const response = await fetch(getApiUrl('/api/mercadopago/create-preference'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({})
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(payload.error || 'Não foi possível iniciar o checkout.');
  if (payload.mode !== 'test' || !payload.checkoutUrl || !payload.orderId) {
    throw new Error('O checkout de teste não está disponível neste ambiente.');
  }

  sessionStorage.setItem('pneuflow:payment-order-id', payload.orderId);
  return payload.checkoutUrl;
}
