import crypto from 'node:crypto';
import { getPaymentConfig, buildPaymentUrls } from './_lib/config.js';
import { beginApiRequest, getCorrelationId, logPaymentEvent, readJsonBody } from './_lib/http.js';
import { createMercadoPagoProvider } from './_lib/mercado-pago.js';
import { createOrderRepository } from './_lib/orders.js';
import { createPaymentClients, authenticateStoreOwner } from './_lib/supabase.js';

const MAX_ORDERS_PER_TEN_MINUTES = 5;

function validIdempotencyKey(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function responseFromOrder(order, reused = false) {
  return {
    orderId: order.id,
    checkoutUrl: order.checkout_url,
    mode: order.checkout_mode,
    reused
  };
}

export function createPreferenceHandler(overrides = {}) {
  const getConfig = overrides.getConfig || getPaymentConfig;
  const makeClients = overrides.createClients || createPaymentClients;
  const authenticate = overrides.authenticate || authenticateStoreOwner;
  const makeOrders = overrides.createOrders || createOrderRepository;
  const makeProvider = overrides.createProvider || createMercadoPagoProvider;
  const now = overrides.now || (() => new Date());
  const randomUuid = overrides.randomUuid || crypto.randomUUID;

  return async function handler(req, res) {
    if (!beginApiRequest(req, res, { methods: ['POST', 'OPTIONS'] })) return;
    const correlationId = getCorrelationId(req);
    const config = getConfig();

    if (!config.enabled) {
      return res.status(503).json({ error: config.reason, correlationId });
    }

    const body = readJsonBody(req.body);
    if (!body) return res.status(400).json({ error: 'Corpo da requisição inválido.', correlationId });

    const idempotencyKey = String(req.headers?.['idempotency-key'] || '');
    if (!validIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({ error: 'Chave de idempotência inválida.', correlationId });
    }

    try {
      const clients = makeClients(config);
      const { user, store } = await authenticate(req, clients);
      const orders = makeOrders(clients.adminClient);
      const existing = await orders.findByIdempotency(user.id, idempotencyKey);

      if (existing?.checkout_url) {
        return res.status(200).json(responseFromOrder(existing, true));
      }

      if (!existing) {
        const tenMinutesAgo = new Date(now().getTime() - 10 * 60 * 1000).toISOString();
        const recentCount = await orders.countRecentOrders(user.id, tenMinutesAgo);
        if (recentCount >= MAX_ORDERS_PER_TEN_MINUTES) {
          return res.status(429).json({ error: 'Aguarde alguns minutos antes de iniciar outro pagamento.', correlationId });
        }
      }

      let order = existing;
      if (!order) {
        try {
          order = await orders.create({
            storeId: store.id,
            ownerUserId: user.id,
            externalReference: `pneuflow:${randomUuid()}`,
            idempotencyKey,
            mode: config.mode
          });
        } catch (error) {
          // A parallel click can hit the unique owner/idempotency constraint. Reuse the
          // winner instead of creating another preference or exposing a database error.
          if (error?.code !== '23505') throw error;
          order = await orders.findByIdempotency(user.id, idempotencyKey);
          if (!order) throw error;
        }
      }

      const provider = makeProvider(config.accessToken);
      const paymentPreference = await provider.createPreference({
        order,
        store,
        urls: buildPaymentUrls(config.appUrl, order.id),
        mode: config.mode,
        idempotencyKey
      });

      if (!paymentPreference.checkoutUrl) throw new Error('O Mercado Pago não retornou uma URL de checkout.');
      const savedOrder = await orders.setPreference(order.id, paymentPreference);
      logPaymentEvent('info', 'preference_created', { correlationId, orderId: order.id, mode: config.mode });
      return res.status(200).json(responseFromOrder(savedOrder));
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({ error: error.message, correlationId });
      }
      logPaymentEvent('error', 'preference_failed', { correlationId, message: error?.message });
      return res.status(500).json({ error: 'Não foi possível iniciar o checkout.', correlationId });
    }
  };
}

export default createPreferenceHandler();
