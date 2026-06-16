const VISITOR_ID_KEY = 'pneuflow_visitor_id';

const generateVisitorId = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const getOrCreateVisitorId = () => {
  if (typeof window === 'undefined') {
    return generateVisitorId();
  }

  try {
    const existingVisitorId = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existingVisitorId) return existingVisitorId;

    const visitorId = generateVisitorId();
    window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
    return visitorId;
  } catch {
    return generateVisitorId();
  }
};

export const VISITOR_ID_STORAGE_KEY = VISITOR_ID_KEY;
