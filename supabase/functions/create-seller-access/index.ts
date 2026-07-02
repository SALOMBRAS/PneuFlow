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
const GENERIC_INTERNAL_MESSAGE = 'Nao foi possivel iniciar o acesso temporario.'

const getAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuracao do servidor incompleta')
  }

  return createClient(supabaseUrl, serviceRoleKey)
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

    const { member_id } = await req.json()
    if (!member_id) return jsonResponse({ error: 'Payload invalido: member_id obrigatorio.' }, 400)

    stage = 'create_admin_client'
    const supabaseAdmin = getAdminClient()
    const token = authHeader.replace('Bearer ', '').trim()

    stage = 'validate_requester'
    const { data: { user: requester }, error: requesterError } = await supabaseAdmin.auth.getUser(token)
    if (requesterError || !requester) return jsonResponse({ error: 'Unauthorized' }, 401)

    stage = 'load_member'
    const { data: member, error: memberError } = await supabaseAdmin
      .from('store_members')
      .select('id, store_id, user_id, email, nome, role, status')
      .eq('id', member_id)
      .maybeSingle()

    if (memberError || !member) return jsonResponse({ error: GENERIC_SELLER_MESSAGE }, 404)

    stage = 'load_store'
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

    stage = 'validate_owner_membership'
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

    stage = 'validate_seller'
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

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()

    stage = 'generate_link'
    const { data: generatedLink, error: generatedLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: member.email,
    })

    if (generatedLinkError || !generatedLink?.properties?.hashed_token) {
      throw generatedLinkError || new Error('Nao foi possivel gerar o acesso do vendedor')
    }

    stage = 'return_success'
    return jsonResponse({
      hashed_token: generatedLink.properties.hashed_token,
      verification_type: generatedLink.properties.verification_type,
      expires_at: expiresAt,
      seller: {
        nome: member.nome,
        email: member.email,
      },
    })
  } catch (error) {
    console.error('[create-seller-access]', {
      stage,
      code: error?.code ?? null,
      message: error?.message ?? 'Unknown error',
      details: error?.details ?? null,
      hint: error?.hint ?? null,
    })

    return jsonResponse({ error: GENERIC_INTERNAL_MESSAGE, stage }, 500)
  }
})
