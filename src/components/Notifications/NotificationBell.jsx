import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationBell({ mobileFloating = false }) {
  const { unreadCount, centerOpen, toggleCenter } = useNotifications();
  const badgeLabel = unreadCount > 9 ? '9+' : unreadCount;
  const badgeAriaLabel = unreadCount > 0
    ? `Notificações, ${unreadCount} não lidas`
    : 'Notificações';

  return (
    <button
      type="button"
      className={`pf-notification-bell ${centerOpen ? 'is-active' : ''} ${mobileFloating ? 'pf-notification-bell--mobile-floating' : ''}`}
      onClick={(event) => toggleCenter(event.currentTarget)}
      aria-label={badgeAriaLabel}
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
