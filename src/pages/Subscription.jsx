import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, LogOut, ShieldCheck, Store, Zap } from 'lucide-react';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import { supabase } from '../lib/supabase';
import { storageService } from '../services/storage';
import { formatSubscriptionDate, getSubscriptionAccess } from '../utils/subscriptionAccess';
import { getApiUrl } from '../lib/runtime';
import { openExternalUrl } from '../lib/externalLinks';

function SubscriptionContent() {
  const navigate = useNavigate();
  const { store, loading, error, session } = useStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const idempotencyKeyRef = useRef(null);

  const handleLogout = async () => {
    await storageService.logout();
    navigate('/login');
  };

  const getAccessToken = async () => {
    if (session?.access_token) return session.access_token;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const handleCheckout = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setCheckoutError('Sua sessão expirou. Entre novamente para iniciar o pagamento.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError('');
    idempotencyKeyRef.current ||= crypto.randomUUID();

    try {
      const response = await fetch(getApiUrl('/api/mercadopago/create-preference'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKeyRef.current
        },
        // The server derives the owner and store from the JWT. No price, plan or store ID is sent.
        body: JSON.stringify({})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Não foi possível iniciar o checkout.');
      if (payload.mode !== 'test' || !payload.checkoutUrl) {
        throw new Error('O checkout de teste não está disponível neste ambiente.');
      }

      sessionStorage.setItem('pneuflow:payment-order-id', payload.orderId);
      const opened = await openExternalUrl(payload.checkoutUrl, 'checkout');
      if (!opened) throw new Error('Não foi possível abrir o checkout. Verifique o bloqueador de pop-ups.');
      idempotencyKeyRef.current = null;
    } catch (checkoutRequestError) {
      setCheckoutError(checkoutRequestError.message || 'Não foi possível iniciar o checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>Carregando assinatura...</div>;
  }
  if (!session) return <Navigate to="/login" replace />;

  const access = getSubscriptionAccess(store);
  const isRenewal = access.hasPaidAccess;

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 10%, rgba(245, 158, 11, 0.16), transparent 34%), var(--bg-dark)', color: 'var(--text-primary)', padding: '32px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section className="card pf-card-premium" style={{ width: '100%', maxWidth: '720px', border: '1px solid rgba(245, 158, 11, 0.22)', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36), 0 0 70px rgba(245, 158, 11, 0.08)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '42px', height: '42px', display: 'grid', placeItems: 'center', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--primary)' }}><Zap size={22} /></div>
          <div>
            <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>Plano PRO mensal manual</p>
            <h1 style={{ margin: '4px 0 0', fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.05 }}>{isRenewal ? 'Renove sua loja por mais 30 dias' : 'Reative sua loja com o PRO'}</h1>
          </div>
        </div>

        {(error || checkoutError) && <div style={{ display: 'flex', gap: '10px', color: 'var(--error)', marginBottom: '18px' }}><AlertTriangle size={18} /><span>{checkoutError || error}</span></div>}

        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.7, marginBottom: '22px' }}>
          Pague <strong style={{ color: 'var(--primary)' }}>R$ 39,00</strong> para liberar 30 dias do PneuFlow PRO. Não existe renovação automática nem cartão salvo: no próximo vencimento, faça um novo pagamento manual.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}><Store size={18} color="var(--primary)" /><p style={{ margin: '10px 0 4px', fontWeight: 800 }}>{store?.nome || store?.name || 'Sua loja'}</p><span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Pagamento vinculado à loja e seus vendedores</span></div>
          <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}><ShieldCheck size={18} color="var(--success)" /><p style={{ margin: '10px 0 4px', fontWeight: 800 }}>Confirmação segura</p><span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{access.currentPeriodEnd ? `Acesso atual até ${formatSubscriptionDate(access.currentPeriodEnd)}` : 'O acesso só é liberado após a confirmação do pagamento.'}</span></div>
        </div>

        <button type="button" onClick={handleCheckout} disabled={checkoutLoading} className="btn btn-primary" style={{ width: '100%', minHeight: '52px', marginBottom: '12px', gap: '10px', opacity: checkoutLoading ? 0.72 : 1, cursor: checkoutLoading ? 'not-allowed' : 'pointer' }}>
          <CreditCard size={18} />{checkoutLoading ? 'Criando checkout de teste...' : 'Pagar R$ 39,00'}
        </button>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={isRenewal ? '/dashboard' : '/'} className="btn btn-secondary">{isRenewal ? 'Voltar ao painel' : 'Voltar ao site'}</Link>
          <button type="button" onClick={handleLogout} className="btn btn-secondary"><LogOut size={16} />Sair da conta</button>
        </div>
      </section>
    </main>
  );
}

export default function SubscriptionPage() {
  return <StoreProvider><SubscriptionContent /></StoreProvider>;
}
