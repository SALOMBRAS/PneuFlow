import { applyCors } from '../../../server/cors.js';

export function readJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return typeof body === 'object' ? body : null;
}

export function beginApiRequest(req, res, { methods, allowUnauthenticated = false } = {}) {
  if (!applyCors(req, res)) return false;

  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }

  if (!allowUnauthenticated && req.method === 'OPTIONS') return false;
  return true;
}

export function getCorrelationId(req) {
  const incoming = String(req.headers?.['x-request-id'] || '').trim();
  return incoming && incoming.length <= 120 ? incoming : crypto.randomUUID();
}

export function logPaymentEvent(level, event, details = {}) {
  const safe = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined && value !== null)
  );
  console[level](`[payments] ${event}`, safe);
}
