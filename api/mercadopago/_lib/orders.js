import { MANUAL_MONTHLY_PLAN } from './constants.js';

export function createOrderRepository(adminClient) {
  return {
    async countRecentOrders(ownerUserId, sinceIso) {
      const { count, error } = await adminClient
        .from('payment_orders')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', ownerUserId)
        .gte('created_at', sinceIso);
      if (error) throw error;
      return count || 0;
    },

    async findByIdempotency(ownerUserId, idempotencyKey) {
      const { data, error } = await adminClient
        .from('payment_orders')
        .select('*')
        .eq('owner_user_id', ownerUserId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async create({ storeId, ownerUserId, externalReference, idempotencyKey, mode }) {
      const { data, error } = await adminClient
        .from('payment_orders')
        .insert({
          store_id: storeId,
          owner_user_id: ownerUserId,
          external_reference: externalReference,
          idempotency_key: idempotencyKey,
          checkout_mode: mode,
          provider: MANUAL_MONTHLY_PLAN.provider,
          plan_code: MANUAL_MONTHLY_PLAN.code,
          amount_cents: MANUAL_MONTHLY_PLAN.amountCents,
          currency: MANUAL_MONTHLY_PLAN.currency
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    async setPreference(orderId, { preferenceId, checkoutUrl }) {
      const { data, error } = await adminClient
        .from('payment_orders')
        .update({ preference_id: preferenceId, checkout_url: checkoutUrl, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    async setError(orderId) {
      const { error } = await adminClient
        .from('payment_orders')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },

    async findByExternalReference(externalReference) {
      const { data, error } = await adminClient
        .from('payment_orders')
        .select('*')
        .eq('external_reference', externalReference)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async getForStore(storeId, orderId) {
      let query = adminClient
        .from('payment_orders')
        .select('id, status, checkout_mode, created_at, approved_at, period_start, period_end, payment_id')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (orderId) query = query.eq('id', orderId);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },

    async updateFromPayment(orderId, values) {
      const { error } = await adminClient
        .from('payment_orders')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },

    async applyApproval(orderId, paymentId, approvedAt) {
      const { data, error } = await adminClient.rpc('apply_manual_payment_approval', {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_approved_at: approvedAt
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    }
  };
}

export function createWebhookEventRepository(adminClient) {
  return {
    async register(event) {
      const { data, error } = await adminClient
        .from('payment_webhook_events')
        .insert(event)
        .select('id')
        .maybeSingle();

      if (error?.code === '23505') return { duplicate: true };
      if (error) throw error;
      return { id: data.id, duplicate: false };
    },

    async mark(id, values) {
      const { error } = await adminClient
        .from('payment_webhook_events')
        .update({ ...values, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }
  };
}
