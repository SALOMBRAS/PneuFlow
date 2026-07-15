import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  History,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { createManualCheckout } from '../../lib/manualCheckout';
import { getApiUrl } from '../../lib/runtime';
import { openExternalUrl } from '../../lib/externalLinks';
import { formatSubscriptionDate } from '../../utils/subscriptionAccess';
import './Payments.css';

const STATUS_LABELS = {
  trialing: 'Teste grátis',
  active: 'Ativa',
  expiring: 'Próxima do vencimento',
  expired: 'Vencida',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
  created: 'Em processamento',
  error: 'Com erro'
};

function formatCurrency(cents, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format((cents || 0) / 100);
}

function paymentActionLabel(status) {
  if (status === 'trialing') return 'Assinar PneuFlow PRO';
  if (status === 'active') return 'Antecipar renovação';
  if (status === 'expiring') return 'Renovar por mais 30 dias';
  return 'Regularizar acesso';
}

function getStatusTone(status) {
  if (status === 'approved' || status === 'active') return 'success';
  if (status === 'pending' || status === 'created' || status === 'trialing' || status === 'expiring') return 'warning';
  if (status === 'rejected' || status === 'cancelled' || status === 'expired' || status === 'error') return 'danger';
  return 'neutral';
}

function getSubscriptionDuration(dateValue) {
  if (!dateValue || typeof dateValue !== 'string') return 'Não disponível';
  const startDate = new Date(dateValue);
  if (Number.isNaN(startDate.getTime())) return 'Não disponível';

  const months = Math.max(0, (new Date().getFullYear() - startDate.getFullYear()) * 12 + new Date().getMonth() - startDate.getMonth());
  return months === 0 ? 'Menos de 1 mês' : `${months} ${months === 1 ? 'mês' : 'meses'}`;
}

function getPaymentDate(payment) {
  return payment?.approved_at || payment?.created_at || null;
}

function getShortIdentifier(identifier) {
  if (!identifier) return null;
  const value = String(identifier);
  return value.length > 12 ? `#${value.slice(-8)}` : `#${value}`;
}

