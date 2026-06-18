const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const SUBSCRIPTION_STATUSES = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  BLOCKED: 'blocked'
};

export function getSubscriptionAccess(store, now = new Date()) {
  const status = store?.subscription_status || SUBSCRIPTION_STATUSES.TRIALING;
  const trialEndsAt = store?.trial_ends_at ? new Date(store.trial_ends_at) : null;
  const currentPeriodEnd = store?.current_period_end ? new Date(store.current_period_end) : null;
  const nowDate = now instanceof Date ? now : new Date(now);

  const hasValidTrialEnd = trialEndsAt instanceof Date && !Number.isNaN(trialEndsAt.getTime());
  const msRemaining = hasValidTrialEnd ? trialEndsAt.getTime() - nowDate.getTime() : 0;
  const daysRemaining = hasValidTrialEnd ? Math.max(0, Math.ceil(msRemaining / DAY_IN_MS)) : 0;

  const isSubscriptionActive = status === SUBSCRIPTION_STATUSES.ACTIVE;
  const isTrialActive = status === SUBSCRIPTION_STATUSES.TRIALING && hasValidTrialEnd && msRemaining > 0;
  const isTrialExpired = status !== SUBSCRIPTION_STATUSES.ACTIVE && hasValidTrialEnd && msRemaining <= 0;
  const hasPaidAccess = isSubscriptionActive;
  const hasStoreAccess = hasPaidAccess || isTrialActive;

  return {
    status,
    trialEndsAt: hasValidTrialEnd ? trialEndsAt : null,
    currentPeriodEnd,
    msRemaining,
    daysRemaining,
    isTrialActive,
    isTrialExpired,
    isSubscriptionActive,
    hasPaidAccess,
    hasStoreAccess,
    isUrgent: isTrialActive && daysRemaining <= 3,
    isLastDay: isTrialActive && msRemaining > 0 && msRemaining < DAY_IN_MS
  };
}

export function formatSubscriptionDate(date) {
  if (!date) return 'data indisponivel';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function getTrialMessage(access) {
  if (!access?.isTrialActive) return null;

  if (access.isLastDay) {
    return {
      title: 'Seu teste gratuito termina hoje.',
      body: 'Seus dados continuarao salvos, mas o acesso ao painel sera bloqueado apos o vencimento.'
    };
  }

  if (access.daysRemaining === 1) {
    return {
      title: 'Seu teste gratuito termina amanha.',
      body: 'Assine por R$ 39,00/mes para continuar utilizando o PneuFlow.'
    };
  }

  if (access.daysRemaining <= 3) {
    return {
      title: `Seu teste gratuito termina em ${access.daysRemaining} dias.`,
      body: 'Assine o PneuFlow por R$ 39,00/mes para nao perder o acesso.'
    };
  }

  return {
    title: 'Voce esta usando o teste gratuito do PneuFlow.',
    body: `Restam ${access.daysRemaining} dias para aproveitar todos os recursos.`
  };
}
