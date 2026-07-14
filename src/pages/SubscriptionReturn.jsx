import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/runtime';
import { PAYMENT_STATUS_POLL_DELAYS, hasPaymentPollingTimedOut } from '../lib/paymentPolling';

function statusMessage(status) {
  if (status === 'approved') return { title: 'Pagamento confirmado', message: 'Seu pagamento foi confirmado pelo Mercado Pago. Abrindo o painel...', icon: <ShieldCheck size={26} />, color: 'var(--success)' };
  if (['rejected', 'cancelled', 'expired'].includes(status)) return { title: 'Pagamento não aprovado', message: 'Nenhuma alteração foi feita na sua assinatura. Você pode tentar novamente.', icon: <AlertTriangle size={26} />, color: 'var(--error)' };
  return { title: 'Estamos confirmando seu pagamento', message: 'A confirmação acontece de forma segura pelo Mercado Pago. Esta tela não libera o acesso sozinha.', icon: <Clock size={26} />, color: 'var(--primary)' };
}

export default function SubscriptionReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [timedOut, setTimedOut] = useState(false);
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
        if (nextStatus === 'approved') {
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
  }, [navigate, orderId]);

  const content = statusMessage(paymentStatus);
  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 10%, rgba(245, 158, 11, 0.16), transparent 34%), var(--bg-dark)', color: 'var(--text-primary)', padding: '32px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section className="card pf-card-premium" style={{ width: '100%', maxWidth: '620px', border: '1px solid rgba(245, 158, 11, 0.22)', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}><div style={{ width: '58px', height: '58px', display: 'grid', placeItems: 'center', borderRadius: '18px', background: 'rgba(245, 158, 11, 0.12)', color: content.color }}>{content.icon}</div></div>
        <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>Retorno do pagamento</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.05 }}>{content.title}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.7, marginBottom: '10px' }}>{content.message}</p>
        {timedOut && <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>A confirmação pode levar alguns minutos. Atualize esta página mais tarde ou volte ao painel.</p>}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}><Link to="/assinatura" className="btn btn-primary"><Zap size={16} />Voltar para assinatura</Link><Link to="/" className="btn btn-secondary">Voltar ao site</Link></div>
      </section>
    </main>
  );
}
