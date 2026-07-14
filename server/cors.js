/* global process */

const CANONICAL_WEB_ORIGIN = 'https://pneuflow.vercel.app';
const CAPACITOR_ANDROID_ORIGIN = 'https://localhost';
const LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);

const getConfiguredOrigins = () => {
  const origins = new Set([CANONICAL_WEB_ORIGIN, CAPACITOR_ANDROID_ORIGIN, ...LOCAL_ORIGINS]);
  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  const extraOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '').split(',');

  if (vercelUrl) origins.add(`https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`);
  extraOrigins.map((origin) => origin.trim()).filter(Boolean).forEach((origin) => origins.add(origin));

  return origins;
};

export const isAllowedOrigin = (origin) => !origin || getConfiguredOrigins().has(origin);

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origem nao autorizada pelo CORS.'));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 86400
};

export const rejectDisallowedOrigins = (req, res, next) => {
  if (!isAllowedOrigin(req.headers?.origin)) {
    res.status(403).json({ error: 'Origem nao autorizada.' });
    return;
  }

  next();
};

export const applyCors = (req, res) => {
  const origin = req.headers?.origin;

  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: 'Origem nao autorizada.' });
    return false;
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Max-Age', String(corsOptions.maxAge));

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  return true;
};
