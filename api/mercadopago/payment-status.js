import { getPaymentConfig } from './_lib/config.js';
import { beginApiRequest, getCorrelationId, logPaymentEvent } from './_lib/http.js';
import { createOrderRepository } from './_lib/orders.js';
import { createPaymentClients, authenticateStoreOwner } from './_lib/supabase.js';

export function createPaymentStatusHandler(overrides = {}) {
  const getConfig = overrides.getConfig || getPaymentConfig;
  const makeClients = overrides.createClients || createPaymentClients;
  const authenticate = overrides.authenticate || authenticateStoreOwner;
  const makeOrders = overrides.createOrders || createOrderRepository;

  return async function handler(req, res) {
    if (!beginApiRequest(req, res, { methods: ['GET', 'OPTIONS'] })) return;
    const correlationId = getCorrelationId(req);
    const config = getConfig();
    if (!config.enabled) return res.status(503).json({ error: config.reason, correlationId });

    try {
      const clients = makeClients(config);
      const { store } = await authenticate(req, clients);
      const requestedOrderId = String(req.query?.order || '').trim() || undefined;
      const order = await makeOrders(clients.adminClient).getForStore(store.id, requestedOrderId);

      return res.status(200).json({
        order: order ? {
          id: order.id,
          status: order.status,
          createdAt: order.created_at,
          approvedAt: order.approved_at,
          periodStart: order.period_start,
          periodEnd: order.period_end,
          mode: order.checkout_mode
        } : null,
        subscription: {
          status: store.subscription_status,
          currentPeriodEnd: store.current_period_end
        }
      });
    } catch (error) {
      if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message, correlationId });
      logPaymentEvent('error', 'status_failed', { correlationId, message: error?.message });
      return res.status(500).json({ error: 'Não foi possível consultar o pagamento.', correlationId });
    }
  };
}

export default createPaymentStatusHandler();
