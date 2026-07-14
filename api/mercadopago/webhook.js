import { getPaymentConfig } from './_lib/config.js';
import { beginApiRequest, getCorrelationId, logPaymentEvent, readJsonBody } from './_lib/http.js';
import { createMercadoPagoProvider } from './_lib/mercado-pago.js';
import { createOrderRepository, createWebhookEventRepository } from './_lib/orders.js';
import { createPaymentClients } from './_lib/supabase.js';
import { hashWebhookPayload, validateMercadoPagoWebhookSignature } from './_lib/webhook-signature.js';
import { MANUAL_MONTHLY_PLAN } from './_lib/constants.js';

function mappedOrderStatus(paymentStatus) {
  const statuses = {
    approved: 'approved',
    pending: 'pending',
    in_process: 'pending',
    rejected: 'rejected',
    cancelled: 'cancelled',
    expired: 'expired',
    refunded: 'refunded',
    charged_back: 'charged_back'
  };
  return statuses[paymentStatus] || 'error';
}

function validationFailure(message) {
  const error = new Error(message);
  error.code = 'payment_validation_failed';
  return error;
}

function assertConfirmedPayment({ payment, order, account }) {
  if (Number(payment.transaction_amount) !== MANUAL_MONTHLY_PLAN.amount) {
    throw validationFailure('Valor do pagamento não corresponde ao plano.');
  }
  if (payment.currency_id !== MANUAL_MONTHLY_PLAN.currency) {
    throw validationFailure('Moeda do pagamento não corresponde ao plano.');
  }
  if (payment.external_reference !== order.external_reference) {
    throw validationFailure('Referência externa não corresponde ao pedido.');
  }
  if (String(payment?.metadata?.payment_order_id || '') !== String(order.id)) {
    throw validationFailure('Pedido do pagamento não corresponde ao pedido interno.');
  }
  if (payment.preference_id && order.preference_id && payment.preference_id !== order.preference_id) {
    throw validationFailure('Preferência do pagamento não corresponde ao pedido.');
  }
  if (account?.id && String(payment.collector_id) !== String(account.id)) {
    throw validationFailure('Conta recebedora do pagamento não corresponde à conta configurada.');
  }
}

export function createWebhookHandler(overrides = {}) {
  const getConfig = overrides.getConfig || getPaymentConfig;
  const makeClients = overrides.createClients || createPaymentClients;
  const makeOrders = overrides.createOrders || createOrderRepository;
  const makeEvents = overrides.createEvents || createWebhookEventRepository;
  const makeProvider = overrides.createProvider || createMercadoPagoProvider;
  const validateSignature = overrides.validateSignature || validateMercadoPagoWebhookSignature;
  const hashPayload = overrides.hashPayload || hashWebhookPayload;
  const now = overrides.now || (() => Date.now());

  return async function handler(req, res) {
    if (!beginApiRequest(req, res, { methods: ['POST', 'OPTIONS'], allowUnauthenticated: true })) return;
    const correlationId = getCorrelationId(req);
    const config = getConfig();
    if (!config.enabled) return res.status(503).json({ error: config.reason, correlationId });
    if (!config.webhookSecret) return res.status(503).json({ error: 'Webhook indisponível neste ambiente.', correlationId });

    const body = readJsonBody(req.body);
    if (!body) return res.status(400).json({ error: 'Corpo da notificação inválido.', correlationId });

    const signature = validateSignature({ headers: req.headers, body, secret: config.webhookSecret, now: now() });
    if (!signature.valid) {
      logPaymentEvent('warn', 'webhook_rejected', { correlationId, reason: signature.reason });
      return res.status(401).json({ error: 'Assinatura de webhook inválida.' });
    }

    const resourceId = String(body?.data?.id || '').trim();
    if (!resourceId) return res.status(400).json({ error: 'Notificação sem recurso de pagamento.' });

    const providerEventId = String(body.id || signature.requestId || `${body.type}:${resourceId}`);
    const clients = makeClients(config);
    const events = makeEvents(clients.adminClient);
    let event;

    try {
      event = await events.register({
        provider: MANUAL_MONTHLY_PLAN.provider,
        provider_event_id: providerEventId,
        event_type: String(body.type || body.action || 'payment'),
        resource_id: resourceId,
        payment_id: resourceId,
        payload_hash: hashPayload(body)
      });
      if (event.duplicate) return res.status(200).json({ received: true, duplicate: true });

      const provider = makeProvider(config.accessToken);
      const [payment, account] = await Promise.all([provider.getPayment(resourceId), provider.getAccount()]);
      const orders = makeOrders(clients.adminClient);
      const order = await orders.findByExternalReference(payment.external_reference);

      if (!order) throw validationFailure('Pedido interno não encontrado para o pagamento.');
      assertConfirmedPayment({ payment, order, account });

      const status = mappedOrderStatus(payment.status);
      if (status === 'approved') {
        await orders.applyApproval(order.id, String(payment.id), payment.date_approved || new Date(now()).toISOString());
      } else {
        await orders.updateFromPayment(order.id, {
          status,
          payment_id: String(payment.id),
          approved_at: null,
          needs_review: status === 'refunded' || status === 'charged_back'
        });
      }

      await events.mark(event.id, { processing_status: 'processed', error_code: null });
      logPaymentEvent('info', 'webhook_processed', { correlationId, orderId: order.id, status });
      return res.status(200).json({ received: true });
    } catch (error) {
      if (event?.id) {
        try {
          await events.mark(event.id, { processing_status: 'error', error_code: error.code || 'processing_failed' });
        } catch (markError) {
          logPaymentEvent('error', 'webhook_event_mark_failed', { correlationId, message: markError?.message });
        }
      }
      logPaymentEvent('error', 'webhook_failed', { correlationId, code: error?.code, message: error?.message });
      return res.status(500).json({ error: 'Não foi possível processar a notificação.' });
    }
  };
}

export default createWebhookHandler();
