import { createClient } from '@supabase/supabase-js';

export function createPaymentClients(config) {
  const userValidationClient = createClient(
    config.supabaseUrl,
    config.publishableKey || config.serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const adminClient = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return { userValidationClient, adminClient };
}

export async function authenticateStoreOwner(req, clients) {
  const authorization = String(req.headers?.authorization || '');
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    const error = new Error('Autenticação obrigatória.');
    error.statusCode = 401;
    throw error;
  }

  const { data: userData, error: userError } = await clients.userValidationClient.auth.getUser(token);
  if (userError || !userData?.user) {
    const error = new Error('Sessão inválida ou expirada.');
    error.statusCode = 401;
    throw error;
  }

  const { data: store, error: storeError } = await clients.adminClient
    .from('stores')
    .select('id, owner_id, nome, plano, created_at, subscription_status, trial_ends_at, current_period_end')
    .eq('owner_id', userData.user.id)
    .maybeSingle();

  if (storeError) throw storeError;
  if (!store) {
    const error = new Error('Nenhuma loja de proprietário foi encontrada para esta conta.');
    error.statusCode = 403;
    throw error;
  }

  return { token, user: userData.user, store };
}
