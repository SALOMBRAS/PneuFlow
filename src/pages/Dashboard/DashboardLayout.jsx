import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { NotificationBell } from '../../components/Notifications';
import {
  BarChart2,
  Layers,
  Settings,
  MessageSquare,
  ExternalLink,
  LogOut,
  Zap,
  Menu,
  X,
  Users,
  CreditCard
} from 'lucide-react';
import { getSubscriptionAccess } from '../../utils/subscriptionAccess';
import { getPublicWebUrl, isNativeApp } from '../../lib/runtime';

export default function DashboardLayout({ children, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { store, role, loading, error, session, member } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    storageService.logout();
    navigate('/login');
  };

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : originalOverflow || '';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', backgroundColor: 'var(--bg-dark)' }}>
        Carregando painel...
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (error || !store) {
    return (
      <div
        className="flex-center"
        style={{
          height: '100vh',
          backgroundColor: 'var(--bg-dark)',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px',
          textAlign: 'center',
          overflowX: 'hidden'
        }}
      >
        <Zap size={48} color="var(--primary)" />
        <h2 style={{ color: 'var(--text-primary)', maxWidth: '100%', wordBreak: 'break-word' }}>
          {error || 'Loja não encontrada'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', width: '100%', wordBreak: 'break-word' }}>
          Não conseguimos localizar as configurações da sua loja ou suas permissões de acesso.
          {error?.includes('inativa') ? ' Entre em contato com o administrador da loja.' : ' Se você acabou de se cadastrar, verifique seu e-mail.'}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '420px',
            justifyContent: 'center'
          }}
        >
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            Voltar ao Início
          </button>
          <button onClick={handleLogout} className="btn btn-primary">
            Sair e Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const subscriptionAccess = getSubscriptionAccess(store);

  if (!subscriptionAccess.hasStoreAccess) {
    return <Navigate to="/assinatura" replace state={{ from: location.pathname }} />;
  }

  const menuItems = [
    { name: 'Dashboard', tooltip: 'Visão geral da loja', path: '/dashboard', icon: <BarChart2 size={18} />, roles: ['owner', 'seller'] },
    { name: 'Pneus', tooltip: 'Pneus, anúncios e controle de estoque', path: '/dashboard/catalog', icon: <Layers size={18} />, roles: ['owner', 'seller'] },
    { name: 'Leads', tooltip: 'Clientes interessados e vendas no WhatsApp', path: '/dashboard/leads', icon: <MessageSquare size={18} />, roles: ['owner', 'seller'] },
    { name: 'Vendedores', tooltip: 'Equipe de vendas', path: '/dashboard/sellers', icon: <Users size={18} />, roles: ['owner'] },
    { name: 'Config. Vitrine', tooltip: 'Configurar a vitrine da loja', path: '/dashboard/settings', icon: <Settings size={18} />, roles: ['owner'] },
    { name: 'Pagamentos', tooltip: 'Plano, vencimento e histórico de pagamentos', path: '/dashboard/payments', icon: <CreditCard size={18} />, roles: ['owner'] },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(role));

  const currentPath = location.pathname;
  const currentMenuItem = menuItems.find((item) => item.path === currentPath);
  if (currentMenuItem && !currentMenuItem.roles.includes(role)) {
    return (
      <div
        className="flex-center"
        style={{
          height: '100vh',
          backgroundColor: 'var(--bg-dark)',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px',
          textAlign: 'center',
          overflowX: 'hidden'
        }}
      >
        <h2 style={{ color: 'var(--text-primary)', maxWidth: '100%', wordBreak: 'break-word' }}>Acesso Restrito</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', width: '100%', wordBreak: 'break-word' }}>
          Você não tem permissão para acessar esta página.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const baseUrl = getPublicWebUrl(`store/${store.slug}`);
  const publicStoreUrl = role === 'seller' && member?.ref_code ? `${baseUrl}?ref=${member.ref_code}` : baseUrl;
  if (role === 'seller' && !member?.ref_code && !loading) {
    console.warn('Vendedor não possui código de indicação (ref_code).');
  }

  return (
    <div
      className="dashboard-layout"
      style={{
        backgroundColor: 'var(--bg-dark)',
        display: 'flex',
        minHeight: '100dvh',
        overflowX: 'hidden',
        position: 'relative',
        width: '100%'
      }}
    >
      <div
        style={{
          display: 'none',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: '#0d0f15',
          borderBottom: '1px solid var(--border)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: '60px'
        }}
        className="mobile-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <Zap size={16} fill="var(--primary)" style={{ color: 'var(--primary)' }} />
          <span
            style={{
              fontWeight: 'bold',
              fontFamily: 'var(--font-title)',
              fontSize: '16px',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {store.name}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen((value) => !value)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            minWidth: '44px',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            flexShrink: 0
          }}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 35,
            border: 'none',
            background: 'rgba(4, 6, 10, 0.54)',
            backdropFilter: 'blur(6px)',
            padding: 0,
            margin: 0,
            cursor: 'default'
          }}
        />
      )}

      <aside
        className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          backgroundColor: '#0d0f15',
          borderRight: '1px solid var(--border)',
          width: '240px',
          height: '100dvh',
          maxHeight: '100dvh',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          alignSelf: 'flex-start',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          padding: 0,
          zIndex: 40
        }}
      >
        <div
          className="sidebar-inner"
          style={{
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            padding: '24px 24px calc(24px + env(safe-area-inset-bottom))',
            overflow: 'hidden'
          }}
        >
        <div className="sidebar-top" style={{ flexShrink: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px', minWidth: 0 }}>
            <div
              style={{
                backgroundColor: 'var(--primary)',
                color: '#000',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontFamily: 'var(--font-title)',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Zap size={16} fill="black" /> PneuFlow
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
              minWidth: 0
            }}
          >
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Loja logada
            </p>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0
              }}
            >
              {store.name}
            </p>
          </div>
        </div>

          <nav
            className="sidebar-nav"
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              gap: '8px',
              minHeight: 0,
              minWidth: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '2px'
            }}
          >
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  title={item.tooltip}
                  aria-label={item.tooltip}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    color: isActive ? '#000' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all var(--transition-fast)',
                    minWidth: 0,
                    minHeight: '48px'
                  }}
                >
                  {item.icon}
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

        <div
          className="sidebar-footer"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flexShrink: 0,
            paddingTop: '18px'
          }}
        >
          <a
            href={publicStoreUrl}
            target={isNativeApp() ? undefined : '_blank'}
            rel="noopener noreferrer"
            onClick={(event) => {
              if (!isNativeApp()) return;
              event.preventDefault();
              navigate(`/store/${store.slug}${role === 'seller' && member?.ref_code ? `?ref=${member.ref_code}` : ''}`);
            }}
            title="Abrir a vitrine pública da loja"
            aria-label="Abrir a vitrine pública da loja"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'rgba(255,255,255,0.03)',
              color: 'var(--text-primary)',
              minHeight: '44px'
            }}
          >
            <span>Ver Vitrine</span>
            <ExternalLink size={14} />
          </a>

          <button
            onClick={handleLogout}
            title="Sair do painel"
            aria-label="Sair do painel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--error)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              textAlign: 'left',
              minHeight: '48px'
            }}
          >
            <LogOut size={18} />
            <span>Sair do Painel</span>
          </button>
        </div>
        </div>
      </aside>

      <main
        className="dashboard-main"
        style={{
          flex: 1,
          marginLeft: '240px',
          minHeight: '100dvh',
          minWidth: 0,
          overflowX: 'hidden',
          paddingTop: '40px',
          width: 'calc(100% - 240px)'
        }}
      >
        <div
          style={{
            width: '100%',
            margin: '0 0 18px',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          className="dashboard-topbar"
        >
          <NotificationBell />
        </div>
        <div className="dashboard-mobile-bell">
          <NotificationBell mobileFloating />
        </div>
        {children}
      </main>

      <style>{`
        @media (min-width: 769px) {
          .dashboard-layout {
            display: flex !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            overflow-x: hidden !important;
          }

          .dashboard-sidebar {
            position: fixed !important;
            inset: 0 auto 0 0 !important;
            width: 240px !important;
            height: 100vh !important;
            height: 100dvh !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            max-height: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .dashboard-sidebar .sidebar-inner {
            height: 100vh !important;
            height: 100dvh !important;
            min-height: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .dashboard-sidebar .sidebar-nav {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }

          .dashboard-sidebar .sidebar-footer {
            flex-shrink: 0 !important;
          }

          .dashboard-main {
            flex: 1 1 auto !important;
            margin-left: 240px !important;
            min-width: 0 !important;
            width: calc(100% - 240px) !important;
          }

          .dashboard-topbar {
            width: 100% !important;
          }
        }

        @media (max-width: 768px) {
          .mobile-header {
            display: flex !important;
          }

          .dashboard-layout {
            display: block !important;
            grid-template-columns: 1fr !important;
            padding-top: 60px;
          }

          .dashboard-main {
            margin-left: 0 !important;
            width: 100% !important;
          }

          .dashboard-sidebar {
            position: fixed !important;
            top: 60px !important;
            left: 0 !important;
            bottom: 0 !important;
            width: min(88vw, 320px) !important;
            height: calc(100dvh - 60px) !important;
            max-height: calc(100dvh - 60px) !important;
            padding-bottom: calc(28px + env(safe-area-inset-bottom)) !important;
            transform: translateX(-100%);
            transition: transform var(--transition-normal);
            display: flex !important;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
            overflow: hidden;
          }

          .dashboard-sidebar .sidebar-inner {
            height: 100%;
            padding: 24px 24px calc(24px + env(safe-area-inset-bottom)) !important;
          }

          .dashboard-sidebar.mobile-open {
            transform: translateX(0);
          }
        }

        @media (max-width: 480px) {
          .dashboard-sidebar {
            width: min(92vw, 300px) !important;
          }

          .dashboard-sidebar .sidebar-inner {
            padding: 20px 16px calc(24px + env(safe-area-inset-bottom)) !important;
          }
        }

        @media (max-width: 640px) {
          .dashboard-topbar {
            display: none !important;
          }

          .dashboard-mobile-bell {
            position: fixed;
            right: 16px;
            bottom: calc(16px + env(safe-area-inset-bottom));
            z-index: 45;
          }

          .dashboard-main > section[role="status"] {
            width: calc(100% - 24px) !important;
            padding: 14px !important;
            align-items: stretch !important;
          }

          .dashboard-main > section[role="status"] .btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (min-width: 641px) {
          .dashboard-mobile-bell {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
