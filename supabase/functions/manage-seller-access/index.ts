import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { store_id, member_id, action } = await req.json()
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Validate owner
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Unauthorized')

    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: 'Forbidden: You are not the owner of this store' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Fetch member
    const { data: member, error: memberFetchError } = await supabaseAdmin
      .from('store_members')
      .select('id, user_id, status')
      .eq('id', member_id)
      .eq('store_id', store_id)
      .maybeSingle()

    if (memberFetchError || !member) throw new Error('Vendedor não encontrado')

    let updateData = {}
    let message = ''

    if (action === 'deactivate') {
      updateData = {
        status: 'inactive',
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      message = 'Vendedor desativado com sucesso'
    } 
    else if (action === 'reactivate') {
      updateData = {
        status: 'active',
        disabled_at: null,
        removed_at: null,
        updated_at: new Date().toISOString()
      }
      message = 'Vendedor reativado com sucesso'
    } 
    else if (action === 'remove_access') {
      // Delete from Auth if exists
      if (member.user_id) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(member.user_id)
        if (deleteError) {
          console.warn('Error deleting user from Auth:', deleteError)
          // Continue anyway to mark as removed in DB
        }
      }

      updateData = {
        user_id: null,
        status: 'removed',
        disabled_at: new Date().toISOString(),
        removed_at: new Date().toISOString(),
        auth_deleted_at: new Date().toISOString(),
        removed_by: user.id,
        updated_at: new Date().toISOString()
      }
      message = 'Acesso do vendedor removido com sucesso'
    } 
    else {
      throw new Error('Ação inválida')
    }

    const { error: updateError } = await supabaseAdmin
      .from('store_members')
      .update(updateData)
      .eq('id', member_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
