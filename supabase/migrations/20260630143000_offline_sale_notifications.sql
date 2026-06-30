create or replace function public.atualizar_status_atendimento_lead(
  p_lead_id uuid,
  p_status_atendimento text,
  p_sold_quantity integer default null,
  p_desired_quantity integer default null
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
  v_desired_quantity integer;
  v_requested_quantity integer;
  v_current_quantity integer;
  v_delta integer;
  v_updated_pneu_id uuid;
  v_owner_id uuid;
  v_recipients uuid[];
  v_transition_at timestamptz := now();
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

  v_desired_quantity := greatest(
    coalesce(p_desired_quantity, v_lead.desired_quantity, 1),
    1
  );

  v_current_quantity := case
    when v_lead.venda_confirmada then greatest(coalesce(v_lead.sold_quantity, v_lead.desired_quantity, 1), 1)
    else 0
  end;

  if v_current_status = 'vendido' and v_status = 'vendido' then
    raise exception 'Reabra a venda antes de alterar a quantidade';
  end if;

  if v_current_status = 'desistencia' and v_status = 'vendido' then
    raise exception 'Reabra o lead antes de confirmar a venda';
  end if;

  if v_status = 'em_atendimento' then
    v_requested_quantity := v_current_quantity;
  else
    v_requested_quantity := greatest(
      coalesce(p_sold_quantity, p_desired_quantity, v_lead.sold_quantity, v_lead.desired_quantity, 1),
      1
    );
  end if;

  select s.owner_id
  into v_owner_id
  from public.stores s
  where s.id = v_lead.loja_id;

  v_recipients := array_remove(array[v_owner_id, v_lead.seller_id], null);

  if v_status = 'vendido' then
    v_desired_quantity := greatest(
      coalesce(p_desired_quantity, v_requested_quantity, v_lead.desired_quantity, 1),
      1
    );
    v_requested_quantity := v_desired_quantity;
    v_delta := v_requested_quantity - v_current_quantity;

    if v_lead.produto_id is not null and v_delta > 0 then
      v_updated_pneu_id := null;

      update public.pneus
      set estoque = estoque - v_delta,
          updated_at = now()
      where id = v_lead.produto_id
        and loja_id = v_lead.loja_id
        and coalesce(estoque, 0) >= v_delta
      returning id into v_updated_pneu_id;

      if v_updated_pneu_id is null then
        raise exception 'Estoque insuficiente para confirmar esta venda';
      end if;
    elsif v_lead.produto_id is not null and v_delta < 0 then
      update public.pneus
      set estoque = coalesce(estoque, 0) + abs(v_delta),
          updated_at = now()
      where id = v_lead.produto_id
        and loja_id = v_lead.loja_id;
    end if;

    update public.leads
    set status_atendimento = 'vendido',
        last_interaction_at = v_transition_at,
        desired_quantity = v_desired_quantity,
        venda_confirmada = true,
        venda_confirmada_em = case
          when v_current_status = 'vendido' and v_lead.venda_confirmada_em is not null then v_lead.venda_confirmada_em
          else v_transition_at
        end,
        venda_confirmada_por = auth.uid(),
        sold_quantity = v_requested_quantity
    where id = p_lead_id;

    if v_current_status <> 'vendido' and array_length(v_recipients, 1) is not null then
      perform public.create_notifications_for_users(
        v_lead.loja_id,
        v_recipients,
        'success',
        'sales',
        'Venda finalizada',
        format('Venda confirmada para %s.', trim(coalesce(v_lead.nome_cliente, 'Cliente'))),
        'lead',
        p_lead_id,
        '/dashboard/leads',
        jsonb_build_object(
          'cliente', trim(coalesce(v_lead.nome_cliente, '')),
          'produto', nullif(trim(coalesce(v_lead.produto_nome, '')), ''),
          'quantidade', v_requested_quantity
        ),
        concat('lead-sold:', p_lead_id::text, ':', extract(epoch from v_transition_at)::bigint::text)
      );
    end if;

    return jsonb_build_object(
      'success', true,
      'lead_id', p_lead_id,
      'status_atendimento', 'vendido',
      'venda_confirmada', true,
      'sold_quantity', v_requested_quantity,
      'stock_delta', v_delta
    );
  end if;

  if v_current_status = 'vendido' and v_status = 'em_atendimento' and v_current_quantity > 0 then
    v_desired_quantity := greatest(
      coalesce(p_desired_quantity, v_current_quantity, v_lead.desired_quantity, 1),
      1
    );
  end if;

  if v_lead.venda_confirmada = true and v_lead.produto_id is not null and v_current_quantity > 0 then
    update public.pneus
    set estoque = coalesce(estoque, 0) + v_current_quantity,
        updated_at = now()
    where id = v_lead.produto_id
      and loja_id = v_lead.loja_id;
  end if;

  update public.leads
  set status_atendimento = v_status,
      last_interaction_at = v_transition_at,
      desired_quantity = v_desired_quantity,
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
    'desired_quantity', v_desired_quantity,
    'sold_quantity', null
  );
end;
$$;

alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer) owner to postgres;

notify pgrst, 'reload schema';
