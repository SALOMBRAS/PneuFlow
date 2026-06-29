export const NOTIFICATION_TYPE_META = {
  info: {
    label: 'Informacao',
    accent: '#3b82f6',
    accentSoft: 'rgba(59, 130, 246, 0.18)',
    glow: 'rgba(59, 130, 246, 0.32)',
    iconBg: 'rgba(59, 130, 246, 0.12)'
  },
  success: {
    label: 'Sucesso',
    accent: '#22c55e',
    accentSoft: 'rgba(34, 197, 94, 0.18)',
    glow: 'rgba(34, 197, 94, 0.32)',
    iconBg: 'rgba(34, 197, 94, 0.12)'
  },
  warning: {
    label: 'Aviso',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.18)',
    glow: 'rgba(245, 158, 11, 0.32)',
    iconBg: 'rgba(245, 158, 11, 0.12)'
  },
  error: {
    label: 'Erro',
    accent: '#ef4444',
    accentSoft: 'rgba(239, 68, 68, 0.2)',
    glow: 'rgba(239, 68, 68, 0.32)',
    iconBg: 'rgba(239, 68, 68, 0.14)'
  }
};

export const formatRelativeNotificationTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
};
