alter table public.leads
  add column if not exists telefone_cliente text,
  add column if not exists observacao_cliente text,
  add column if not exists request_id text;

create unique index if not exists leads_store_request_id_key
  on public.leads (loja_id, request_id)
  where request_id is not null;

create table if not exists public.lead_items (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.pneus(id) on delete set null,
  titulo_anuncio text not null,
  marca text,
  modelo text,
  medida text,
  quantidade integer not null check (quantidade >= 1),
  quantidade_por_anuncio integer not null default 1 check (quantidade_por_anuncio >= 1 and quantidade_por_anuncio <= 20),
  quantidade_total_pneus integer not null check (quantidade_total_pneus >= 1),
  preco_unitario_anuncio numeric(10,2) not null check (preco_unitario_anuncio >= 0),
  valor_total numeric(10,2) not null check (valor_total >= 0),
  created_at timestamptz not null default now(),
  constraint lead_items_total_check check (quantidade_total_pneus = quantidade * quantidade_por_anuncio)
);

create index if not exists lead_items_lead_id_idx on public.lead_items (lead_id);
create index if not exists lead_items_store_id_idx on public.lead_items (store_id);
create index if not exists lead_items_product_id_idx on public.lead_items (product_id);

alter table public.lead_items enable row level security;

drop policy if exists "Store owners can read lead items" on public.lead_items;
create policy "Store owners can read lead items"
on public.lead_items
for select
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = lead_items.store_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists "Store members can read lead items" on public.lead_items;
create policy "Store members can read lead items"
on public.lead_items
for select
to authenticated
using (
  exists (
    select 1
    from public.store_members sm
    where sm.store_id = lead_items.store_id
      and sm.user_id = auth.uid()
      and (sm.status is null or sm.status in ('active', 'ativo'))
  )
);

insert into public.lead_items (
  lead_id,
  store_id,
  product_id,
  titulo_anuncio,
  marca,
  modelo,
  medida,
  quantidade,
  quantidade_por_anuncio,
  quantidade_total_pneus,
  preco_unitario_anuncio,
  valor_total,
  created_at
)
select
  l.id,
  coalesce(l.loja_id, l.store_id),
  coalesce(l.produto_id, l.pneu_id),
  coalesce(nullif(trim(coalesce(l.titulo_anuncio, l.produto_nome, '')), ''), 'Produto sem titulo'),
  p.marca,
  p.modelo,
  nullif(trim(coalesce(l.produto_medida, p.medida, '')), ''),
  greatest(coalesce(l.quantidade_anuncios, ceil(greatest(coalesce(l.desired_quantity, 1), 1)::numeric / greatest(coalesce(l.quantidade_por_anuncio, 1), 1))::integer, 1), 1),
  greatest(coalesce(l.quantidade_por_anuncio, 1), 1),
  greatest(
    coalesce(
      l.quantidade_total_pneus,
      l.sold_quantity,
      l.desired_quantity,
      greatest(coalesce(l.quantidade_anuncios, 1), 1) * greatest(coalesce(l.quantidade_por_anuncio, 1), 1)
    ),
    1
  ),
  round(coalesce(l.preco_anuncio, l.produto_preco, 0)::numeric, 2),
  round(
    coalesce(
      l.valor_total,
      coalesce(l.preco_anuncio, l.produto_preco, 0) * greatest(coalesce(l.quantidade_anuncios, 1), 1)
    )::numeric,
    2
  ),
  coalesce(l.created_at, now())
from public.leads l
left join public.pneus p
  on p.id = coalesce(l.produto_id, l.pneu_id)
where coalesce(l.loja_id, l.store_id) is not null
  and (
    coalesce(l.produto_id, l.pneu_id) is not null
    or nullif(trim(coalesce(l.produto_nome, l.titulo_anuncio, '')), '') is not null
  )
  and not exists (
    select 1
    from public.lead_items li
    where li.lead_id = l.id
  );

drop function if exists public.get_leads_com_vendedor(uuid);

