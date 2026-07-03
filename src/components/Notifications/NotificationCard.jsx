import { Bell, CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { NOTIFICATION_TYPE_META, formatRelativeNotificationTime } from './notificationUtils';

const ICON_BY_TYPE = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle
};

export default function NotificationCard({
  notification,
  compact = false,
  interactive = false,
  showClose = false,
  onClick,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur
}) {
  const meta = NOTIFICATION_TYPE_META[notification.type] || NOTIFICATION_TYPE_META.info;
  const Icon = ICON_BY_TYPE[notification.type] || Bell;

  return (
    <article
      className={`pf-notification-card ${compact ? 'pf-notification-card--compact' : ''} ${interactive ? 'pf-notification-card--interactive' : ''}`}
      style={{
        '--notification-accent': meta.accent,
        '--notification-accent-soft': meta.accentSoft,
        '--notification-glow': meta.glow,
        '--notification-icon-bg': meta.iconBg
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (!interactive || !onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
    >
      <div className="pf-notification-card__rail" aria-hidden="true" />
      <div className="pf-notification-card__icon" aria-hidden="true">
        <Icon size={compact ? 16 : 18} />
      </div>
      <div className="pf-notification-card__content">
        <div className="pf-notification-card__topline">
          <strong>{notification.title}</strong>
          <span>{formatRelativeNotificationTime(notification.createdAt)}</span>
        </div>
        <p>{notification.message}</p>
      </div>
      {!notification.readAt && <span className="pf-notification-card__unread" aria-label="Nao lida" />}
      {showClose && (
        <button
          type="button"
          className="pf-notification-card__close"
          aria-label="Excluir notificacao"
          title="Excluir notificacao"
          onClick={(event) => {
            event.stopPropagation();
            onClose?.();
          }}
        >
          <X size={16} />
        </button>
      )}
    </article>
  );
}
