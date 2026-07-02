const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const WEEKDAY_LABELS = {
  sunday: 'Domingo',
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado'
};

const DEFAULT_BUSINESS_HOURS = {
  monday: { enabled: true, open: '08:00', close: '18:00' },
  tuesday: { enabled: true, open: '08:00', close: '18:00' },
  wednesday: { enabled: true, open: '08:00', close: '18:00' },
  thursday: { enabled: true, open: '08:00', close: '18:00' },
  friday: { enabled: true, open: '08:00', close: '18:00' },
  saturday: { enabled: false, open: '08:00', close: '13:00' },
  sunday: { enabled: false, open: '08:00', close: '18:00' }
};

const toMinutes = (value) => {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
};

export const normalizeBusinessHours = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_BUSINESS_HOURS;

  return WEEKDAY_KEYS.reduce((acc, key) => {
    const current = value[key] || {};
    acc[key] = {
      enabled: Boolean(current.enabled),
      open: typeof current.open === 'string' ? current.open : DEFAULT_BUSINESS_HOURS[key]?.open || '08:00',
      close: typeof current.close === 'string' ? current.close : DEFAULT_BUSINESS_HOURS[key]?.close || '18:00'
    };
    return acc;
  }, {});
};

export const getStoreBusinessHours = (store) => normalizeBusinessHours(store?.business_hours);

export const getStoreStatus = (store, now = new Date()) => {
  const businessHours = getStoreBusinessHours(store);
  const dayKey = WEEKDAY_KEYS[now.getDay()];
  const current = businessHours[dayKey];

  if (!current?.enabled) {
    return { open: false, label: 'FECHADO AGORA', tone: 'muted' };
  }

  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  const openMinutes = toMinutes(current.open);
  const closeMinutes = toMinutes(current.close);

  if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
    return { open: false, label: 'FECHADO AGORA', tone: 'muted' };
  }

  const open = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  return {
    open,
    label: open ? 'ABERTO AGORA' : 'FECHADO AGORA',
    tone: open ? 'success' : 'muted'
  };
};

export const formatBusinessHourLabel = (hours, fallback = 'Atendimento comercial') => {
  if (!hours || typeof hours !== 'object') return fallback;
  const activeDays = WEEKDAY_KEYS.filter((key) => key !== 'sunday' && hours[key]?.enabled);
  if (!activeDays.length) return fallback;

  const first = hours[activeDays[0]];
  const last = hours[activeDays[activeDays.length - 1]];
  if (!first?.open || !last?.close) return fallback;

  return `${WEEKDAY_LABELS[activeDays[0]]} a ${WEEKDAY_LABELS[activeDays[activeDays.length - 1]]}: ${first.open} às ${last.close}`;
};
