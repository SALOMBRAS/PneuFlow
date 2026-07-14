import { Capacitor } from '@capacitor/core';

const DEFAULT_PUBLIC_WEB_URL = 'https://pneuflow.vercel.app';

const trimTrailingSlashes = (value) => String(value || '').trim().replace(/\/+$/, '');

export const SELLER_ACCESS_HANDSHAKE_KEY = 'pneuflow:seller-access-handshake';

export const isNativeApp = () => Capacitor.isNativePlatform();

export const getPublicWebUrl = (path = '') => {
  const baseUrl = isNativeApp()
    ? trimTrailingSlashes(import.meta.env.VITE_PUBLIC_WEB_URL || DEFAULT_PUBLIC_WEB_URL)
    : trimTrailingSlashes(window.location.origin);
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, '')}` : '';

  return `${baseUrl}${normalizedPath}`;
};

export const getApiUrl = (path) => {
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;

  if (!isNativeApp()) return normalizedPath;

  const baseUrl = trimTrailingSlashes(
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_WEB_URL || DEFAULT_PUBLIC_WEB_URL
  );

  return `${baseUrl}${normalizedPath}`;
};
