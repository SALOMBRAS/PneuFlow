alter table public.pneus
  add column if not exists titulo_anuncio text,
  add column if not exists quantidade_por_anuncio integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pneus_quantidade_por_anuncio_check'
  ) then
    alter table public.pneus
      add constraint pneus_quantidade_por_anuncio_check
      check (quantidade_por_anuncio >= 1 and quantidade_por_anuncio <= 20);
  end if;
end;
$$;

update public.pneus
set quantidade_por_anuncio = 1
where quantidade_por_anuncio is null;

alter table public.leads
  add column if not exists titulo_anuncio text,
  add column if not exists preco_anuncio numeric(10,2) not null default 0,
  add column if not exists quantidade_anuncios integer not null default 1,
  add column if not exists quantidade_por_anuncio integer not null default 1,
  add column if not exists quantidade_total_pneus integer not null default 1,
  add column if not exists valor_total numeric(10,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_quantidade_anuncios_positive'
  ) then
    alter table public.leads
      add constraint leads_quantidade_anuncios_positive
      check (quantidade_anuncios >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_quantidade_por_anuncio_check'
  ) then
    alter table public.leads
      add constraint leads_quantidade_por_anuncio_check
      check (quantidade_por_anuncio >= 1 and quantidade_por_anuncio <= 20);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_quantidade_total_pneus_positive'
  ) then
    alter table public.leads
      add constraint leads_quantidade_total_pneus_positive
      check (quantidade_total_pneus >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_preco_anuncio_non_negative'
  ) then
    alter table public.leads
      add constraint leads_preco_anuncio_non_negative
      check (preco_anuncio >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_valor_total_non_negative'
  ) then
    alter table public.leads
      add constraint leads_valor_total_non_negative
      check (valor_total >= 0);
  end if;
end;
$$;

update public.leads
set
  titulo_anuncio = nullif(trim(coalesce(titulo_anuncio, produto_nome)), ''),
  preco_anuncio = round(coalesce(preco_anuncio, produto_preco, 0)::numeric, 2),
  quantidade_por_anuncio = greatest(coalesce(quantidade_por_anuncio, 1), 1),
  quantidade_anuncios = greatest(
    coalesce(quantidade_anuncios, desired_quantity, sold_quantity, 1),
    1
  ),
  quantidade_total_pneus = greatest(
    coalesce(quantidade_total_pneus, sold_quantity, desired_quantity, 1),
    1
  ),
  valor_total = round(
    coalesce(
      valor_total,
      coalesce(preco_anuncio, produto_preco, 0) * greatest(coalesce(quantidade_anuncios, desired_quantity, 1), 1)
    )::numeric,
    2
  )
where true;

drop function if exists public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer);

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
  p_desired_quantity integer default 1,
  p_titulo_anuncio text default null,
  p_preco_anuncio numeric default null,
  p_quantidade_anuncios integer default null,
  p_quantidade_por_anuncio integer default null,
  p_quantidade_total_pneus integer default null,
  p_valor_total numeric default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_lead_id uuid;
  v_final_seller_id uuid := null;
  v_final_source text := 'unknown';
  v_clean_ref text := null;
  v_requested_offer_quantity integer := greatest(coalesce(p_quantidade_anuncios, p_desired_quantity, 1), 1);
  v_quantity_per_offer integer := greatest(coalesce(p_quantidade_por_anuncio, 1), 1);
  v_requested_physical_quantity integer;
  v_offer_price numeric(10,2) := round(coalesce(p_preco_anuncio, p_produto_preco, 0)::numeric, 2);
  v_total_value numeric(10,2);
  v_available_stock integer;
  v_owner_id uuid;
  v_recipients uuid[];
  v_title text := 'Novo cliente interessado';
  v_message text;
  v_product_row public.pneus%rowtype;
  v_listing_title text;
