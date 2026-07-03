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
const EXPIRED_MESSAGE = 'O acesso temporario expirou. Solicite novamente.'
const GENERIC_INTERNAL_MESSAGE = 'Nao foi possivel iniciar o acesso temporario.'

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

  let stage = 'request_start'

  try {
    stage = 'parse_payload'
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { ticket } = await req.json()
    if (!ticket) return jsonResponse({ error: EXPIRED_MESSAGE }, 400)

    stage = 'create_admin_client'
    const supabaseAdmin = getAdminClient()
    const token = authHeader.replace('Bearer ', '').trim()
    stage = 'create_ticket_hash'
    const ticketHash = await sha256(String(ticket))

    stage = 'validate_requester'
    const { data: { user: requester }, error: requesterError } = await supabaseAdmin.auth.getUser(token)
    if (requesterError || !requester) return jsonResponse({ error: 'Unauthorized' }, 401)

    stage = 'load_audit'
    const { data: audit, error: auditError } = await supabaseAdmin
      .from('seller_access_audit')
      .select('id, store_id, owner_user_id, seller_member_id, seller_user_id, status, expires_at, consumed_at')
      .eq('ticket_hash', ticketHash)
      .maybeSingle()

    if (auditError || !audit) return jsonResponse({ error: EXPIRED_MESSAGE }, 404)

    if (audit.owner_user_id !== requester.id) {
      await supabaseAdmin
        .from('seller_access_audit')
        .update({
          status: 'failed',
          failure_reason: 'owner_mismatch',
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id)

      return jsonResponse({ error: GENERIC_FORBIDDEN_MESSAGE }, 403)
    }

    const now = Date.now()
    if (new Date(audit.expires_at).getTime() <= now) {
      await supabaseAdmin
        .from('seller_access_audit')
        .update({
          status: 'expired',
          failure_reason: 'ticket_expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id)

      return jsonResponse({ error: EXPIRED_MESSAGE }, 410)
    }

    if (audit.consumed_at || audit.status === 'consumed' || audit.status === 'ended') {
      await supabaseAdmin
        .from('seller_access_audit')
        .update({
          failure_reason: 'ticket_reused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id)

      return jsonResponse({ error: EXPIRED_MESSAGE }, 409)
    }

    stage = 'load_store'
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, owner_id')
      .eq('id', audit.store_id)
      .maybeSingle()

    if (storeError || !store || store.owner_id !== requester.id) {
      return jsonResponse({ error: GENERIC_FORBIDDEN_MESSAGE }, 403)
    }

    stage = 'validate_owner_membership'
    const { data: ownerMembership } = await supabaseAdmin
      .from('store_members')
      .select('id, status')
      .eq('store_id', audit.store_id)
      .eq('user_id', requester.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (!ownerMembership || ownerMembership.status !== 'active') {
      return jsonResponse({ error: GENERIC_FORBIDDEN_MESSAGE }, 403)
    }

    stage = 'load_member'
    const { data: member, error: memberError } = await supabaseAdmin
      .from('store_members')
      .select('id, store_id, user_id, email, role, status')
      .eq('id', audit.seller_member_id)
      .maybeSingle()

    if (memberError || !member || member.store_id !== audit.store_id || member.user_id !== audit.seller_user_id) {
      await supabaseAdmin
        .from('seller_access_audit')
        .update({
          status: 'failed',
          failure_reason: 'seller_mismatch',
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id)

      return jsonResponse({ error: GENERIC_FORBIDDEN_MESSAGE }, 403)
    }

    stage = 'validate_seller'
    if (member.role !== 'seller' || member.status !== 'active' || !member.email) {
      await supabaseAdmin
        .from('seller_access_audit')
        .update({
          status: 'failed',
          failure_reason: 'seller_inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id)

      return jsonResponse({ error: 'Este vendedor nao esta disponivel para acesso.' }, 403)
    }

    stage = 'generate_link'
    const { data: generatedLink, error: generatedLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: member.email,
    })

    if (generatedLinkError || !generatedLink?.properties?.hashed_token) {
      throw generatedLinkError || new Error('Nao foi possivel gerar o acesso do vendedor')
    }

    stage = 'consume_audit'
    const consumedAt = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('seller_access_audit')
      .update({
        status: 'consumed',
        consumed_at: consumedAt,
        updated_at: consumedAt,
        failure_reason: null,
      })
      .eq('id', audit.id)

    if (updateError) throw updateError

    stage = 'return_success'
    return jsonResponse({
      audit_id: audit.id,
      hashed_token: generatedLink.properties.hashed_token,
      verification_type: generatedLink.properties.verification_type,
    })
  } catch (error) {
    console.error('[redeem-seller-access]', {
      stage,
      code: error?.code ?? null,
      message: error?.message ?? 'Unknown error',
      details: error?.details ?? null,
      hint: error?.hint ?? null,
    })

    return jsonResponse({ error: GENERIC_INTERNAL_MESSAGE, stage }, 500)
  }
})