async function fetchPaymentSummary(accessToken) {
  const response = await fetch(getApiUrl('/api/mercadopago/payment-summary'), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Resumo indisponível.');
  return payload;
}

function PaymentSkeleton() {
  return (
    <section className="payments-page" aria-label="Carregando pagamentos">
      <div className="payments-skeleton payments-skeleton--heading" />
      <div className="payments-workspace">
        <div className="payments-skeleton payments-skeleton--card" />
        <div className="payments-skeleton payments-skeleton--card" />
      </div>
    </section>
  );
}

export default function Payments() {
  const { session } = useStore();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKeyRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!session?.access_token) return undefined;

    fetchPaymentSummary(session.access_token)
      .then((payload) => { if (active) setSummary(payload); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Não foi possível carregar os pagamentos.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [session?.access_token]);

  const refreshSummary = async () => {
    if (!session?.access_token) return;
    setRefreshing(true);
    setError('');
    try {
      setSummary(await fetchPaymentSummary(session.access_token));
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar os pagamentos.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckout = async () => {
    const accessToken = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
    if (!accessToken) {
      setError('Sua sessão expirou. Entre novamente para iniciar o pagamento.');
      return;
    }
    setCheckoutLoading(true);
    setError('');
    idempotencyKeyRef.current ||= crypto.randomUUID();
    try {
      const checkoutUrl = await createManualCheckout({ accessToken, idempotencyKey: idempotencyKeyRef.current });
      const opened = await openExternalUrl(checkoutUrl, 'checkout');
      if (!opened) throw new Error('Não foi possível abrir o checkout. Verifique o bloqueador de pop-ups.');
      idempotencyKeyRef.current = null;
    } catch (checkoutError) {
      setError(checkoutError.message || 'Não foi possível iniciar o checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <PaymentSkeleton />;

  const subscription = summary?.subscription;
  if (!subscription) {
    return (
      <section className="payments-page">
        <div className="payments-unavailable card" role="alert">
          <AlertTriangle size={22} />
          <div>
            <strong>Não foi possível carregar o resumo de pagamentos.</strong>
            <p>Atualize a página para tentar novamente.</p>
          </div>
        </div>
      </section>
    );
  }

  const status = subscription.displayStatus;
  const statusLabel = STATUS_LABELS[status] || 'Não disponível';
  const lastPayment = summary.lastPayment;
  const history = Array.isArray(summary.history) ? summary.history : [];
  const daysRemaining = Number.isFinite(Number(subscription.daysRemaining)) ? Math.max(0, Number(subscription.daysRemaining)) : 0;
  const cycleDays = status === 'trialing' ? 7 : 30;
  const cycleProgress = Math.min(100, Math.round((daysRemaining / cycleDays) * 100));

  return (
    <section className="payments-page">
      <header className="payments-header">
        <div>
          <span className="payments-eyebrow"><Sparkles size={14} /> Centro financeiro</span>
          <h1>Pagamentos</h1>
          <p>Gerencie sua assinatura PneuFlow PRO com renovação manual e total controle sobre cada cobrança.</p>
        </div>
        <button type="button" className="btn btn-secondary payments-refresh" onClick={refreshSummary} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'payments-icon-spinning' : ''} />
          {refreshing ? 'Atualizando...' : 'Atualizar status'}
        </button>
      </header>

      {error && (
        <div className="payments-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="payments-workspace">
        <article className="payments-panel payments-subscription-panel">
          <div className="payments-panel__header">
            <div>
              <span className="payments-panel__kicker">Assinatura</span>
              <h2>Resumo da assinatura</h2>
            </div>
            <span className={`payments-status payments-status--${getStatusTone(status)}`}><CheckCircle2 size={14} /> {statusLabel}</span>
          </div>

          <div className="payments-plan-highlight">
            <div className="payments-plan-highlight__icon"><ShieldCheck size={23} /></div>
            <div>
              <span>Plano atual</span>
              <strong>{subscription.plan === 'pro' ? 'PneuFlow PRO' : 'Teste grátis'}</strong>
            </div>
            <strong className="payments-plan-highlight__price">{formatCurrency(subscription.currentPlanPriceCents, subscription.currentPlanCurrency)}<small>/mês</small></strong>
          </div>

          <div className="payments-cycle">
            <div className="payments-cycle__topline">
              <span>Período atual</span>
              <strong>{daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}</strong>
            </div>
            <div className="payments-cycle__track" aria-label={`${daysRemaining} dias restantes`}><span style={{ width: `${cycleProgress}%` }} /></div>
            <p><CalendarDays size={15} /> Vencimento: <strong>{formatSubscriptionDate(subscription.dueAt)}</strong></p>
          </div>

          <dl className="payments-facts">
            <div><dt>Último pagamento</dt><dd>{lastPayment ? formatSubscriptionDate(getPaymentDate(lastPayment)) : 'Não disponível'}</dd></div>
            <div><dt>Cliente há</dt><dd>{getSubscriptionDuration(subscription.storeCreatedAt)}</dd></div>
            <div><dt>Meses pagos</dt><dd>{subscription.approvedPayments || 0}</dd></div>
            <div><dt>Renovação</dt><dd>Manual</dd></div>
          </dl>

          <div className="payments-manual-note">
            <CircleDollarSign size={18} />
            <p><strong>Sem cobrança automática.</strong> Você escolhe quando renovar; nenhum cartão fica salvo.</p>
          </div>

          <div className="payments-actions">
            <button type="button" className="btn btn-primary payments-checkout" onClick={handleCheckout} disabled={checkoutLoading}>
              <CreditCard size={17} /> {checkoutLoading ? 'Criando checkout...' : paymentActionLabel(status)}
            </button>
            <button type="button" className="payments-text-button" onClick={refreshSummary} disabled={refreshing}>
              <RefreshCw size={15} /> Atualizar informações
            </button>
          </div>
        </article>

        <article className="payments-panel payments-history-panel">
          <div className="payments-panel__header">
            <div>
              <span className="payments-panel__kicker">Visão geral</span>
              <h2>Histórico e detalhes</h2>
            </div>
            <History size={21} className="payments-panel__header-icon" />
          </div>

          <div className="payments-detail-list">
            <div><span>Plano contratado</span><strong>{subscription.plan === 'pro' ? 'PneuFlow PRO' : 'Teste grátis'}</strong></div>
            <div><span>Valor mensal</span><strong>{formatCurrency(subscription.currentPlanPriceCents, subscription.currentPlanCurrency)}</strong></div>
            <div><span>Próximo vencimento</span><strong>{formatSubscriptionDate(subscription.dueAt)}</strong></div>
            <div><span>Forma de renovação</span><strong>Pagamento manual</strong></div>
          </div>

          <div className="payments-history-heading">
            <div><h3>Pagamentos recentes</h3><p>Suas tentativas e pagamentos confirmados.</p></div>
            <span>{history.length}</span>
          </div>

          {history.length ? (
            <div className="payments-history-list">
              {history.map((payment, index) => {
                const paymentStatus = payment?.status || 'created';
                const identifier = getShortIdentifier(payment?.id);
                return (
                  <div className="payments-history-item" key={payment?.id || `${paymentStatus}-${payment?.created_at || 'sem-data'}-${index}`}>
                    <div className={`payments-history-item__marker payments-history-item__marker--${getStatusTone(paymentStatus)}`}><CreditCard size={16} /></div>
                    <div className="payments-history-item__main">
                      <div><strong>{STATUS_LABELS[paymentStatus] || 'Não disponível'}</strong><span className={`payments-status payments-status--${getStatusTone(paymentStatus)}`}>{STATUS_LABELS[paymentStatus] || 'Não disponível'}</span></div>
                      <small>{formatSubscriptionDate(getPaymentDate(payment))} · {payment?.provider || 'Origem não disponível'}{identifier ? ` · ${identifier}` : ''}</small>
                    </div>
                    <strong className="payments-history-item__amount">{formatCurrency(payment?.amount_cents, payment?.currency)}</strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="payments-history-empty">
              <Clock3 size={20} />
              <div><strong>Nenhum pagamento registrado</strong><p>Quando uma renovação for iniciada, ela aparecerá aqui.</p></div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