begin
  if p_loja_id is null then
    raise exception 'Loja obrigatoria';
  end if;

  if nullif(trim(coalesce(p_nome_cliente, '')), '') is null then
    raise exception 'Nome do cliente obrigatorio';
  end if;

  if p_produto_id is not null then
    select *
    into v_product_row
    from public.pneus p
    where p.id = p_produto_id
      and p.loja_id = p_loja_id
      and coalesce(p.status, 'ativo') = 'ativo';

    if not found then
      raise exception 'Pneu nao encontrado ou indisponivel';
    end if;

    v_quantity_per_offer := greatest(coalesce(p_quantidade_por_anuncio, v_product_row.quantidade_por_anuncio, 1), 1);
    v_offer_price := round(coalesce(p_preco_anuncio, p_produto_preco, v_product_row.preco, 0)::numeric, 2);
    v_available_stock := coalesce(v_product_row.estoque, 0);
  end if;

  if v_quantity_per_offer > 20 then
    raise exception 'Quantidade por anuncio invalida';
  end if;

  v_requested_physical_quantity := greatest(
    coalesce(p_quantidade_total_pneus, v_requested_offer_quantity * v_quantity_per_offer),
    1
  );
  v_total_value := round(coalesce(p_valor_total, v_offer_price * v_requested_offer_quantity)::numeric, 2);
  v_listing_title := nullif(trim(coalesce(p_titulo_anuncio, v_product_row.titulo_anuncio, p_produto_nome, v_product_row.modelo, '')), '');

  if p_produto_id is not null and coalesce(v_available_stock, 0) < v_requested_physical_quantity then
    raise exception 'Estoque insuficiente para a quantidade desejada';
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
    titulo_anuncio,
    produto_medida,
    produto_preco,
    preco_anuncio,
    origem,
    ref_code,
    attribution_source,
    desired_quantity,
    quantidade_anuncios,
    quantidade_por_anuncio,
    quantidade_total_pneus,
    valor_total,
    status_atendimento,
    last_interaction_at
  )
  values (
    p_loja_id,
    p_loja_id,
    p_produto_id,
    p_produto_id,
    v_final_seller_id,
    trim(p_nome_cliente),
    coalesce(v_listing_title, ''),
    v_listing_title,
    coalesce(p_produto_medida, v_product_row.medida, ''),
    v_offer_price,
    v_offer_price,
    coalesce(p_origem, 'whatsapp'),
    v_clean_ref,
    v_final_source,
    v_requested_physical_quantity,
    v_requested_offer_quantity,
    v_quantity_per_offer,
    v_requested_physical_quantity,
    v_total_value,
    'em_atendimento',
    now()
  )
  returning id into v_lead_id;

  select s.owner_id
  into v_owner_id
  from public.stores s
  where s.id = p_loja_id;

  v_recipients := array_remove(array[v_owner_id, v_final_seller_id], null);
  v_message := format(
    '%s esta aguardando atendimento para %s.',
    trim(p_nome_cliente),
    case
      when v_quantity_per_offer > 1 then format('%s kit(s) de %s pneus', v_requested_offer_quantity, v_quantity_per_offer)
      else format('%s pneu(s)', v_requested_physical_quantity)
    end
  );

  if array_length(v_recipients, 1) is not null then
    perform public.create_notifications_for_users(
      p_loja_id,
      v_recipients,
      'info',
      'new_leads',
      v_title,
      v_message,
      'lead',
      v_lead_id,
      '/dashboard/leads',
      jsonb_build_object(
        'cliente', trim(p_nome_cliente),
        'produto', coalesce(v_listing_title, nullif(trim(coalesce(p_produto_nome, '')), '')),
        'quantidade_anuncios', v_requested_offer_quantity,
        'quantidade_por_anuncio', v_quantity_per_offer,
        'quantidade_total_pneus', v_requested_physical_quantity,
        'valor_total', v_total_value
      ),
      concat('lead-created:', v_lead_id::text)
    );
  end if;

  return v_lead_id;
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
  titulo_anuncio text,
  produto_medida text,
  produto_preco numeric,
  preco_anuncio numeric,
  origem text,
  created_at timestamptz,
  vendedor_nome text,
  vendedor_email text,
  vendedor_ref_code text,
  desired_quantity integer,
  sold_quantity integer,
  quantidade_anuncios integer,
  quantidade_por_anuncio integer,
  quantidade_total_pneus integer,
  valor_total numeric,
  venda_confirmada boolean,
  venda_confirmada_em timestamptz,
  venda_confirmada_por uuid,
  status_atendimento text,
  last_interaction_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
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
      and (m.status is null or m.status in ('active', 'ativo'))
  )
  then
    return;
  end if;

  perform public.expirar_leads_inativos(p_store_id);

  return query
  select
    l.id,
    l.loja_id,
    l.seller_id,
    l.ref_code,
    l.attribution_source,
    l.nome_cliente,
    l.produto_nome,
    l.titulo_anuncio,
    l.produto_medida,
    l.produto_preco,
    l.preco_anuncio,
    l.origem,
    l.created_at,
    sm.nome as vendedor_nome,
    sm.email as vendedor_email,
    sm.ref_code as vendedor_ref_code,
    l.desired_quantity,
    l.sold_quantity,
    l.quantidade_anuncios,
    l.quantidade_por_anuncio,
    l.quantidade_total_pneus,
    l.valor_total,
    l.venda_confirmada,
    l.venda_confirmada_em,
    l.venda_confirmada_por,
    l.status_atendimento,
    l.last_interaction_at
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

