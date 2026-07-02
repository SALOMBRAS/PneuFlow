import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DoorOpen, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { StoreProvider, useStore } from '../../contexts/StoreContext';
import { createImpersonatedSupabase, IMPERSONATED_AUDIT_STORAGE_KEY } from '../../lib/impersonatedSupabase';
import { resetStorageServiceClient, setStorageServiceClient, storageService } from '../../services/storage';
import DashboardLayout from '../Dashboard/DashboardLayout';

const impersonatedSupabase = createImpersonatedSupabase();

const readHandshake = () => {
  try {
    const rawValue = window.name;
    window.name = '';

    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    return parsed?.type === 'pneuflow:seller-access' ? parsed : null;
  } catch {
    window.name = '';
    return null;
  }
};

function ImpersonatedBanner({ onEndSession, endingSession }) {
  const { member, user } = useStore();
  const sellerName = member?.nome || user?.user_metadata?.full_name || user?.email || 'vendedor';

  return (
    <section
      role="status"
      aria-live="polite"
      style={{
        margin: '0 auto 18px',
        width: 'min(1120px, calc(100% - 32px))',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '18px',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(15, 18, 27, 0.96))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minWidth: 0, flex: '1 1 320px' }}>
        <div
          aria-hidden="true"
          style={{
            width: '40px',
            height: '40px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '14px',
            background: 'rgba(245, 158, 11, 0.16)',
            color: 'var(--primary)',
            flex: '0 0 auto'
          }}
        >
          <DoorOpen size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
            Sessao temporaria: acessando como {sellerName}
          </h2>
          <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
            Esta guia usa uma sessao isolada e pode ser encerrada sem afetar a sessao principal do dono.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-outline"
        onClick={onEndSession}
        disabled={endingSession}
        style={{
          minHeight: '44px',
          whiteSpace: 'nowrap',
          color: 'var(--primary)',
          borderColor: 'rgba(245, 158, 11, 0.32)'
        }}
      >
        {endingSession ? 'Encerrando...' : 'Encerrar sessao temporaria'}
      </button>
    </section>
  );
}

function SellerAccessScreen({ icon, title, message, tone = 'default', children }) {
  const color = tone === 'error' ? 'var(--error)' : 'var(--primary)';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="pf-card"
        style={{
          width: 'min(520px, 100%)',
          padding: '28px',
          textAlign: 'center',
          display: 'grid',
          gap: '14px'
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center', color }}>
          {icon}
        </div>
        <h1 style={{ margin: 0, fontSize: '24px' }}>{title}</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        {children}
      </div>
    </div>
  );
}

export default function SellerAccessShell() {
  const [status, setStatus] = useState('booting');
  const [errorMessage, setErrorMessage] = useState('');
  const [endingSession, setEndingSession] = useState(false);

  useEffect(() => {
    setStorageServiceClient(impersonatedSupabase);

    let cancelled = false;

    const initialize = async () => {
      try {
        const { data: { session } } = await impersonatedSupabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          setStatus('ready');
          return;
        }

        const handshake = readHandshake();
        if (!handshake?.hashedToken && (!handshake?.ticket || !handshake?.ownerAccessToken)) {
          setErrorMessage('O acesso temporario expirou ou nao foi iniciado corretamente. Solicite um novo acesso pela lista de vendedores.');
          setStatus('error');
          return;
        }

        setStatus('redeeming');

        let tokenHash = handshake.hashedToken;
        let verificationType = handshake.verificationType || 'magiclink';
        let auditId = handshake.auditId || null;

        if (!tokenHash) {
          const redeemed = await storageService.redeemSellerAccess({
            ownerAccessToken: handshake.ownerAccessToken,
            ticket: handshake.ticket
          });

          if (cancelled) return;

          auditId = redeemed.audit_id || null;
          tokenHash = redeemed.hashed_token;
          verificationType = redeemed.verification_type || 'magiclink';
        }

        if (auditId) {
          window.sessionStorage.setItem(IMPERSONATED_AUDIT_STORAGE_KEY, auditId);
        }

        const { error } = await impersonatedSupabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: verificationType
        });

        if (error) throw error;
        tokenHash = null;
        verificationType = null;
        auditId = null;
        if (cancelled) return;

        setStatus('ready');
      } catch (error) {
        if (cancelled) return;

        setErrorMessage(error?.message || 'Nao foi possivel iniciar a sessao temporaria.');
        setStatus('error');
      }
    };

    initialize();

    return () => {
      cancelled = true;
      resetStorageServiceClient();
    };
  }, []);

  const handleEndSession = async () => {
    if (endingSession) return;

    setEndingSession(true);

    const auditId = window.sessionStorage.getItem(IMPERSONATED_AUDIT_STORAGE_KEY);

    try {
      await storageService.endSellerAccess(auditId || null);
    } catch (error) {
      console.error('Nao foi possivel registrar o encerramento da sessao temporaria:', error);
    } finally {
      window.sessionStorage.removeItem(IMPERSONATED_AUDIT_STORAGE_KEY);

      try {
        await storageService.logout();
      } catch (error) {
        console.error('Nao foi possivel limpar a sessao temporaria:', error);
      }

      setEndingSession(false);
      setStatus('ended');

      window.setTimeout(() => {
        window.close();
      }, 120);
    }
  };

  if (status === 'booting' || status === 'redeeming') {
    return (
      <SellerAccessScreen
        icon={<Loader2 className="animate-spin" size={44} />}
        title="Preparando sessao temporaria"
        message="Estamos validando o ticket e abrindo uma sessao isolada para o vendedor."
      />
    );
  }

  if (status === 'ended') {
    return (
      <SellerAccessScreen
        icon={<XCircle size={44} />}
        title="Sessao temporaria encerrada"
        message="A sessao isolada foi finalizada. Se esta guia nao fechar sozinha, voce pode fecha-la com seguranca."
      />
    );
  }

  if (status === 'error') {
    return (
      <SellerAccessScreen
        icon={<ShieldAlert size={44} />}
        title="Nao foi possivel abrir o acesso"
        message={errorMessage || 'O acesso temporario nao pode ser iniciado.'}
        tone="error"
      >
        <button type="button" className="btn btn-outline" onClick={() => window.close()}>
          Fechar esta guia
        </button>
      </SellerAccessScreen>
    );
  }

  return (
    <StoreProvider supabaseClient={impersonatedSupabase}>
      <NotificationProvider>
        <DashboardLayout onLogout={handleEndSession}>
          <ImpersonatedBanner onEndSession={handleEndSession} endingSession={endingSession} />
          <Outlet />
        </DashboardLayout>
      </NotificationProvider>
    </StoreProvider>
  );
}
