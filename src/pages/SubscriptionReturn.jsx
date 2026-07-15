import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/runtime';
import { PAYMENT_STATUS_POLL_DELAYS, hasPaymentPollingTimedOut } from '../lib/paymentPolling';

function statusMessage(status) {
  if (status === 'approved') return { title: 'Pagamento aprovado', message: 'Pagamento aprovado. Estamos liberando seu acesso.', icon: <ShieldCheck size={26} />, color: 'var(--success)' };
  if (['rejected', 'cancelled', 'expired'].includes(status)) return { title: 'Pagamento não aprovado', message: 'O pagamento não foi aprovado. O acesso permanece bloqueado.', icon: <AlertTriangle size={26} />, color: 'var(--error)' };
  return { title: 'Estamos confirmando seu pagamento', message: 'A confirmação acontece de forma segura pelo Mercado Pago. Esta tela não libera o acesso sozinha.', icon: <Clock size={26} />, color: 'var(--primary)' };
}

export default function SubscriptionReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [timedOut, setTimedOut] = useState(false);
  const [retry, setRetry] = useState(0);
  const orderId = useMemo(() => searchParams.get('order') || sessionStorage.getItem('pneuflow:payment-order-id') || '', [searchParams]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const poll = async (attempt = 0) => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token || cancelled) return;

      try {
        const query = orderId ? `?order=${encodeURIComponent(orderId)}` : '';
        const response = await fetch(getApiUrl(`/api/mercadopago/payment-status${query}`), { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Status indisponível');
        const nextStatus = payload.order?.status || 'pending';
        if (cancelled) return;
        setPaymentStatus(nextStatus);
        const periodEnd = payload.subscription?.currentPeriodEnd ? new Date(payload.subscription.currentPeriodEnd) : null;
        if (nextStatus === 'approved' && periodEnd && periodEnd > new Date()) {
          sessionStorage.removeItem('pneuflow:payment-order-id');
          timeoutId = setTimeout(() => navigate('/dashboard', { replace: true }), 900);
          return;
        }
        if (['rejected', 'cancelled', 'expired'].includes(nextStatus)) return;
      } catch {
        // The bounded retry below is intentionally silent; the page remains informational.
      }

      if (hasPaymentPollingTimedOut(attempt + 1)) {
        if (!cancelled) setTimedOut(true);
        return;
      }
      timeoutId = setTimeout(() => poll(attempt + 1), PAYMENT_STATUS_POLL_DELAYS[attempt + 1]);
    };

    poll();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [navigate, orderId, retry]);

  const content = statusMessage(paymentStatus);
  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 10%, rgba(245, 158, 11, 0.16), transparent 34%), var(--bg-dark)', color: 'var(--text-primary)', padding: '32px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section className="card pf-card-premium" style={{ width: '100%', maxWidth: '620px', border: '1px solid rgba(245, 158, 11, 0.22)', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}><div style={{ width: '58px', height: '58px', display: 'grid', placeItems: 'center', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.12)', color: content.color }}>{content.icon}</div></div>
        <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>Retorno do pagamento</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.05 }}>{content.title}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.7, marginBottom: '10px' }}>{content.message}</p>
        {paymentStatus === 'pending' && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>A confirmação ainda está sendo processada pelo Mercado Pago.</p>}
        {timedOut && <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}><button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard', { replace: true })}>Ir para o painel</button><button type="button" className="btn btn-secondary" onClick={() => { setTimedOut(false); setRetry((value) => value + 1); }}>Consultar novamente</button></div>}
      </section>
    </main>
  );
}
