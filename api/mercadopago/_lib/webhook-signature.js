import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

const MAX_AGE_MS = 5 * 60 * 1000;

function parseSignature(value) {
  return String(value || '').split(',').reduce((result, entry) => {
    const [key, rawValue] = entry.trim().split('=', 2);
    if (key && rawValue) result[key] = rawValue;
    return result;
  }, {});
}

export function validateMercadoPagoWebhookSignature({ headers = {}, body, secret, now = Date.now() }) {
  if (!secret) return { valid: false, reason: 'missing_secret' };

  const signature = parseSignature(headers['x-signature'] || headers['X-Signature']);
  const requestId = String(headers['x-request-id'] || headers['X-Request-Id'] || '').trim();
  const dataId = String(body?.data?.id || '').trim().toLowerCase();
  const timestamp = Number(signature.ts);

  if (!signature.v1 || !requestId || !dataId || !Number.isFinite(timestamp)) {
    return { valid: false, reason: 'missing_signature_parts' };
  }

  const timestampMs = timestamp * 1000;
  if (Math.abs(now - timestampMs) > MAX_AGE_MS) return { valid: false, reason: 'stale_timestamp' };

  const manifest = `id:${dataId};request-id:${requestId};ts:${signature.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const received = Buffer.from(signature.v1, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  return { valid: true, requestId, resourceId: dataId, timestamp: timestampMs };
}

export function hashWebhookPayload(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
}
