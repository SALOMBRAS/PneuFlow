import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const GENERIC_FORBIDDEN_MESSAGE = 'Voce nao possui permissao para acessar esta conta.'
const GENERIC_SELLER_MESSAGE = 'Este vendedor nao esta disponivel para acesso.'

const getAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuracao do servidor incompleta')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const sha256 = async (value: string) => {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { member_id } = await req.json()
    if (!member_id) return jsonResponse({ error: GENERIC_SELLER_MESSAGE }, 400)

    const supabaseAdmin = getAdminClient()
    const token = authHeader.replace('Bearer ', '').trim()

    const { data: { user: requester }, error: requesterError } = await supabaseAdmin.auth.getUser(token)
    if (requesterError || !requester) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { data: member, error: memberError } = await supabaseAdmin
      .from('store_members')
      .select('id, store_id, user_id, email, nome, role, status')
      .eq('id', member_id)
      .maybeSingle()

    if (memberError || !member) return jsonResponse({ error: GENERIC_SELLER_MESSAGE }, 404)

    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, owner_id')
      .eq('id', member.store_id)
      .maybeSingle()

    if (storeError || !store || store.owner_id !== requester.id) {
      await supabaseAdmin.from('seller_access_audit').insert({
        store_id: member.store_id,
        owner_user_id: requester.id,
        seller_member_id: member.id,
        seller_user_id: member.user_id,
        status: 'failed',
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        failure_reason: 'owner_not_authorized',
      })

      return jsonResponse({ error: GENERIC_FORBIDDEN_MESSAGE }, 403)
    }

    const { data: ownerMembership } = await supabaseAdmin
      .from('store_members')
      .select('id, status')
      .eq('store_id', store.id)
      .eq('user_id', requester.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (!ownerMembership || ownerMembership.status !== 'active') {
      await supabaseAdmin.from('seller_access_audit').insert({
        store_id: member.store_id,
        owner_user_id: requester.id,
        seller_member_id: member.id,
        seller_user_id: member.user_id,
        status: 'failed',
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        failure_reason: 'owner_inactive',
      })

      return jsonResponse({ error: GENERIC_FORBIDDEN_MESSAGE }, 403)
    }

    if (member.role !== 'seller' || member.status !== 'active' || !member.user_id) {
      await supabaseAdmin.from('seller_access_audit').insert({
        store_id: member.store_id,
        owner_user_id: requester.id,
        seller_member_id: member.id,
        seller_user_id: member.user_id,
        status: 'failed',
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        failure_reason: 'seller_unavailable',
      })

      return jsonResponse({ error: GENERIC_SELLER_MESSAGE }, 403)
    }

    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentCount, error: rateLimitError } = await supabaseAdmin
      .from('seller_access_audit')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', requester.id)
      .eq('seller_user_id', member.user_id)
      .gte('requested_at', windowStart)

    if (rateLimitError) {
      throw rateLimitError
    }

    if ((recentCount ?? 0) >= 5) {
      await supabaseAdmin.from('seller_access_audit').insert({
        store_id: member.store_id,
        owner_user_id: requester.id,
        seller_member_id: member.id,
        seller_user_id: member.user_id,
        status: 'failed',
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        failure_reason: 'rate_limit',
      })

      return jsonResponse({ error: 'Nao foi possivel iniciar o acesso temporario.' }, 429)
    }

    const ticket = crypto.randomUUID() + crypto.randomUUID()
    const ticketHash = await sha256(ticket)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()

    const { data: audit, error: auditError } = await supabaseAdmin
      .from('seller_access_audit')
      .insert({
        store_id: member.store_id,
        owner_user_id: requester.id,
        seller_member_id: member.id,
        seller_user_id: member.user_id,
        ticket_hash: ticketHash,
        status: 'requested',
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (auditError) throw auditError

    return jsonResponse({
      ticket,
      audit_id: audit.id,
      expires_at: expiresAt,
      seller: {
        nome: member.nome,
        email: member.email,
      },
    })
  } catch (error) {
    return jsonResponse({ error: 'Nao foi possivel iniciar o acesso temporario.' }, 400)
  }
})
