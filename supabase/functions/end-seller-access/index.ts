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

  try {
    let stage = 'request_start'
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    stage = 'parse_payload'
    const { audit_id } = await req.json()

    stage = 'create_admin_client'
    const supabaseAdmin = getAdminClient()
    const token = authHeader.replace('Bearer ', '').trim()
    stage = 'validate_requester'
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    stage = 'load_audit'
    const auditQuery = supabaseAdmin
      .from('seller_access_audit')
      .select('id, seller_user_id, status, ended_at')
      .eq('seller_user_id', user.id)
      .is('ended_at', null)
      .in('status', ['requested', 'consumed'])
      .order('requested_at', { ascending: false })
      .limit(1)

    const { data: auditRows, error: auditError } = audit_id
      ? await auditQuery.eq('id', audit_id)
      : await auditQuery

    const audit = auditRows?.[0] ?? null

    if (auditError || !audit || audit.seller_user_id !== user.id) {
      return jsonResponse({ error: 'Sessao temporaria invalida.' }, 403)
    }

    if (audit.ended_at || audit.status === 'ended') {
      return jsonResponse({ success: true })
    }

    stage = 'update_audit'
    const endedAt = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('seller_access_audit')
      .update({
        status: 'ended',
        ended_at: endedAt,
        updated_at: endedAt,
      })
      .eq('id', audit.id)

    if (updateError) throw updateError

    return jsonResponse({ success: true })
  } catch (error) {
    return jsonResponse({ error: 'Nao foi possivel encerrar a sessao temporaria.' }, 400)
  }
})
