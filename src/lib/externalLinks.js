import { Browser } from '@capacitor/browser';
import { isNativeApp } from './runtime';

const hostMatches = (hostname, allowedDomain) =>
  hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`);

const allowedDomainsByPurpose = {
  checkout: ['mercadopago.com', 'mercadopago.com.br'],
  whatsapp: ['wa.me', 'whatsapp.com']
};

const validateExternalUrl = (rawUrl, purpose) => {
  const url = new URL(rawUrl);
  const allowedDomains = allowedDomainsByPurpose[purpose];

  if (url.protocol !== 'https:' || url.username || url.password || !allowedDomains) {
    throw new Error('Link externo bloqueado por seguranca.');
  }

  if (!allowedDomains.some((domain) => hostMatches(url.hostname, domain))) {
    throw new Error('Destino externo nao autorizado.');
  }

  return url.toString();
};

export const openExternalUrl = async (rawUrl, purpose) => {
  const safeUrl = validateExternalUrl(rawUrl, purpose);

  try {
    if (isNativeApp()) {
      await Browser.open({ url: safeUrl });
      return true;
    }

    const openedWindow = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    return Boolean(openedWindow);
  } catch (error) {
    console.error('[external-link] Nao foi possivel abrir o destino.', {
      purpose,
      message: error?.message
    });
    throw error;
  }
};
