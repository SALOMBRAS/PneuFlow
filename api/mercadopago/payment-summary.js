import { getPaymentSummaryConfig } from './_lib/config.js';
import { beginApiRequest, getCorrelationId, logPaymentEvent } from './_lib/http.js';
import { createOrderRepository } from './_lib/orders.js';
import { createPaymentClients, authenticateStoreOwner } from './_lib/supabase.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function normalizeDate(value) {
  return parseDate(value)?.toISOString() || null;
}

export function normalizePaymentRecord(payment) {
  if (!payment) return null;
  return {
    ...payment,
    created_at: normalizeDate(payment.created_at),
    approved_at: normalizeDate(payment.approved_at),
    period_start: normalizeDate(payment.period_start),
    period_end: normalizeDate(payment.period_end)
  };
}

export function getPaymentOverview(store, approvedPayments, now = new Date()) {
  const trialEndsAt = parseDate(store.trial_ends_at);
  const currentPeriodEnd = parseDate(store.current_period_end);
  const isTrial = store.subscription_status === 'trialing' && trialEndsAt && now <= trialEndsAt;
  const isPaid = store.subscription_status === 'active' && currentPeriodEnd && now < currentPeriodEnd;
  const dueAt = isTrial ? trialEndsAt : currentPeriodEnd;
  const daysRemaining = dueAt ? Math.max(0, Math.ceil((dueAt.getTime() - now.getTime()) / DAY_IN_MS)) : 0;
  const displayStatus = isTrial ? 'trialing' : isPaid && daysRemaining <= 3 ? 'expiring' : isPaid ? 'active' : 'expired';

  return {
    plan: store.plano || 'free',
    subscriptionStatus: store.subscription_status || 'trialing',
    displayStatus,
    storeCreatedAt: normalizeDate(store.created_at),
    dueAt: dueAt?.toISOString() || null,
    daysRemaining,
    approvedPayments,
    currentPlanPriceCents: 3900,
    currentPlanCurrency: 'BRL'
  };
}

export function createPaymentSummaryHandler(overrides = {}) {
  const getConfig = overrides.getConfig || getPaymentSummaryConfig;
  const makeClients = overrides.createClients || createPaymentClients;
  const authenticate = overrides.authenticate || authenticateStoreOwner;
  const makeOrders = overrides.createOrders || createOrderRepository;
  const now = overrides.now || (() => new Date());

  return async function handler(req, res) {
    if (!beginApiRequest(req, res, { methods: ['GET', 'OPTIONS'] })) return;
    const correlationId = getCorrelationId(req);
    const config = getConfig();
    if (!config.enabled) return res.status(503).json({ error: config.reason, correlationId });

    try {
      const clients = makeClients(config);
      const { store } = await authenticate(req, clients);
      const summary = await makeOrders(clients.adminClient).getSummaryForStore(store.id);
      return res.status(200).json({
        subscription: getPaymentOverview(store, summary.approvedPayments, now()),
        lastPayment: normalizePaymentRecord(summary.lastPayment),
        history: (summary.history || []).map(normalizePaymentRecord)
      });
    } catch (error) {
      if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message, correlationId });
      logPaymentEvent('error', 'summary_failed', { correlationId, message: error?.message });
      return res.status(500).json({ error: 'Não foi possível consultar o resumo de pagamentos.', correlationId });
    }
  };
}

export default createPaymentSummaryHandler();
