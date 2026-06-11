import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
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
  Users
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { store, role, loading, error, session, member } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
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

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart2 size={18} />, roles: ['owner', 'seller'] },
    { name: 'Catálogo de Pneus', path: '/dashboard/catalog', icon: <Layers size={18} />, roles: ['owner', 'seller'] },
    { name: 'Leads de WhatsApp', path: '/dashboard/leads', icon: <MessageSquare size={18} />, roles: ['owner', 'seller'] },
    { name: 'Vendedores', path: '/dashboard/sellers', icon: <Users size={18} />, roles: ['owner'] },
    { name: 'Configurações da Vitrine', path: '/dashboard/settings', icon: <Settings size={18} />, roles: ['owner'] },
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

  const baseUrl = `${window.location.origin}/store/${store.slug}`;
  const publicStoreUrl = role === 'seller' && member?.ref_code ? `${baseUrl}?ref=${member.ref_code}` : baseUrl;

  if (role === 'seller' && !member?.ref_code && !loading) {
    console.warn('Vendedor não possui código de indicação (ref_code).');
  }

  return (
    <div className="dashboard-layout" style={{ backgroundColor: 'var(--bg-dark)', overflowX: 'hidden', position: 'relative' }}>
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
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px',
          zIndex: 40
        }}
      >
        <div>
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

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href={publicStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
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
            <span>Ver Minha Vitrine</span>
            <ExternalLink size={14} />
          </a>

          <button
            onClick={handleLogout}
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
      </aside>

      <main className="dashboard-main" style={{ minHeight: '100vh', paddingTop: '40px', minWidth: 0 }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-header {
            display: flex !important;
          }

          .dashboard-layout {
            grid-template-columns: 1fr !important;
            padding-top: 60px;
          }

          .dashboard-sidebar {
            position: fixed !important;
            top: 60px !important;
            left: 0 !important;
            bottom: 0 !important;
            width: min(88vw, 320px) !important;
            height: calc(100vh - 60px) !important;
            transform: translateX(-100%);
            transition: transform var(--transition-normal);
            display: flex !important;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
            overflow-y: auto;
          }

          .dashboard-sidebar.mobile-open {
            transform: translateX(0);
          }
        }

        @media (max-width: 480px) {
          .dashboard-sidebar {
            width: min(92vw, 300px) !important;
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
