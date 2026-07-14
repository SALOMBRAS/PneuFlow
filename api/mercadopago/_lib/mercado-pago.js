import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { MANUAL_MONTHLY_PLAN } from './constants.js';

export function createMercadoPagoProvider(accessToken) {
  const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
  const preference = new Preference(client);
  const payment = new Payment(client);

  return {
    async createPreference({ order, store, urls, mode, idempotencyKey }) {
      const response = await preference.create({
        body: {
          items: [{
            title: MANUAL_MONTHLY_PLAN.title,
            description: `Loja ${store.nome || 'PneuFlow'}`,
            quantity: 1,
            currency_id: MANUAL_MONTHLY_PLAN.currency,
            unit_price: MANUAL_MONTHLY_PLAN.amount
          }],
          external_reference: order.external_reference,
          metadata: {
            payment_order_id: order.id,
            store_id: order.store_id,
            plan_code: MANUAL_MONTHLY_PLAN.code,
            checkout_mode: mode
          },
          back_urls: urls.backUrls,
          notification_url: urls.notificationUrl,
          auto_return: 'approved'
        },
        requestOptions: { idempotencyKey }
      });

      return {
        preferenceId: response.id,
        checkoutUrl: mode === 'test' ? response.sandbox_init_point : response.init_point
      };
    },
    getPayment(paymentId) {
      return payment.get({ id: paymentId });
    },
    async getAccount() {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) throw new Error('Não foi possível confirmar a conta Mercado Pago.');
      return response.json();
    }
  };
}
