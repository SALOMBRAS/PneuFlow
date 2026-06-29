import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationBell({ mobileFloating = false }) {
  const { unreadCount, centerOpen, toggleCenter } = useNotifications();
  const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <button
      type="button"
      className={`pf-notification-bell ${centerOpen ? 'is-active' : ''} ${mobileFloating ? 'pf-notification-bell--mobile-floating' : ''}`}
      onClick={(event) => toggleCenter(event.currentTarget)}
      aria-label={unreadCount > 0 ? `Notificacoes, ${badgeLabel} nao lidas` : 'Notificacoes'}
      aria-haspopup="dialog"
      aria-expanded={centerOpen}
    >
      <Bell size={mobileFloating ? 22 : 20} />
      {unreadCount > 0 && (
        <span className="pf-notification-bell__badge" aria-hidden="true">
          {badgeLabel}
        </span>
      )}
    </button>
  );
}
