import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { createPreferenceHandler } from '../../api/mercadopago/create-preference.js';
import { createWebhookHandler } from '../../api/mercadopago/webhook.js';
import { createPaymentStatusHandler } from '../../api/mercadopago/payment-status.js';
import { calculateManualPeriod } from '../../api/mercadopago/_lib/period.js';
import { validateMercadoPagoWebhookSignature } from '../../api/mercadopago/_lib/webhook-signature.js';
import { PAYMENT_STATUS_POLL_DELAYS, hasPaymentPollingTimedOut } from '../../src/lib/paymentPolling.js';
import { getSubscriptionAccess } from '../../src/utils/subscriptionAccess.js';

const config = {
  enabled: true,
  mode: 'test',
  appUrl: 'https://preview.example.test',
  accessToken: 'test-token',
  webhookSecret: 'webhook-secret',
  supabaseUrl: 'https://supabase.example.test',
  serviceRoleKey: 'service-role-key',
  publishableKey: 'publishable-key'
};

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; }
  };
}

function request({ method = 'POST', headers = {}, body = {}, query = {} } = {}) {
  return { method, headers, body, query };
}

function authError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validPayment(overrides = {}) {
  return {
    id: 'payment-1',
    status: 'approved',
    transaction_amount: 39,
    currency_id: 'BRL',
    external_reference: 'pneuflow:reference',
    metadata: { payment_order_id: 'order-1' },
    collector_id: 'seller-1',
    date_approved: '2026-07-14T12:00:00.000Z',
    ...overrides
  };
}

test('checkout rejects requests without a token', async () => {
  const handler = createPreferenceHandler({
    getConfig: () => config,
    createClients: () => ({ adminClient: {} }),
    authenticate: async () => { throw authError('Autenticação obrigatória.', 401); }
  });
  const res = response();
  await handler(request({ headers: { 'idempotency-key': crypto.randomUUID() } }), res);
  assert.equal(res.statusCode, 401);
});

test('checkout rejects an invalid token, missing store, and seller', async () => {
  for (const failure of [authError('Sessão inválida ou expirada.', 401), authError('Nenhuma loja de proprietário foi encontrada para esta conta.', 403), authError('Vendedor não autorizado.', 403)]) {
    const handler = createPreferenceHandler({
      getConfig: () => config,
      createClients: () => ({ adminClient: {} }),
      authenticate: async () => { throw failure; }
    });
    const res = response();
    await handler(request({ headers: { authorization: 'Bearer token', 'idempotency-key': crypto.randomUUID() } }), res);
    assert.equal(res.statusCode, failure.statusCode);
  }
});

