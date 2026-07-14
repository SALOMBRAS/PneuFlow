export const MANUAL_MONTHLY_PLAN = Object.freeze({
  amountCents: 3900,
  amount: 39,
  currency: 'BRL',
  code: 'pro_manual_monthly',
  provider: 'mercadopago',
  title: 'PneuFlow PRO — acesso mensal manual'
});

export const PAYMENT_FINAL_STATUSES = new Set([
  'approved',
  'rejected',
  'cancelled',
  'expired',
  'refunded',
  'charged_back',
  'error'
]);
