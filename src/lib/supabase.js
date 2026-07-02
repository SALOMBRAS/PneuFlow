import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Publishable Key is missing. Check your environment variables.');
}

export const customStorage = {
  getItem: (key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    const remember = localStorage.getItem('pneuflow_remember_session') === 'true';
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const createSupabaseClient = (options = {}) => {
  const {
    storage = customStorage,
    storageKey,
    detectSessionInUrl,
    persistSession = true,
    autoRefreshToken = true
  } = options;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      storageKey,
      detectSessionInUrl,
      persistSession,
      autoRefreshToken
    }
  });
};

export const supabase = createSupabaseClient();
