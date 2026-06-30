import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationCard from './NotificationCard';

const CATEGORY_ITEMS = [
  { id: 'new_leads', label: 'Novos clientes interessados' },
  { id: 'sales', label: 'Vendas finalizadas' },
  { id: 'low_stock', label: 'Estoque baixo' },
  { id: 'out_of_stock', label: 'Pneus esgotados' },
  { id: 'operation_errors', label: 'Erros importantes' }
];

function NotificationSwitch({ checked, label, onToggle }) {
  return (
    <button
      type="button"
      className={`pf-notification-switch ${checked ? 'is-enabled' : ''}`}
      aria-pressed={checked}
      aria-label={label}
      onClick={onToggle}
    >
      <span />
    </button>
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const {
    centerOpen,
    closeCenter,
    notifications,
    unreadCount,
    historyError,
    popupEnabled,
    categoryPreferences,
    setPopupEnabled,
    setCategoryEnabled,
    markAsRead,
    markAllAsRead,
    loadMore,
    hasMore,
    loadingMore,
    isDesktop
  } = useNotifications();
  const [activeTab, setActiveTab] = useState('notifications');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!centerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeCenter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerOpen, closeCenter]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((item) => !item.readAt);
    }

    return notifications;
  }, [filter, notifications]);

  if (!centerOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="pf-notification-center-backdrop"
        aria-label="Fechar central de notificacoes"
        onClick={closeCenter}
      />
      <aside className={`pf-notification-center ${isDesktop ? 'pf-notification-center--desktop' : 'pf-notification-center--mobile'}`} role="dialog" aria-modal="true" aria-label="Notificacoes">
        <header className="pf-notification-center__header">
          <div>
            <span className="pf-kicker">Central</span>
            <h2>Notificacoes</h2>
          </div>
          <button
            type="button"
            className="pf-notification-center__close"
            aria-label="Fechar central"
            onClick={closeCenter}
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </header>

        <div className="pf-notification-center__tabs" role="tablist" aria-label="Abas da central de notificacoes">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notifications'}
            className={`pf-notification-center__tab ${activeTab === 'notifications' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notificacoes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            className={`pf-notification-center__tab ${activeTab === 'settings' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Configuracoes
          </button>
        </div>

        {activeTab === 'notifications' ? (
          <section className="pf-notification-center__notifications-panel">
            <section className="pf-notification-center__toolbar">
              <div className="pf-notification-center__filters">
                <button
                  type="button"
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilter('all')}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilter('unread')}
                >
                  Nao lidas
                </button>
              </div>
              <button type="button" className="btn btn-outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
                Marcar todas como lidas
              </button>
            </section>

            <div className="pf-notification-center__list-shell">
              <div className="pf-notification-center__list">
                {historyError ? (
                  <div className="pf-notification-center__empty">
                    <Bell size={28} />
                    <strong>Falha ao carregar</strong>
                    <p>{historyError}</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="pf-notification-center__empty">
                    <Bell size={28} />
                    <strong>Nenhuma notificacao</strong>
                    <p>As novidades da sua loja aparecerao aqui.</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      interactive
                      onClick={async () => {
                        await markAsRead(notification.id);
                        if (notification.actionPath) {
                          closeCenter();
                          navigate(notification.actionPath);
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {(hasMore || loadingMore) && (
              <footer className="pf-notification-center__footer">
                <button type="button" className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Carregando...' : 'Carregar mais'}
                  {!loadingMore && <ChevronRight size={14} />}
                </button>
              </footer>
            )}
          </section>
        ) : (
          <div className="pf-notification-center__settings">
            <section className="pf-notification-center__preferences">
              <div className="pf-notification-center__preferences-text">
                <span><SlidersHorizontal size={14} /> Mostrar avisos na tela do computador</span>
                <small>Exibe notificacoes rapidas enquanto voce usa o PneuFlow no computador.</small>
              </div>
              <NotificationSwitch
                checked={popupEnabled}
                label="Mostrar avisos na tela do computador"
                onToggle={() => setPopupEnabled(!popupEnabled)}
              />
            </section>

            <section className="pf-notification-center__category-panel">
              <div className="pf-notification-center__category-header">
                <h3>Quais notificacoes receber</h3>
                <p>Desativar uma categoria impede novas notificacoes, sem apagar o historico antigo.</p>
              </div>
              <div className="pf-notification-center__category-list">
                {CATEGORY_ITEMS.map((item) => (
                  <label key={item.id} className="pf-notification-center__category-item">
                    <div>
                      <strong>{item.label}</strong>
                    </div>
                    <NotificationSwitch
                      checked={categoryPreferences[item.id]}
                      label={item.label}
                      onToggle={() => setCategoryEnabled(item.id, !categoryPreferences[item.id])}
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}
      </aside>
    </>
  );
}