create or replace function public.get_leads_com_vendedor(p_store_id uuid)
returns table(
  id uuid,
  loja_id uuid,
  seller_id uuid,
  ref_code text,
  attribution_source text,
  nome_cliente text,
  telefone_cliente text,
  observacao_cliente text,
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
  last_interaction_at timestamptz,
  item_count integer,
  items jsonb
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
  with item_rows as (
    select
      li.lead_id,
      count(*)::integer as item_count,
      sum(li.quantidade)::integer as total_offer_quantity,
      sum(li.quantidade_total_pneus)::integer as total_physical_quantity,
      round(sum(li.valor_total)::numeric, 2) as total_value,
      jsonb_agg(
        jsonb_build_object(
          'id', li.id,
          'lead_id', li.lead_id,
          'store_id', li.store_id,
          'product_id', li.product_id,
          'titulo_anuncio', li.titulo_anuncio,
          'marca', li.marca,
          'modelo', li.modelo,
          'medida', li.medida,
          'quantidade', li.quantidade,
          'quantidade_por_anuncio', li.quantidade_por_anuncio,
          'quantidade_total_pneus', li.quantidade_total_pneus,
          'preco_unitario_anuncio', li.preco_unitario_anuncio,
          'valor_total', li.valor_total
        )
        order by li.created_at, li.id
      ) as items
    from public.lead_items li
    where li.store_id = p_store_id
    group by li.lead_id
  )
  select
    l.id,
    l.loja_id,
    l.seller_id,
    l.ref_code,
    l.attribution_source,
    l.nome_cliente,
    l.telefone_cliente,
    l.observacao_cliente,
    case
      when coalesce(ir.item_count, 0) > 1 then format('%s itens no orcamento', ir.item_count)
      else coalesce(l.produto_nome, l.titulo_anuncio, first_item.titulo_anuncio, 'Produto nao identificado')
    end as produto_nome,
    coalesce(l.titulo_anuncio, first_item.titulo_anuncio, l.produto_nome) as titulo_anuncio,
    coalesce(l.produto_medida, first_item.medida, '') as produto_medida,
    case
      when coalesce(ir.item_count, 0) > 1 then round(coalesce(ir.total_value, l.valor_total, 0)::numeric, 2)
      else coalesce(first_item.preco_unitario_anuncio, l.preco_anuncio, l.produto_preco, 0)
    end as produto_preco,
    case
      when coalesce(ir.item_count, 0) > 1 then round(coalesce(ir.total_value, l.valor_total, 0)::numeric, 2)
      else coalesce(first_item.preco_unitario_anuncio, l.preco_anuncio, l.produto_preco, 0)
    end as preco_anuncio,
    l.origem,
    l.created_at,
    sm.nome as vendedor_nome,
    sm.email as vendedor_email,
    sm.ref_code as vendedor_ref_code,
    coalesce(ir.total_physical_quantity, l.desired_quantity, 1) as desired_quantity,
    coalesce(
      case when l.venda_confirmada then ir.total_physical_quantity end,
      l.sold_quantity
    ) as sold_quantity,
    coalesce(ir.total_offer_quantity, l.quantidade_anuncios, 1) as quantidade_anuncios,
    case
      when coalesce(ir.item_count, 0) = 1 then coalesce(first_item.quantidade_por_anuncio, l.quantidade_por_anuncio, 1)
      else 1
    end as quantidade_por_anuncio,
    coalesce(ir.total_physical_quantity, l.quantidade_total_pneus, l.desired_quantity, 1) as quantidade_total_pneus,
    round(coalesce(ir.total_value, l.valor_total, l.preco_anuncio, l.produto_preco, 0)::numeric, 2) as valor_total,
    l.venda_confirmada,
    l.venda_confirmada_em,
    l.venda_confirmada_por,
    l.status_atendimento,
    l.last_interaction_at,
    greatest(coalesce(ir.item_count, 0), case when first_item.titulo_anuncio is not null then 1 else 0 end) as item_count,
    coalesce(
      ir.items,
      case
        when coalesce(l.produto_nome, l.titulo_anuncio) is not null then jsonb_build_array(
          jsonb_build_object(
            'lead_id', l.id,
            'store_id', l.loja_id,
            'product_id', coalesce(l.produto_id, l.pneu_id),
            'titulo_anuncio', coalesce(l.titulo_anuncio, l.produto_nome),
            'medida', l.produto_medida,
            'quantidade', greatest(coalesce(l.quantidade_anuncios, 1), 1),
            'quantidade_por_anuncio', greatest(coalesce(l.quantidade_por_anuncio, 1), 1),
            'quantidade_total_pneus', greatest(coalesce(l.quantidade_total_pneus, l.desired_quantity, 1), 1),
            'preco_unitario_anuncio', round(coalesce(l.preco_anuncio, l.produto_preco, 0)::numeric, 2),
            'valor_total', round(coalesce(l.valor_total, coalesce(l.preco_anuncio, l.produto_preco, 0))::numeric, 2)
          )
        )
        else '[]'::jsonb
      end
    ) as items
  from public.leads l
  left join item_rows ir
    on ir.lead_id = l.id
  left join lateral (
    select
      li.titulo_anuncio,
      li.medida,
      li.quantidade_por_anuncio,
      li.preco_unitario_anuncio
    from public.lead_items li
    where li.lead_id = l.id
    order by li.created_at, li.id
    limit 1
  ) first_item on true
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

create or replace function public.registrar_lead_com_itens(
  p_loja_id uuid,
  p_nome_cliente text,
  p_telefone_cliente text default null,
  p_observacao_cliente text default null,
  p_items jsonb default '[]'::jsonb,
  p_origem text default 'whatsapp',
  p_seller_id uuid default null,
  p_ref_code text default null,
  p_attribution_source text default 'product',
  p_request_id text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_lead_id uuid;
  v_final_seller_id uuid := null;
  v_final_source text := 'unknown';
  v_clean_ref text := null;
  v_owner_id uuid;
  v_recipients uuid[];
  v_total_items integer := 0;
  v_total_offer_quantity integer := 0;
  v_total_physical_quantity integer := 0;
  v_total_value numeric(10,2) := 0;
  v_first_title text := null;
  v_first_measure text := null;
  v_first_price numeric(10,2) := 0;
  v_first_product_id uuid := null;
  v_item jsonb;
  v_product public.pneus%rowtype;
  v_offer_quantity integer;
  v_quantity_per_offer integer;
  v_physical_quantity integer;
  v_offer_price numeric(10,2);
  v_item_total numeric(10,2);
  v_title text;
  v_items_response jsonb := '[]'::jsonb;
begin
  if p_loja_id is null then
    raise exception 'Loja obrigatoria';
  end if;

  if nullif(trim(coalesce(p_nome_cliente, '')), '') is null then
    raise exception 'Nome do cliente obrigatorio';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  if p_request_id is not null and nullif(trim(p_request_id), '') is not null then
    select l.id
    into v_lead_id
    from public.leads l
    where l.loja_id = p_loja_id
      and l.request_id = trim(p_request_id)
    limit 1;

    if v_lead_id is not null then
      return (
        select jsonb_build_object(
          'lead_id', lead.id,
          'item_count', lead.item_count,
          'valor_total', lead.valor_total,
          'quantidade_total_pneus', lead.quantidade_total_pneus,
          'items', lead.items
        )
        from public.get_leads_com_vendedor(p_loja_id) lead
        where lead.id = v_lead_id
        limit 1
      );
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

  for v_item in
    select jsonb_build_object(
      'product_id', product_id::text,
      'quantidade', sum(quantidade)
    )
    from jsonb_to_recordset(p_items) as raw_item(product_id uuid, quantidade integer)
    group by product_id
  loop
    select *
    into v_product
    from public.pneus p
    where p.id = nullif(v_item->>'product_id', '')::uuid
      and p.loja_id = p_loja_id
      and coalesce(p.status, 'ativo') = 'ativo'
    for update;

    if not found then
      raise exception 'Pneu nao encontrado ou indisponivel';
    end if;

    v_offer_quantity := greatest(coalesce((v_item->>'quantidade')::integer, 1), 1);
    v_quantity_per_offer := greatest(coalesce(v_product.quantidade_por_anuncio, 1), 1);
    v_physical_quantity := v_offer_quantity * v_quantity_per_offer;
    v_offer_price := round(coalesce(v_product.preco, 0)::numeric, 2);
    v_item_total := round((v_offer_price * v_offer_quantity)::numeric, 2);
    v_title := coalesce(nullif(trim(coalesce(v_product.titulo_anuncio, '')), ''), nullif(trim(v_product.modelo), ''), 'Produto sem titulo');

    if coalesce(v_product.estoque, 0) < v_physical_quantity then
      raise exception 'Estoque insuficiente para a quantidade desejada';
    end if;

    if v_first_title is null then
      v_first_product_id := v_product.id;
      v_first_title := v_title;
      v_first_measure := v_product.medida;
      v_first_price := v_offer_price;
    end if;

    v_total_items := v_total_items + 1;
    v_total_offer_quantity := v_total_offer_quantity + v_offer_quantity;
    v_total_physical_quantity := v_total_physical_quantity + v_physical_quantity;
    v_total_value := round((v_total_value + v_item_total)::numeric, 2);
    v_items_response := v_items_response || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'titulo_anuncio', v_title,
        'marca', v_product.marca,
        'modelo', v_product.modelo,
        'medida', v_product.medida,
        'quantidade', v_offer_quantity,
        'quantidade_por_anuncio', v_quantity_per_offer,
        'quantidade_total_pneus', v_physical_quantity,
        'preco_unitario_anuncio', v_offer_price,
        'valor_total', v_item_total
      )
    );

    if v_final_seller_id is null and v_product.created_by is not null then
      v_final_seller_id := v_product.created_by;
      v_final_source := coalesce(nullif(trim(p_attribution_source), ''), 'product');
    end if;
  end loop;

  insert into public.leads (
    loja_id,
    store_id,
    produto_id,
    pneu_id,
    seller_id,
    nome_cliente,
    telefone_cliente,
    observacao_cliente,
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
    last_interaction_at,
    request_id
  )
  values (
    p_loja_id,
    p_loja_id,
    case when v_total_items = 1 then v_first_product_id else null end,
    case when v_total_items = 1 then v_first_product_id else null end,
    v_final_seller_id,
    trim(p_nome_cliente),
    nullif(trim(coalesce(p_telefone_cliente, '')), ''),
    nullif(trim(coalesce(p_observacao_cliente, '')), ''),
    case
      when v_total_items > 1 then format('%s itens no orcamento', v_total_items)
      else coalesce(v_first_title, 'Produto nao identificado')
    end,
    v_first_title,
    coalesce(v_first_measure, ''),
    case when v_total_items > 1 then v_total_value else v_first_price end,
    case when v_total_items > 1 then v_total_value else v_first_price end,
    coalesce(p_origem, 'whatsapp'),
    v_clean_ref,
    coalesce(v_final_source, 'unknown'),
    v_total_physical_quantity,
    v_total_offer_quantity,
    case when v_total_items = 1 then coalesce((v_items_response->0->>'quantidade_por_anuncio')::integer, 1) else 1 end,
    v_total_physical_quantity,
    v_total_value,
    'em_atendimento',
    now(),
    nullif(trim(coalesce(p_request_id, '')), '')
  )
  returning id into v_lead_id;

  insert into public.lead_items (
    lead_id,
    store_id,
    product_id,
    titulo_anuncio,
    marca,
    modelo,
    medida,
    quantidade,
    quantidade_por_anuncio,
    quantidade_total_pneus,
    preco_unitario_anuncio,
    valor_total
  )
  select
    v_lead_id,
    p_loja_id,
    nullif(item->>'product_id', '')::uuid,
    item->>'titulo_anuncio',
    item->>'marca',
    item->>'modelo',
    item->>'medida',
    greatest(coalesce((item->>'quantidade')::integer, 1), 1),
    greatest(coalesce((item->>'quantidade_por_anuncio')::integer, 1), 1),
    greatest(coalesce((item->>'quantidade_total_pneus')::integer, 1), 1),
    round(coalesce((item->>'preco_unitario_anuncio')::numeric, 0)::numeric, 2),
    round(coalesce((item->>'valor_total')::numeric, 0)::numeric, 2)
  from jsonb_array_elements(v_items_response) item;

  select s.owner_id
  into v_owner_id
  from public.stores s
  where s.id = p_loja_id;

  v_recipients := array_remove(array[v_owner_id, v_final_seller_id], null);

  if array_length(v_recipients, 1) is not null then
    perform public.create_notifications_for_users(
      p_loja_id,
      v_recipients,
      'info',
      'new_leads',
      'Novo orcamento recebido',
      format('%s solicitou %s item(ns), totalizando %s pneu(s).', trim(p_nome_cliente), v_total_items, v_total_physical_quantity),
      'lead',
      v_lead_id,
      '/dashboard/leads',
      jsonb_build_object(
        'cliente', trim(p_nome_cliente),
        'item_count', v_total_items,
        'quantidade_anuncios', v_total_offer_quantity,
        'quantidade_total_pneus', v_total_physical_quantity,
        'valor_total', v_total_value
      ),
      concat('lead-cart-created:', v_lead_id::text)
    );
  end if;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'item_count', v_total_items,
    'valor_total', v_total_value,
    'quantidade_total_pneus', v_total_physical_quantity,
    'items', v_items_response
  );
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

alter function public.get_leads_com_vendedor(uuid) owner to postgres;
alter function public.registrar_lead_com_itens(uuid, text, text, text, jsonb, text, uuid, text, text, text) owner to postgres;
alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric) owner to postgres;

grant execute on function public.get_leads_com_vendedor(uuid) to authenticated;
grant execute on function public.registrar_lead_com_itens(uuid, text, text, text, jsonb, text, uuid, text, text, text) to anon;
grant execute on function public.registrar_lead_com_itens(uuid, text, text, text, jsonb, text, uuid, text, text, text) to authenticated;
grant execute on function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric) to authenticated;

notify pgrst, 'reload schema';
