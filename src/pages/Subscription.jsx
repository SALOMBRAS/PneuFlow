import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, LogOut, ShieldCheck, Store, Zap } from 'lucide-react';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import { storageService } from '../services/storage';
import { formatSubscriptionDate, getSubscriptionAccess } from '../utils/subscriptionAccess';
import { getApiUrl } from '../lib/runtime';
import { openExternalUrl } from '../lib/externalLinks';

function SubscriptionContent() {
  const navigate = useNavigate();
  const { store, loading, error, session } = useStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handleLogout = async () => {
    await storageService.logout();
    navigate('/login');
  };

  const handleCheckout = async () => {
    if (!store?.id && !store?.slug) {
      setCheckoutError('Nao foi possivel identificar sua loja para iniciar o checkout.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const response = await fetch(getApiUrl('/api/mercadopago/create-preference'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeId: store?.id || '',
          storeSlug: store?.slug || '',
          storeName: store?.nome || store?.name || 'Loja PneuFlow'
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Nao foi possivel iniciar o checkout.');
      }

      const checkoutUrl = payload.sandboxInitPoint || payload.initPoint;

      if (!checkoutUrl) {
        throw new Error('O Mercado Pago nao retornou um link de checkout.');
      }

      await openExternalUrl(checkoutUrl, 'checkout');
      setCheckoutLoading(false);
    } catch (checkoutRequestError) {
      setCheckoutError(checkoutRequestError.message || 'Nao foi possivel iniciar o checkout.');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>
        Carregando assinatura...
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const access = getSubscriptionAccess(store);

  if (access.hasStoreAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 50% 10%, rgba(245, 158, 11, 0.16), transparent 34%), var(--bg-dark)',
        color: 'var(--text-primary)',
        padding: '32px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <section
        className="card pf-card-premium"
        style={{
          width: '100%',
          maxWidth: '720px',
          border: '1px solid rgba(245, 158, 11, 0.22)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36), 0 0 70px rgba(245, 158, 11, 0.08)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--primary)'
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>
              Assinatura PneuFlow
            </p>
            <h1 style={{ margin: '4px 0 0', fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.05 }}>
              Assine o PRO e reative sua loja
            </h1>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: '10px', color: 'var(--error)', marginBottom: '18px' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {checkoutError && (
          <div style={{ display: 'flex', gap: '10px', color: 'var(--error)', marginBottom: '18px' }}>
            <AlertTriangle size={18} />
            <span>{checkoutError}</span>
          </div>
        )}

        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.7, marginBottom: '22px' }}>
          Seu teste gratuito terminou, mas sua loja continua salva. O plano PRO reativa o dashboard, a vitrine comercial,
          os leads no WhatsApp e o controle de vendedores por <strong style={{ color: 'var(--primary)' }}>R$ 39,00/mês</strong>.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}
        >
          <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
            <Store size={18} color="var(--primary)" />
            <p style={{ margin: '10px 0 4px', fontWeight: 800 }}>{store?.nome || store?.name || 'Sua loja'}</p>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loja preservada no sistema</span>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
            <ShieldCheck size={18} color="var(--success)" />
            <p style={{ margin: '10px 0 4px', fontWeight: 800 }}>Reativação segura</p>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Pagamento via Mercado Pago. Trial encerrado em {formatSubscriptionDate(access.trialEndsAt)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="btn btn-primary"
          style={{
            width: '100%',
            minHeight: '52px',
            marginBottom: '12px',
            gap: '10px',
            opacity: checkoutLoading ? 0.72 : 1,
            cursor: checkoutLoading ? 'not-allowed' : 'pointer'
          }}
        >
          <CreditCard size={18} />
          {checkoutLoading ? 'Criando checkout...' : 'Assinar e reativar minha loja'}
        </button>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-secondary">
            Voltar ao site
          </Link>
          <button type="button" onClick={handleLogout} className="btn btn-secondary">
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>
      </section>
    </main>
  );
}

export default function SubscriptionPage() {
  return (
    <StoreProvider>
      <SubscriptionContent />
    </StoreProvider>
  );
}
