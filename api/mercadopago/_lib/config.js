/* global process */

const CANONICAL_PRODUCTION_URL = 'https://pneuflow.vercel.app';

function normalizedUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function getConfiguredAppUrl(env) {
  const explicit = normalizedUrl(env.APP_URL);
  if (explicit) return explicit;

  if (env.VERCEL_ENV === 'preview' && env.VERCEL_URL) {
    return normalizedUrl(`https://${String(env.VERCEL_URL).replace(/^https?:\/\//, '')}`);
  }

  return null;
}

export function getPaymentConfig(env = process.env) {
  const enabled = env.PAYMENTS_ENABLED === 'true';
  const mode = env.MERCADO_PAGO_MODE;
  const appUrl = getConfiguredAppUrl(env);
  const isProductionMode = mode === 'production';
  const productionAllowed = env.PAYMENTS_PRODUCTION_ALLOWED === 'true';

  if (!['test', 'production'].includes(mode)) {
    return { enabled: false, reason: 'Pagamento indisponível neste ambiente.' };
  }

  if (!enabled) {
    return { enabled: false, reason: 'Pagamento indisponível neste ambiente.' };
  }

  if (isProductionMode && (!productionAllowed || env.VERCEL_ENV !== 'production')) {
    return { enabled: false, reason: 'Pagamento em produção não está autorizado.' };
  }

  if (isProductionMode && appUrl !== CANONICAL_PRODUCTION_URL) {
    return { enabled: false, reason: 'URL de produção inválida para pagamentos.' };
  }

  if (!appUrl || !['https:', 'http:'].includes(new URL(appUrl).protocol)) {
    return { enabled: false, reason: 'URL de retorno indisponível neste ambiente.' };
  }

  if (!env.MERCADO_PAGO_ACCESS_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_PUBLISHABLE_KEY) {
    return { enabled: false, reason: 'Pagamento indisponível neste ambiente.' };
  }

  return {
    enabled: true,
    mode,
    appUrl,
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
    webhookSecret: env.MERCADO_PAGO_WEBHOOK_SECRET || '',
    supabaseUrl: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ''
  };
}

export function getPaymentSummaryConfig(env = process.env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_PUBLISHABLE_KEY) {
    return { enabled: false, reason: 'Resumo de pagamentos indisponível neste ambiente.' };
  }

  return {
    enabled: true,
    supabaseUrl: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ''
  };
}

export function buildPaymentUrls(appUrl, orderId) {
  const safeOrderId = encodeURIComponent(orderId);
  const returnBase = `${appUrl}/assinatura/retorno?order=${safeOrderId}`;
  return {
    backUrls: {
      success: `${returnBase}&result=success`,
      pending: `${returnBase}&result=pending`,
      failure: `${returnBase}&result=failure`
    },
    notificationUrl: `${appUrl}/api/mercadopago/webhook`
  };
}
