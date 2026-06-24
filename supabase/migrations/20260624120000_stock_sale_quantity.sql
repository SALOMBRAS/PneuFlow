alter table public.leads
  add column if not exists desired_quantity integer not null default 1,
  add column if not exists sold_quantity integer;

alter table public.leads
  add constraint leads_desired_quantity_positive
  check (desired_quantity >= 1) not valid;

alter table public.leads
  validate constraint leads_desired_quantity_positive;

alter table public.leads
  add constraint leads_sold_quantity_positive
  check (sold_quantity is null or sold_quantity >= 1) not valid;

alter table public.leads
  validate constraint leads_sold_quantity_positive;

create or replace function public.registrar_lead(
  p_loja_id uuid,
  p_produto_id uuid default null,
  p_nome_cliente text default null,
  p_produto_nome text default null,
  p_produto_medida text default null,
  p_produto_preco numeric default 0,
  p_origem text default 'whatsapp',
  p_seller_id uuid default null,
  p_ref_code text default null,
  p_attribution_source text default 'product',
  p_desired_quantity integer default 1
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lead_id uuid;
  v_final_seller_id uuid := null;
  v_final_source text := 'unknown';
  v_clean_ref text := null;
  v_desired_quantity integer := greatest(coalesce(p_desired_quantity, 1), 1);
  v_available_stock integer;
begin
  if p_loja_id is null then
    raise exception 'Loja obrigatoria';
  end if;

  if nullif(trim(coalesce(p_nome_cliente, '')), '') is null then
    raise exception 'Nome do cliente obrigatorio';
  end if;

  if p_produto_id is not null then
    select p.estoque
    into v_available_stock
    from public.pneus p
    where p.id = p_produto_id
      and p.loja_id = p_loja_id
      and coalesce(p.status, 'ativo') = 'ativo';

    if not found then
      raise exception 'Pneu nao encontrado ou indisponivel';
    end if;

    if coalesce(v_available_stock, 0) < v_desired_quantity then
      raise exception 'Estoque insuficiente para a quantidade desejada';
    end if;
  end if;

  if p_ref_code is not null and p_ref_code <> '' then
    v_clean_ref := public.slugify_ref_code(p_ref_code);

    select sm.user_id
    into v_final_seller_id
    from public.store_members sm
    where sm.store_id = p_loja_id
      and sm.status = 'active'
      and sm.user_id is not null
      and lower(sm.ref_code) = lower(v_clean_ref)
    limit 1;

    if v_final_seller_id is not null then
      v_final_source := 'referral';
    end if;
  end if;

  if v_final_seller_id is null and p_seller_id is not null then
    select sm.user_id
    into v_final_seller_id
    from public.store_members sm
    where sm.store_id = p_loja_id
      and sm.user_id = p_seller_id
      and sm.status = 'active'
    limit 1;

    if v_final_seller_id is not null then
      v_final_source := 'referral';
    end if;
  end if;

  if v_final_seller_id is null and p_produto_id is not null then
    select p.created_by
    into v_final_seller_id
    from public.pneus p
    where p.id = p_produto_id
      and p.loja_id = p_loja_id
    limit 1;

    if v_final_seller_id is not null then
      v_final_source := 'product';
    end if;
  end if;

  insert into public.leads (
    loja_id,
    store_id,
    produto_id,
    pneu_id,
    seller_id,
    nome_cliente,
    produto_nome,
    produto_medida,
    produto_preco,
    origem,
    ref_code,
    attribution_source,
    desired_quantity
  )
  values (
    p_loja_id,
    p_loja_id,
    p_produto_id,
    p_produto_id,
    v_final_seller_id,
    trim(p_nome_cliente),
    coalesce(p_produto_nome, ''),
    coalesce(p_produto_medida, ''),
    coalesce(p_produto_preco, 0),
    coalesce(p_origem, 'whatsapp'),
    v_clean_ref,
    v_final_source,
    v_desired_quantity
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

drop function if exists public.atualizar_status_venda_lead(uuid, boolean);

create or replace function public.atualizar_status_venda_lead(
  p_lead_id uuid,
  p_venda_confirmada boolean,
  p_sold_quantity integer default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lead public.leads%rowtype;
  v_is_owner boolean := false;
  v_is_seller_allowed boolean := false;
  v_requested_quantity integer;
  v_current_quantity integer;
  v_delta integer;
  v_updated_pneu_id uuid;
begin
  select *
  into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead nao encontrado';
  end if;

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

  if p_venda_confirmada = false and not v_is_owner then
    raise exception 'Somente o dono da loja pode desmarcar uma venda confirmada';
  end if;

  if v_lead.venda_confirmada = true and not v_is_owner then
    raise exception 'Venda ja confirmada. Somente o dono da loja pode alterar';
  end if;

  v_requested_quantity := greatest(
    coalesce(p_sold_quantity, v_lead.sold_quantity, v_lead.desired_quantity, 1),
    1
  );

  v_current_quantity := case
    when v_lead.venda_confirmada then greatest(coalesce(v_lead.sold_quantity, v_lead.desired_quantity, 1), 1)
    else 0
  end;

  if p_venda_confirmada = false then
    if v_lead.venda_confirmada = true and v_lead.produto_id is not null and v_current_quantity > 0 then
      update public.pneus
      set estoque = coalesce(estoque, 0) + v_current_quantity,
          updated_at = now()
      where id = v_lead.produto_id
        and loja_id = v_lead.loja_id;
    end if;

    update public.leads
    set venda_confirmada = false,
        venda_confirmada_em = null,
        venda_confirmada_por = null,
        sold_quantity = null
    where id = p_lead_id;

    return jsonb_build_object(
      'success', true,
      'lead_id', p_lead_id,
      'venda_confirmada', false,
      'sold_quantity', null
    );
  end if;

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
  set venda_confirmada = true,
      venda_confirmada_em = coalesce(v_lead.venda_confirmada_em, now()),
      venda_confirmada_por = coalesce(v_lead.venda_confirmada_por, auth.uid()),
      sold_quantity = v_requested_quantity
  where id = p_lead_id;

  return jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'venda_confirmada', true,
    'sold_quantity', v_requested_quantity,
    'stock_delta', v_delta
  );
end;
$$;

drop function if exists public.get_leads_com_vendedor(uuid);

create or replace function public.get_leads_com_vendedor(p_store_id uuid)
returns table(
  id uuid,
  loja_id uuid,
  seller_id uuid,
  ref_code text,
  attribution_source text,
  nome_cliente text,
  produto_nome text,
  produto_medida text,
  produto_preco numeric,
  origem text,
  created_at timestamptz,
  vendedor_nome text,
  vendedor_email text,
  vendedor_ref_code text,
  desired_quantity integer,
  sold_quantity integer,
  venda_confirmada boolean,
  venda_confirmada_em timestamptz,
  venda_confirmada_por uuid
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_owner boolean := false;
begin
  select exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and s.owner_id = auth.uid()
  )
  into v_is_owner;

  if not v_is_owner
  and not exists (
    select 1
    from public.store_members m
    where m.store_id = p_store_id
      and m.user_id = auth.uid()
  )
  then
    return;
  end if;

  return query
  select
    l.id,
    l.loja_id,
    l.seller_id,
    l.ref_code,
    l.attribution_source,
    l.nome_cliente,
    l.produto_nome,
    l.produto_medida,
    l.produto_preco,
    l.origem,
    l.created_at,
    sm.nome as vendedor_nome,
    sm.email as vendedor_email,
    sm.ref_code as vendedor_ref_code,
    l.desired_quantity,
    l.sold_quantity,
    l.venda_confirmada,
    l.venda_confirmada_em,
    l.venda_confirmada_por
  from public.leads l
  left join lateral (
    select
      m.nome,
      m.email,
      m.ref_code
    from public.store_members m
    where m.store_id = l.loja_id
      and (
        m.user_id = l.seller_id
        or (
          l.ref_code is not null
          and m.ref_code = l.ref_code
        )
      )
    order by
      case
        when m.user_id = l.seller_id then 0
        else 1
      end
    limit 1
  ) sm on true
  where l.loja_id = p_store_id
    and (
      v_is_owner = true
      or exists (
        select 1
        from public.store_members current_member
        where current_member.store_id = p_store_id
          and current_member.user_id = auth.uid()
          and (
            l.seller_id = current_member.user_id
            or (
              l.ref_code is not null
              and current_member.ref_code = l.ref_code
            )
          )
      )
    )
  order by l.created_at desc;
end;
$$;

alter function public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer) owner to postgres;
alter function public.atualizar_status_venda_lead(uuid, boolean, integer) owner to postgres;
alter function public.get_leads_com_vendedor(uuid) owner to postgres;

grant execute on function public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer) to anon;
grant execute on function public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer) to authenticated;
grant execute on function public.atualizar_status_venda_lead(uuid, boolean, integer) to authenticated;
grant execute on function public.get_leads_com_vendedor(uuid) to authenticated;

notify pgrst, 'reload schema';
