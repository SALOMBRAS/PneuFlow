import fs from 'node:fs';
import path from 'node:path';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const MONTHLY_PLAN_PRICE = 39;
const PLAN_NAME = 'Assinatura PneuFlow - Plano PRO';
const LOCAL_ENV_KEYS = new Set(['MERCADO_PAGO_ACCESS_TOKEN', 'APP_URL']);
const EXPECTED_SELLER_TEST_USER = 'TESTUSER1128828319103991222';
const EXPECTED_SELLER_USER_ID = '3484025164';
const EXPECTED_BUYER_TEST_USER = 'TESTUSER7217731358368666817';
const EXPECTED_BUYER_USER_ID = '3484025166';
const FIELD_LIMITS = {
  storeId: 120,
  storeSlug: 120,
  storeName: 140
};
let localEnvLoaded = false;
let tokenOwnerCheckPromise = null;

function loadLocalEnvFallback() {
  if (localEnvLoaded || process.env.VERCEL_ENV === 'production') return;

  localEnvLoaded = true;
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, 'utf8');

  for (const line of envContent.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || !LOCAL_ENV_KEYS.has(match[1]) || process.env[match[1]]) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeAppUrl(appUrl) {
  return String(appUrl || '').trim().replace(/\/+$/, '');
}

function isPublicHttpsAppUrl(appUrl) {
  if (!appUrl) return false;

  try {
    const url = new URL(appUrl);
    const localHosts = new Set(['localhost', '127.0.0.1']);

    return url.protocol === 'https:' && !localHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function isLocalAppUrl(appUrl) {
  if (!appUrl) return false;

  try {
    const url = new URL(appUrl);

    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function shouldExposeLocalDebug(appUrl) {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') return false;
  return process.env.VERCEL_ENV === 'development' || isLocalAppUrl(appUrl) || process.env.NODE_ENV !== 'production';
}

function normalizeTextField(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isSafeExternalReference(value) {
  return /^[a-zA-Z0-9._:-]{1,120}$/.test(value);
}

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return undefined;

  const [name, domain] = email.split('@');
  const prefix = name.slice(0, 2) || '*';

  return `${prefix}***@${domain}`;
}

function safeErrorCause(cause) {
  if (!cause) return undefined;
  if (typeof cause === 'string') return cause;

  const safeKeys = [
    'message',
    'name',
    'status',
    'code',
    'error',
    'actualUserId',
    'actualNickname',
    'expectedSellerUserId',
    'expectedSellerTestUser'
  ];

  return safeKeys.reduce((safeCause, key) => {
    if (cause[key] !== undefined) {
      safeCause[key] = cause[key];
    }

    return safeCause;
  }, {});
}

function getLocalDebugError(error, accessToken) {
  return {
    message: error?.message || 'Erro desconhecido ao criar preferencia.',
    name: error?.name,
    status: error?.status,
    cause: safeErrorCause(error?.cause),
    hasAccessToken: Boolean(accessToken)
  };
}

async function checkMercadoPagoTokenOwner(accessToken, appUrl) {
  if (!shouldExposeLocalDebug(appUrl) || !accessToken) return null;

  if (!tokenOwnerCheckPromise) {
    tokenOwnerCheckPromise = fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error('[MP users/me error]', {
            status: response.status,
            message: data?.message,
            error: data?.error
          });

          return null;
        }

        const tokenOwner = {
          id: data?.id,
          nickname: data?.nickname,
          email: maskEmail(data?.email),
          site_id: data?.site_id,
          matchesExpectedSellerTestUser:
            String(data?.id) === EXPECTED_SELLER_USER_ID || data?.nickname === EXPECTED_SELLER_TEST_USER
        };

        console.log('[MP users/me]', tokenOwner);

        return tokenOwner;
      })
      .catch((error) => {
        console.error('[MP users/me error]', {
          message: error?.message,
          name: error?.name,
          status: error?.status,
          cause: safeErrorCause(error?.cause)
        });

        return null;
      });
  }

  return tokenOwnerCheckPromise;
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return typeof body === 'object' ? body : {};
}

export default async function handler(req, res) {
  loadLocalEnvFallback();
  const appUrl = normalizeAppUrl(process.env.APP_URL);

  if (shouldExposeLocalDebug(appUrl)) {
    console.log('[MP create-preference]', {
      method: req.method,
      hasAccessToken: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
      hasAppUrl: Boolean(appUrl),
      appUrl
    });
    console.log('[MP sandbox config]', {
      hasAccessToken: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
      appUrl,
      expectedSellerTestUser: EXPECTED_SELLER_TEST_USER,
      expectedSellerUserId: EXPECTED_SELLER_USER_ID,
      expectedBuyerTestUser: EXPECTED_BUYER_TEST_USER,
      expectedBuyerUserId: EXPECTED_BUYER_USER_ID
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    const payload = { error: 'Checkout indisponivel no momento.' };

    if (shouldExposeLocalDebug(appUrl)) {
      payload.debug = {
        message: 'MERCADO_PAGO_ACCESS_TOKEN ausente no ambiente da funcao.',
        hasAccessToken: false
      };
    }

    return res.status(500).json(payload);
  }

  const body = parseBody(req.body);

  if (!body) {
    return res.status(400).json({ error: 'Corpo da requisicao invalido.' });
  }

  const normalizedStoreId = normalizeTextField(body.storeId, FIELD_LIMITS.storeId);
  const normalizedStoreSlug = normalizeTextField(body.storeSlug, FIELD_LIMITS.storeSlug);
  const normalizedStoreName = normalizeTextField(body.storeName || 'Loja PneuFlow', FIELD_LIMITS.storeName);
  const externalReference = normalizedStoreId || normalizedStoreSlug;

  if (!externalReference) {
    return res.status(400).json({ error: 'Loja invalida para criar checkout.' });
  }

  if (!isSafeExternalReference(externalReference)) {
    return res.status(400).json({ error: 'Identificador da loja invalido para criar checkout.' });
  }

  try {
    const tokenOwner = await checkMercadoPagoTokenOwner(accessToken, appUrl);

    if (tokenOwner && !tokenOwner.matchesExpectedSellerTestUser) {
      const error = new Error('MERCADO_PAGO_ACCESS_TOKEN nao pertence ao Seller Test User esperado.');

      error.status = 400;
      error.cause = {
        actualUserId: tokenOwner.id,
        actualNickname: tokenOwner.nickname,
        expectedSellerUserId: EXPECTED_SELLER_USER_ID,
        expectedSellerTestUser: EXPECTED_SELLER_TEST_USER
      };

      throw error;
    }

    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 }
    });
    const preference = new Preference(client);
    const preferenceBody = {
      items: [
        {
          title: PLAN_NAME,
          description: normalizedStoreName,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: MONTHLY_PLAN_PRICE
        }
      ],
      external_reference: externalReference,
      metadata: {
        store_id: normalizedStoreId || null,
        store_slug: normalizedStoreSlug || null,
        store_name: normalizedStoreName || null,
        plan: 'pro',
        source: 'pneuflow'
      }
    };

    if (isPublicHttpsAppUrl(appUrl)) {
      preferenceBody.back_urls = {
        success: `${appUrl}/assinatura/retorno?status=success`,
        failure: `${appUrl}/assinatura/retorno?status=failure`,
        pending: `${appUrl}/assinatura/retorno?status=pending`
      };
      preferenceBody.auto_return = 'approved';
    }

    const result = await preference.create({
      body: preferenceBody
    });

    return res.status(200).json({
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point
    });
  } catch (error) {
    console.error('[MP create-preference error]', {
      message: error?.message,
      name: error?.name,
      status: error?.status,
      cause: safeErrorCause(error?.cause)
    });

    const payload = { error: 'Nao foi possivel iniciar o checkout.' };

    if (shouldExposeLocalDebug(appUrl)) {
      payload.debug = getLocalDebugError(error, accessToken);
    }

    return res.status(500).json(payload);
  }
}
