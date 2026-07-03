import { createSupabaseClient } from './supabase';

export const IMPERSONATED_AUTH_STORAGE_KEY = 'pneuflow-impersonated-auth';
export const IMPERSONATED_AUDIT_STORAGE_KEY = 'pneuflow-impersonated-audit-id';

const sessionStorageAdapter = {
  getItem: (key) => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: (key) => window.sessionStorage.removeItem(key)
};

export const createImpersonatedSupabase = () =>
  createSupabaseClient({
    storage: sessionStorageAdapter,
    storageKey: IMPERSONATED_AUTH_STORAGE_KEY,
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true
  });
