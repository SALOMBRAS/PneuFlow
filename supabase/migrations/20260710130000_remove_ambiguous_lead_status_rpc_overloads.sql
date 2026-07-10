drop function if exists public.atualizar_status_atendimento_lead(integer, uuid, numeric, integer, integer, text, text, text, numeric);
drop function if exists public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text);
drop function if exists public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric);
drop function if exists public.atualizar_status_atendimento_lead(uuid, text, integer, integer);

create function public.atualizar_status_atendimento_lead(
  p_lead_id uuid,
  p_status_atendimento text,
  p_sold_quantity integer default null,
  p_desired_quantity integer default null,
  p_titulo_anuncio text default null,
  p_preco_anuncio numeric default null,
  p_quantidade_por_anuncio integer default null,
  p_valor_total numeric default null,
  p_telefone_cliente text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_lead public.leads%rowtype;
  v_is_owner boolean := false;
  v_is_seller_allowed boolean := false;
  v_status text := lower(trim(coalesce(p_status_atendimento, '')));
  v_current_status text;
  v_item_count integer := 0;
  v_total_offer_quantity integer := 0;
  v_total_physical_quantity integer := 0;
  v_total_value numeric(10,2) := 0;
  v_summary_title text;
  v_summary_measure text;
  v_single_item public.lead_items%rowtype;
  v_row public.lead_items%rowtype;
  v_requested_offer_quantity integer;
  v_requested_physical_quantity integer;
  v_owner_id uuid;
  v_recipients uuid[];
  v_transition_at timestamptz := now();
  v_phone_digits text;
  v_phone_to_save text;
begin
  if v_status not in ('em_atendimento', 'vendido', 'desistencia') then
    raise exception 'Status de atendimento invalido';
  end if;

  select *
  into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead nao encontrado';
  end if;

  v_phone_digits := nullif(regexp_replace(coalesce(p_telefone_cliente, ''), '\D', '', 'g'), '');
  v_phone_to_save := coalesce(v_phone_digits, nullif(regexp_replace(coalesce(v_lead.telefone_cliente, ''), '\D', '', 'g'), ''));

  if v_status = 'vendido' then
    if v_phone_to_save is null or char_length(v_phone_to_save) not in (10, 11) then
      raise exception 'Telefone do cliente invalido';
    end if;
  elsif v_phone_to_save is not null and char_length(v_phone_to_save) not in (10, 11) then
    raise exception 'Telefone do cliente invalido';
  end if;

  v_current_status := case
    when v_lead.status_atendimento in ('em_atendimento', 'vendido', 'desistencia') then v_lead.status_atendimento
    when v_lead.venda_confirmada = true then 'vendido'
    else 'em_atendimento'
  end;

  select exists (
    select 1
    from public.stores s
    where s.id = v_lead.loja_id
      and s.owner_id = auth.uid()
  )
  into v_is_owner;

  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = v_lead.loja_id
      and sm.user_id = auth.uid()
      and (sm.status is null or sm.status in ('active', 'ativo'))
      and (
        v_lead.seller_id = sm.user_id
        or (
          v_lead.ref_code is not null
          and sm.ref_code = v_lead.ref_code
        )
      )
  )
  into v_is_seller_allowed;

  if not v_is_owner and not v_is_seller_allowed then
    raise exception 'Sem permissao para alterar este lead';
  end if;

  if not v_is_owner then
    if v_current_status = 'vendido' and v_status <> 'vendido' then
      raise exception 'Somente o dono da loja pode desfazer ou reabrir uma venda confirmada';
    end if;

    if v_current_status = 'desistencia' and v_status <> 'desistencia' then
      raise exception 'Somente o dono da loja pode reabrir um lead em desistencia';
    end if;
  end if;

  select
    count(*)::integer,
    coalesce(sum(li.quantidade), 0)::integer,
    coalesce(sum(li.quantidade_total_pneus), 0)::integer,
    round(coalesce(sum(li.valor_total), 0)::numeric, 2)
  into
    v_item_count,
    v_total_offer_quantity,
    v_total_physical_quantity,
    v_total_value
  from public.lead_items li
  where li.lead_id = p_lead_id;

  if v_item_count = 0 then
    raise exception 'Lead sem itens';
  end if;

  if v_item_count = 1 then
    select *
    into v_single_item
    from public.lead_items li
    where li.lead_id = p_lead_id
    order by li.created_at, li.id
    limit 1
    for update;

    v_requested_offer_quantity := greatest(coalesce(p_sold_quantity, p_desired_quantity, v_single_item.quantidade, 1), 1);
    v_requested_physical_quantity := v_requested_offer_quantity * greatest(v_single_item.quantidade_por_anuncio, 1);

    update public.lead_items
    set quantidade = v_requested_offer_quantity,
        quantidade_total_pneus = v_requested_physical_quantity,
        valor_total = round((coalesce(p_preco_anuncio, v_single_item.preco_unitario_anuncio, 0) * v_requested_offer_quantity)::numeric, 2),
        titulo_anuncio = coalesce(nullif(trim(coalesce(p_titulo_anuncio, '')), ''), titulo_anuncio),
        preco_unitario_anuncio = round(coalesce(p_preco_anuncio, v_single_item.preco_unitario_anuncio, 0)::numeric, 2),
        medida = coalesce(v_single_item.medida, medida)
    where id = v_single_item.id;
  end if;

  select
    count(*)::integer,
    coalesce(sum(li.quantidade), 0)::integer,
    coalesce(sum(li.quantidade_total_pneus), 0)::integer,
    round(coalesce(sum(li.valor_total), 0)::numeric, 2)
  into
    v_item_count,
    v_total_offer_quantity,
    v_total_physical_quantity,
    v_total_value
  from public.lead_items li
  where li.lead_id = p_lead_id;

  select li.titulo_anuncio, li.medida
  into v_summary_title, v_summary_measure
  from public.lead_items li
  where li.lead_id = p_lead_id
  order by li.created_at, li.id
  limit 1;

  select s.owner_id
  into v_owner_id
  from public.stores s
  where s.id = v_lead.loja_id;

  v_recipients := array_remove(array[v_owner_id, v_lead.seller_id], null);

  if v_status = 'vendido' then
    if v_current_status = 'desistencia' then
      raise exception 'Reabra o lead antes de confirmar a venda';
    end if;

    for v_row in
      select *
      from public.lead_items li
      where li.lead_id = p_lead_id
      order by li.created_at, li.id
    loop
      if v_row.product_id is null then
        raise exception 'Item do lead sem produto vinculado';
      end if;

      update public.pneus
      set estoque = estoque - v_row.quantidade_total_pneus,
          updated_at = now()
      where id = v_row.product_id
        and loja_id = v_lead.loja_id
        and coalesce(estoque, 0) >= v_row.quantidade_total_pneus;

      if not found then
        raise exception 'Estoque insuficiente para confirmar esta venda';
      end if;
    end loop;

    update public.leads
    set status_atendimento = 'vendido',
        last_interaction_at = v_transition_at,
        produto_nome = case when v_item_count > 1 then format('%s itens no orcamento', v_item_count) else coalesce(v_summary_title, produto_nome) end,
        titulo_anuncio = v_summary_title,
        produto_medida = coalesce(v_summary_measure, produto_medida),
        produto_preco = case when v_item_count > 1 then v_total_value else coalesce((select preco_unitario_anuncio from public.lead_items where lead_id = p_lead_id order by created_at, id limit 1), produto_preco) end,
        preco_anuncio = case when v_item_count > 1 then v_total_value else coalesce((select preco_unitario_anuncio from public.lead_items where lead_id = p_lead_id order by created_at, id limit 1), preco_anuncio) end,
        desired_quantity = v_total_physical_quantity,
        quantidade_anuncios = v_total_offer_quantity,
        quantidade_por_anuncio = case when v_item_count = 1 then coalesce((select quantidade_por_anuncio from public.lead_items where lead_id = p_lead_id order by created_at, id limit 1), 1) else 1 end,
        quantidade_total_pneus = v_total_physical_quantity,
        valor_total = v_total_value,
        telefone_cliente = v_phone_to_save,
        venda_confirmada = true,
        venda_confirmada_em = case when v_current_status = 'vendido' and v_lead.venda_confirmada_em is not null then v_lead.venda_confirmada_em else v_transition_at end,
        venda_confirmada_por = auth.uid(),
        sold_quantity = v_total_physical_quantity
    where id = p_lead_id;

    if v_current_status <> 'vendido' and array_length(v_recipients, 1) is not null then
      perform public.create_notifications_for_users(
        v_lead.loja_id,
        v_recipients,
        'success',
        'sales',
        'Venda finalizada',
        format('Venda com %s item(ns) e %s pneu(s) confirmada para %s.', v_item_count, v_total_physical_quantity, trim(coalesce(v_lead.nome_cliente, 'Cliente'))),
        'lead',
        p_lead_id,
        '/dashboard/leads',
        jsonb_build_object(
          'cliente', trim(coalesce(v_lead.nome_cliente, '')),
          'item_count', v_item_count,
          'quantidade_anuncios', v_total_offer_quantity,
          'quantidade_total_pneus', v_total_physical_quantity,
          'valor_total', v_total_value
        ),
        concat('lead-cart-sold:', p_lead_id::text, ':', extract(epoch from v_transition_at)::bigint::text)
      );
    end if;

    return jsonb_build_object(
      'success', true,
      'lead_id', p_lead_id,
      'status_atendimento', 'vendido',
      'venda_confirmada', true,
      'item_count', v_item_count,
      'quantidade_total_pneus', v_total_physical_quantity,
      'valor_total', v_total_value
    );
  end if;

  if v_lead.venda_confirmada = true then
    for v_row in
      select *
      from public.lead_items li
      where li.lead_id = p_lead_id
        and li.product_id is not null
    loop
      update public.pneus
      set estoque = coalesce(estoque, 0) + v_row.quantidade_total_pneus,
          updated_at = now()
      where id = v_row.product_id
        and loja_id = v_lead.loja_id;
    end loop;
  end if;

  update public.leads
  set status_atendimento = v_status,
      last_interaction_at = v_transition_at,
      produto_nome = case when v_item_count > 1 then format('%s itens no orcamento', v_item_count) else coalesce(v_summary_title, produto_nome) end,
      titulo_anuncio = v_summary_title,
      produto_medida = coalesce(v_summary_measure, produto_medida),
      produto_preco = case when v_item_count > 1 then v_total_value else coalesce((select preco_unitario_anuncio from public.lead_items where lead_id = p_lead_id order by created_at, id limit 1), produto_preco) end,
      preco_anuncio = case when v_item_count > 1 then v_total_value else coalesce((select preco_unitario_anuncio from public.lead_items where lead_id = p_lead_id order by created_at, id limit 1), preco_anuncio) end,
      desired_quantity = v_total_physical_quantity,
      quantidade_anuncios = v_total_offer_quantity,
      quantidade_por_anuncio = case when v_item_count = 1 then coalesce((select quantidade_por_anuncio from public.lead_items where lead_id = p_lead_id order by created_at, id limit 1), 1) else 1 end,
      quantidade_total_pneus = v_total_physical_quantity,
      valor_total = v_total_value,
      telefone_cliente = v_phone_to_save,
      venda_confirmada = false,
      venda_confirmada_em = null,
      venda_confirmada_por = null,
      sold_quantity = null
  where id = p_lead_id;

  return jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'status_atendimento', v_status,
    'venda_confirmada', false,
    'item_count', v_item_count,
    'quantidade_total_pneus', v_total_physical_quantity,
    'valor_total', v_total_value
  );
end;
$$;

alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text) owner to postgres;

grant execute on function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text) to authenticated;

notify pgrst, 'reload schema';
