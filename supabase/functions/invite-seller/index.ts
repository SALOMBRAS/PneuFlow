import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

const normalizeRefCode = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, nome, store_id, password } = await req.json()

    // 1. Validations
    if (!email || !nome || !store_id || !password) {
      return jsonResponse({ error: 'Campos obrigatórios: email, nome, store_id e password' }, 400)
    }

    const normalizedPassword = String(password)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{5,}$/

    if (!passwordRegex.test(normalizedPassword)) {
      return jsonResponse({
        error: 'A senha precisa ter mínimo 5 caracteres, 1 número, 1 letra maiúscula e 1 letra minúscula.'
      }, 400)
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedNome = String(nome).trim()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Configuração do servidor incompleta' }, 500)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const token = authHeader.replace('Bearer ', '').trim()

    // 2. Validate requester (must be owner)
    const { data: { user: requester }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !requester) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('owner_id', requester.id)
      .maybeSingle()

    if (storeError || !store) return jsonResponse({ error: 'Forbidden: você não é o dono desta loja' }, 403)

    // 3. Find existing member record
    const { data: existingMember } = await supabaseAdmin
      .from('store_members')
      .select('id, user_id, ref_code, senha_inicial')
      .eq('store_id', store_id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    let invitedUserId = existingMember?.user_id

    // --- PHASE 1: Auth Management (Admin level) ---
    try {
      if (invitedUserId) {
        // SCENARIO A: Already linked user -> Update password and metadata
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(invitedUserId, {
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: normalizedNome,
            role: 'seller',
            invited_to_store: store_id
          }
        })
        if (updateError) throw updateError
      } else {
        // SCENARIO B: No user_id in store_members record -> Try to create or find and update
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: normalizedNome,
            role: 'seller',
            invited_to_store: store_id
          }
        })

        if (createError) {
          if (createError.message?.toLowerCase().includes('already')) {
            // SCENARIO C: User exists in Auth but not linked in our table -> Find by email and update
            const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            if (listError) throw listError
            
            const targetUser = userList.users.find(u => u.email?.toLowerCase() === normalizedEmail)
            if (!targetUser) throw new Error('Usuário já existe mas não pôde ser localizado para atualização')
            
            invitedUserId = targetUser.id
            const { error: updateExistingError } = await supabaseAdmin.auth.admin.updateUserById(invitedUserId, {
              password: password,
              email_confirm: true,
              user_metadata: {
                full_name: normalizedNome,
                role: 'seller',
                invited_to_store: store_id
              }
            })
            if (updateExistingError) throw updateExistingError
          } else {
            throw createError
          }
        } else {
          invitedUserId = authData.user.id
        }
      }
    } catch (authErr) {
      return jsonResponse({ error: 'Erro ao gerenciar autenticação: ' + authErr.message }, 400)
    }

    // --- PHASE 2: Database Management ---
    const finalRefCode = existingMember?.ref_code || (normalizeRefCode(normalizedNome || normalizedEmail.split('@')[0]) + '-' + Math.random().toString(36).substring(2, 8))
    
    const memberPayload = {
      store_id,
      email: normalizedEmail,
      nome: normalizedNome,
      role: 'seller',
      status: 'active',
      user_id: invitedUserId,
      ref_code: finalRefCode,
      senha_inicial: password, // Store for owner visibility as requested
      disabled_at: null,
      removed_at: null,
      auth_deleted_at: null,
      updated_at: new Date().toISOString()
    }

    let memberId = existingMember?.id

    if (memberId) {
      const { error: updateDbError } = await supabaseAdmin
        .from('store_members')
        .update(memberPayload)
        .eq('id', memberId)
      if (updateDbError) throw updateDbError
    } else {
      const { data: newMember, error: insertDbError } = await supabaseAdmin
        .from('store_members')
        .insert([{ ...memberPayload, invited_by: requester.id }])
        .select('id')
        .single()
      if (insertDbError) throw insertDbError
      memberId = newMember.id
    }

    return jsonResponse({
      success: true,
      message: 'Vendedor cadastrado e senha sincronizada com sucesso',
      member_id: memberId,
      user_id: invitedUserId,
      ref_code: finalRefCode
    })

  } catch (err) {
    return jsonResponse({ error: err.message }, 400)
  }
})
