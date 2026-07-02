import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const missingSupabaseConfigMessage = 'Configuracao do Supabase ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Publishable Key is missing. Check your environment variables.');
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseInitError = hasSupabaseConfig ? null : new Error(missingSupabaseConfigMessage);

const createNoopSubscription = () => ({
  unsubscribe() {}
});

const createQueryBuilderStub = () => {
  const chain = {
    select: () => chain,
    insert: async () => ({ data: null, error: supabaseInitError }),
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    in: () => chain,
    order: async () => ({ data: [], error: supabaseInitError }),
    maybeSingle: async () => ({ data: null, error: supabaseInitError }),
    single: async () => ({ data: null, error: supabaseInitError }),
  };

  return chain;
};

const createUnavailableSupabaseClient = () => ({
  auth: {
    signInWithPassword: async () => ({ data: null, error: supabaseInitError }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: supabaseInitError }),
    getSession: async () => ({ data: { session: null }, error: supabaseInitError }),
    resetPasswordForEmail: async () => ({ data: null, error: supabaseInitError }),
    updateUser: async () => ({ data: null, error: supabaseInitError }),
    signUp: async () => ({ data: null, error: supabaseInitError }),
    verifyOtp: async () => ({ data: null, error: supabaseInitError }),
    onAuthStateChange: () => ({ data: { subscription: createNoopSubscription() } })
  },
  functions: {
    invoke: async () => ({ data: null, error: supabaseInitError })
  },
  rpc: async () => ({ data: null, error: supabaseInitError }),
  from: () => createQueryBuilderStub(),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: supabaseInitError }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  }
});

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
  if (!hasSupabaseConfig) {
    return createUnavailableSupabaseClient();
  }

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