test('checkout ignores client price, plan, and store values', async () => {
  let providerInput;
  const handler = createPreferenceHandler({
    getConfig: () => config,
    createClients: () => ({ adminClient: {} }),
    authenticate: async () => ({ user: { id: 'owner-1' }, store: { id: 'store-1', nome: 'Loja segura' } }),
    createOrders: () => ({
      findByIdempotency: async () => null,
      countRecentOrders: async () => 0,
      create: async () => ({ id: 'order-1', store_id: 'store-1', external_reference: 'pneuflow:reference', checkout_mode: 'test' }),
      setPreference: async (_, values) => ({ id: 'order-1', checkout_mode: 'test', checkout_url: values.checkoutUrl })
    }),
    createProvider: () => ({ createPreference: async (input) => { providerInput = input; return { preferenceId: 'pref-1', checkoutUrl: 'https://sandbox.mercadopago.com/checkout' }; } })
  });
  const res = response();
  await handler(request({ headers: { authorization: 'Bearer token', 'idempotency-key': crypto.randomUUID() }, body: { amount: 1, plan: 'free', storeId: 'other-store' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(providerInput.order.store_id, 'store-1');
  assert.equal(providerInput.mode, 'test');
});

test('checkout reuses an existing idempotent preference', async () => {
  let providerCalled = false;
  const handler = createPreferenceHandler({
    getConfig: () => config,
    createClients: () => ({ adminClient: {} }),
    authenticate: async () => ({ user: { id: 'owner-1' }, store: { id: 'store-1' } }),
    createOrders: () => ({ findByIdempotency: async () => ({ id: 'order-1', checkout_mode: 'test', checkout_url: 'https://sandbox.mercadopago.com/existing' }) }),
    createProvider: () => ({ createPreference: async () => { providerCalled = true; } })
  });
  const res = response();
  await handler(request({ headers: { authorization: 'Bearer token', 'idempotency-key': crypto.randomUUID() } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reused, true);
  assert.equal(providerCalled, false);
});

test('a concurrent idempotency collision reuses the winning order', async () => {
  let createCalls = 0;
  const handler = createPreferenceHandler({
    getConfig: () => config,
    createClients: () => ({ adminClient: {} }),
    authenticate: async () => ({ user: { id: 'owner-1' }, store: { id: 'store-1' } }),
    createOrders: () => ({
      findByIdempotency: async () => {
        createCalls += 1;
        return createCalls === 1 ? null : { id: 'order-1', store_id: 'store-1', external_reference: 'pneuflow:reference', checkout_mode: 'test' };
      },
      countRecentOrders: async () => 0,
      create: async () => { const error = new Error('unique'); error.code = '23505'; throw error; },
      setPreference: async (_, values) => ({ id: 'order-1', checkout_mode: 'test', checkout_url: values.checkoutUrl })
    }),
    createProvider: () => ({ createPreference: async () => ({ preferenceId: 'pref-1', checkoutUrl: 'https://sandbox.mercadopago.com/checkout' }) })
  });
  const res = response();
  await handler(request({ headers: { authorization: 'Bearer token', 'idempotency-key': crypto.randomUUID() } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.orderId, 'order-1');
});

test('payment status requires authentication and returns only the derived store order', async () => {
  const denied = createPaymentStatusHandler({
    getConfig: () => config,
    createClients: () => ({ adminClient: {} }),
    authenticate: async () => { throw authError('Autenticação obrigatória.', 401); }
  });
  const deniedResponse = response();
  await denied(request({ method: 'GET' }), deniedResponse);
  assert.equal(deniedResponse.statusCode, 401);

  const handler = createPaymentStatusHandler({
    getConfig: () => config,
    createClients: () => ({ adminClient: {} }),
    authenticate: async () => ({ store: { id: 'store-1', subscription_status: 'active', current_period_end: '2026-08-13T00:00:00.000Z' } }),
    createOrders: () => ({ getForStore: async (storeId, orderId) => ({ id: orderId, status: 'pending', checkout_mode: 'test' }) })
  });
  const res = response();
  await handler(request({ method: 'GET', headers: { authorization: 'Bearer token' }, query: { order: 'order-1' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.order.id, 'order-1');
});

test('webhook signature rejects missing and invalid signatures', () => {
  const body = { data: { id: '123' } };
  assert.equal(validateMercadoPagoWebhookSignature({ headers: {}, body, secret: 'secret' }).valid, false);
  assert.equal(validateMercadoPagoWebhookSignature({ headers: { 'x-request-id': 'req', 'x-signature': 'ts=1,v1=bad' }, body, secret: 'secret', now: 1000 }).valid, false);
});

test('webhook signature accepts a fresh official manifest', () => {
  const now = 1_700_000_000_000;
  const body = { data: { id: 'ABC123' } };
  const manifest = 'id:abc123;request-id:req-1;ts:1700000000;';
  const signature = crypto.createHmac('sha256', 'secret').update(manifest).digest('hex');
  const result = validateMercadoPagoWebhookSignature({ headers: { 'x-request-id': 'req-1', 'x-signature': `ts=1700000000,v1=${signature}` }, body, secret: 'secret', now });
  assert.equal(result.valid, true);
});

test('webhook handles duplicate events without applying access twice', async () => {
  let providerCalled = false;
  const handler = createWebhookHandler({
    getConfig: () => config,
    validateSignature: () => ({ valid: true, requestId: 'req-1' }),
    createClients: () => ({ adminClient: {} }),
    createEvents: () => ({ register: async () => ({ duplicate: true }) }),
    createProvider: () => ({ getPayment: async () => { providerCalled = true; } })
  });
  const res = response();
  await handler(request({ headers: {}, body: { id: 'event-1', data: { id: 'payment-1' } } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(providerCalled, false);
});

test('webhook leaves pending payments without access and approves once', async () => {
  for (const payment of [validPayment({ status: 'pending' }), validPayment()]) {
    const calls = { update: 0, apply: 0 };
    const handler = createWebhookHandler({
      getConfig: () => config,
      validateSignature: () => ({ valid: true, requestId: `req-${payment.status}` }),
      createClients: () => ({ adminClient: {} }),
      createEvents: () => ({ register: async () => ({ id: 'event-1', duplicate: false }), mark: async () => {} }),
      createProvider: () => ({ getPayment: async () => payment, getAccount: async () => ({ id: 'seller-1' }) }),
      createOrders: () => ({
        findByExternalReference: async () => ({ id: 'order-1', external_reference: 'pneuflow:reference', preference_id: null }),
        updateFromPayment: async () => { calls.update += 1; },
        applyApproval: async () => { calls.apply += 1; }
      })
    });
    const res = response();
    await handler(request({ body: { id: `event-${payment.status}`, data: { id: 'payment-1' } } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.apply, payment.status === 'approved' ? 1 : 0);
    assert.equal(calls.update, payment.status === 'approved' ? 0 : 1);
  }
});

test('webhook rejects divergent amount, currency, external reference, and payment metadata', async () => {
  for (const payment of [validPayment({ transaction_amount: 38 }), validPayment({ currency_id: 'USD' }), validPayment({ external_reference: 'wrong' }), validPayment({ metadata: { payment_order_id: 'wrong' } })]) {
    const handler = createWebhookHandler({
      getConfig: () => config,
      validateSignature: () => ({ valid: true, requestId: 'req-1' }),
      createClients: () => ({ adminClient: {} }),
      createEvents: () => ({ register: async () => ({ id: 'event-1', duplicate: false }), mark: async () => {} }),
      createProvider: () => ({ getPayment: async () => payment, getAccount: async () => ({ id: 'seller-1' }) }),
      createOrders: () => ({ findByExternalReference: async () => ({ id: 'order-1', external_reference: 'pneuflow:reference' }) })
    });
    const res = response();
    await handler(request({ body: { data: { id: 'payment-1' } } }), res);
    assert.equal(res.statusCode, 500);
  }
});

test('a duplicate payment id cannot apply access a second time', async () => {
  let processed = false;
  const handler = createWebhookHandler({
    getConfig: () => config,
    validateSignature: () => ({ valid: true, requestId: 'req-duplicate-payment' }),
    createClients: () => ({ adminClient: {} }),
    createEvents: () => ({ register: async () => ({ id: 'event-1', duplicate: false }), mark: async (_, values) => { processed = values.processing_status === 'processed'; } }),
    createProvider: () => ({ getPayment: async () => validPayment(), getAccount: async () => ({ id: 'seller-1' }) }),
    createOrders: () => ({
      findByExternalReference: async () => ({ id: 'order-1', external_reference: 'pneuflow:reference', preference_id: null }),
      applyApproval: async () => { throw new Error('duplicate payment id'); }
    })
  });
  const res = response();
  await handler(request({ body: { data: { id: 'payment-1' } } }), res);
  assert.equal(res.statusCode, 500);
  assert.equal(processed, false);
});

test('manual period grants 30 days and extends a current period', () => {
  const approved = '2026-07-14T00:00:00.000Z';
  assert.equal(calculateManualPeriod(null, approved).periodEnd, '2026-08-13T00:00:00.000Z');
  assert.equal(calculateManualPeriod('2026-08-01T00:00:00.000Z', approved).periodEnd, '2026-08-31T00:00:00.000Z');
});

test('active access expires at current_period_end and trial remains seven-day based', () => {
  const now = new Date('2026-07-14T12:00:00.000Z');
  assert.equal(getSubscriptionAccess({ subscription_status: 'active', current_period_end: '2026-07-14T11:00:00.000Z' }, now).hasStoreAccess, false);
  assert.equal(getSubscriptionAccess({ subscription_status: 'active', current_period_end: '2026-07-15T12:00:00.000Z' }, now).hasStoreAccess, true);
  assert.equal(getSubscriptionAccess({ subscription_status: 'trialing', trial_ends_at: '2026-07-14T18:00:00.000Z' }, now).hasStoreAccess, true);
});

test('browser return polling is bounded and never changes subscription state itself', () => {
  assert.equal(PAYMENT_STATUS_POLL_DELAYS[0], 0);
  assert.equal(hasPaymentPollingTimedOut(PAYMENT_STATUS_POLL_DELAYS.length - 1), true);
  assert.equal(hasPaymentPollingTimedOut(0), false);
});