create or replace function public.atualizar_status_atendimento_lead(
  p_lead_id uuid,
  p_status_atendimento text,
  p_sold_quantity integer default null,
  p_desired_quantity integer default null,
  p_titulo_anuncio text default null,
  p_preco_anuncio numeric default null,
  p_quantidade_por_anuncio integer default null,
  p_valor_total numeric default null
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
  v_quantity_per_offer integer;
  v_requested_offer_quantity integer;
  v_requested_physical_quantity integer;
  v_current_offer_quantity integer;
  v_current_physical_quantity integer;
  v_delta integer;
  v_updated_pneu_id uuid;
  v_owner_id uuid;
  v_recipients uuid[];
  v_transition_at timestamptz := now();
  v_offer_price numeric(10,2);
  v_total_value numeric(10,2);
  v_summary text;
  v_title_snapshot text;
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

  v_quantity_per_offer := greatest(coalesce(p_quantidade_por_anuncio, v_lead.quantidade_por_anuncio, 1), 1);
  if v_quantity_per_offer > 20 then
    raise exception 'Quantidade por anuncio invalida';
  end if;

  v_offer_price := round(coalesce(p_preco_anuncio, v_lead.preco_anuncio, v_lead.produto_preco, 0)::numeric, 2);
  v_title_snapshot := nullif(trim(coalesce(p_titulo_anuncio, v_lead.titulo_anuncio, v_lead.produto_nome, '')), '');
  v_current_offer_quantity := greatest(
    coalesce(
      v_lead.quantidade_anuncios,
      ceil(greatest(coalesce(v_lead.desired_quantity, 1), 1)::numeric / v_quantity_per_offer)::integer,
      1
    ),
    1
  );
  v_current_physical_quantity := case
    when v_lead.venda_confirmada then greatest(coalesce(v_lead.sold_quantity, v_lead.quantidade_total_pneus, v_lead.desired_quantity, 1), 1)
    else greatest(coalesce(v_lead.quantidade_total_pneus, v_lead.desired_quantity, 1), 1)
  end;

  if v_current_status = 'vendido' and v_status = 'vendido' then
    raise exception 'Reabra a venda antes de alterar a quantidade';
  end if;

  if v_current_status = 'desistencia' and v_status = 'vendido' then
    raise exception 'Reabra o lead antes de confirmar a venda';
  end if;

  v_requested_offer_quantity := greatest(
    coalesce(p_sold_quantity, p_desired_quantity, v_lead.quantidade_anuncios, 1),
    1
  );
  v_requested_physical_quantity := greatest(v_requested_offer_quantity * v_quantity_per_offer, 1);
  v_total_value := round(coalesce(p_valor_total, v_offer_price * v_requested_offer_quantity)::numeric, 2);

  select s.owner_id
  into v_owner_id
  from public.stores s
  where s.id = v_lead.loja_id;

  v_recipients := array_remove(array[v_owner_id, v_lead.seller_id], null);

  if v_status = 'vendido' then
    v_delta := v_requested_physical_quantity - case when v_lead.venda_confirmada then v_current_physical_quantity else 0 end;

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
        titulo_anuncio = v_title_snapshot,
        produto_nome = coalesce(v_title_snapshot, produto_nome),
        produto_preco = v_offer_price,
        preco_anuncio = v_offer_price,
        desired_quantity = v_requested_physical_quantity,
        quantidade_anuncios = v_requested_offer_quantity,
        quantidade_por_anuncio = v_quantity_per_offer,
        quantidade_total_pneus = v_requested_physical_quantity,
        valor_total = v_total_value,
        venda_confirmada = true,
        venda_confirmada_em = case
          when v_current_status = 'vendido' and v_lead.venda_confirmada_em is not null then v_lead.venda_confirmada_em
          else v_transition_at
        end,
        venda_confirmada_por = auth.uid(),
        sold_quantity = v_requested_physical_quantity
    where id = p_lead_id;

    if v_quantity_per_offer > 1 then
      v_summary := format('%s kit(s) com %s pneus', v_requested_offer_quantity, v_requested_physical_quantity);
    else
      v_summary := format('%s pneu(s)', v_requested_physical_quantity);
    end if;

    if v_current_status <> 'vendido' and array_length(v_recipients, 1) is not null then
      perform public.create_notifications_for_users(
        v_lead.loja_id,
        v_recipients,
        'success',
        'sales',
        'Venda finalizada',
        format('Venda de %s confirmada para %s.', v_summary, trim(coalesce(v_lead.nome_cliente, 'Cliente'))),
        'lead',
        p_lead_id,
        '/dashboard/leads',
        jsonb_build_object(
          'cliente', trim(coalesce(v_lead.nome_cliente, '')),
          'produto', coalesce(v_title_snapshot, nullif(trim(coalesce(v_lead.produto_nome, '')), '')),
          'quantidade_anuncios', v_requested_offer_quantity,
          'quantidade_por_anuncio', v_quantity_per_offer,
          'quantidade_total_pneus', v_requested_physical_quantity,
          'valor_total', v_total_value
        ),
        concat('lead-sold:', p_lead_id::text, ':', extract(epoch from v_transition_at)::bigint::text)
      );
    end if;

    return jsonb_build_object(
      'success', true,
      'lead_id', p_lead_id,
      'status_atendimento', 'vendido',
      'venda_confirmada', true,
      'sold_quantity', v_requested_physical_quantity,
      'quantidade_anuncios', v_requested_offer_quantity,
      'quantidade_total_pneus', v_requested_physical_quantity,
      'stock_delta', v_delta
    );
  end if;

  if v_lead.venda_confirmada = true and v_lead.produto_id is not null and v_current_physical_quantity > 0 then
    update public.pneus
    set estoque = coalesce(estoque, 0) + v_current_physical_quantity,
        updated_at = now()
    where id = v_lead.produto_id
      and loja_id = v_lead.loja_id;
  end if;

  update public.leads
  set status_atendimento = v_status,
      last_interaction_at = v_transition_at,
      titulo_anuncio = v_title_snapshot,
      produto_nome = coalesce(v_title_snapshot, produto_nome),
      produto_preco = v_offer_price,
      preco_anuncio = v_offer_price,
      desired_quantity = v_requested_physical_quantity,
      quantidade_anuncios = v_requested_offer_quantity,
      quantidade_por_anuncio = v_quantity_per_offer,
      quantidade_total_pneus = v_requested_physical_quantity,
      valor_total = v_total_value,
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
    'desired_quantity', v_requested_physical_quantity,
    'quantidade_anuncios', v_requested_offer_quantity,
    'quantidade_total_pneus', v_requested_physical_quantity,
    'sold_quantity', null
  );
end;
$$;

alter function public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer, text, numeric, integer, integer, integer, numeric) owner to postgres;
alter function public.get_leads_com_vendedor(uuid) owner to postgres;
alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric) owner to postgres;

grant execute on function public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer, text, numeric, integer, integer, integer, numeric) to anon;
grant execute on function public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer, text, numeric, integer, integer, integer, numeric) to authenticated;
grant execute on function public.get_leads_com_vendedor(uuid) to authenticated;
grant execute on function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric) to authenticated;

notify pgrst, 'reload schema';
