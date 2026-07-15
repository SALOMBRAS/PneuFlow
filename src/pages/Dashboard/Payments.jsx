import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { supabase } from '../../lib/supabase';
import { createManualCheckout } from '../../lib/manualCheckout';
import { getApiUrl } from '../../lib/runtime';
import { openExternalUrl } from '../../lib/externalLinks';
import { formatSubscriptionDate } from '../../utils/subscriptionAccess';

const STATUS_LABELS = {
  trialing: 'Teste grátis', active: 'Ativo', expiring: 'Próximo do vencimento', expired: 'Vencido',
  pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', cancelled: 'Cancelado', error: 'Com erro'
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

async function fetchPaymentSummary(accessToken) {
  const response = await fetch(getApiUrl('/api/mercadopago/payment-summary'), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Resumo indisponível.');
  return payload;
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

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Carregando pagamentos...</div>;
  const subscription = summary?.subscription;
  if (!subscription) return <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>Não foi possível carregar o resumo de pagamentos.</div>;

  const status = subscription.displayStatus;
  const lastPayment = summary.lastPayment;
  return (
    <section style={{ width: 'min(1120px, calc(100% - 32px))', margin: '0 auto 32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <p style={{ color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '12px', margin: 0 }}>PneuFlow PRO</p>
          <h1 style={{ margin: '6px 0 8px' }}>Pagamentos</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Plano manual de {formatCurrency(subscription.currentPlanPriceCents, subscription.currentPlanCurrency)} por 30 dias. Não há cobrança automática nem cartão salvo.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refreshSummary} disabled={refreshing}><RefreshCw size={16} /> Atualizar</button>
      </header>

      {error && <div className="card" role="alert" style={{ color: 'var(--error)', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}><AlertTriangle size={18} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        {[
          ['Plano atual', subscription.plan === 'pro' ? 'PneuFlow PRO' : 'Teste grátis', <ShieldCheck size={18} />],
          ['Status', STATUS_LABELS[status] || 'Indisponível', <CheckCircle2 size={18} />],
          ['Vencimento', subscription.dueAt ? formatSubscriptionDate(subscription.dueAt) : 'Sem vencimento informado', <Clock3 size={18} />],
          ['Dias restantes', `${subscription.daysRemaining} dia(s)`, <CreditCard size={18} />]
        ].map(([label, value, icon]) => <article className="card" key={label} style={{ margin: 0 }}><div style={{ color: 'var(--primary)', marginBottom: '10px' }}>{icon}</div><small style={{ color: 'var(--text-secondary)' }}>{label}</small><strong style={{ display: 'block', marginTop: '5px', fontSize: '16px' }}>{value}</strong></article>)}
      </div>

      <div className="card" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div><strong>{paymentActionLabel(status)}</strong><p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>Cada pagamento aprovado adiciona 30 dias. Renovações antecipadas preservam o vencimento atual.</p></div>
        <button type="button" className="btn btn-primary" onClick={handleCheckout} disabled={checkoutLoading} style={{ minHeight: '46px', opacity: checkoutLoading ? 0.7 : 1 }}><CreditCard size={17} /> {checkoutLoading ? 'Criando checkout...' : paymentActionLabel(status)}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
        <article className="card" style={{ margin: 0 }}>
          <h2 style={{ fontSize: '18px', marginTop: 0 }}>Resumo</h2>
          <p>Usando o PneuFlow desde <strong>{formatSubscriptionDate(subscription.storeCreatedAt)}</strong>.</p>
          <p>Meses pagos: <strong>{subscription.approvedPayments}</strong>.</p>
          <p style={{ marginBottom: 0 }}>Último pagamento: <strong>{lastPayment?.approved_at ? formatSubscriptionDate(lastPayment.approved_at) : 'Nenhum pagamento aprovado'}</strong>{lastPayment?.provider ? ` · ${lastPayment.provider}` : ''}.</p>
        </article>
        <article className="card" style={{ margin: 0 }}>
          <h2 style={{ fontSize: '18px', marginTop: 0 }}>Histórico</h2>
          {summary.history?.length ? <div style={{ display: 'grid', gap: '10px' }}>{summary.history.map((payment) => <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}><span><strong>{STATUS_LABELS[payment.status] || payment.status}</strong><small style={{ display: 'block', color: 'var(--text-secondary)' }}>{formatSubscriptionDate(payment.approved_at || payment.created_at)}</small></span><span>{formatCurrency(payment.amount_cents, payment.currency)}</span></div>)}</div> : <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>Ainda não há pagamentos para exibir.</p>}
        </article>
      </div>
    </section>
  );
}
