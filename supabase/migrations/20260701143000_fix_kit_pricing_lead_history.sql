update public.lead_items
set quantidade_total_pneus = greatest(quantidade, 1) * greatest(quantidade_por_anuncio, 1)
where quantidade_total_pneus <> greatest(quantidade, 1) * greatest(quantidade_por_anuncio, 1);

update public.lead_items
set valor_total = round((preco_unitario_anuncio * greatest(quantidade, 1))::numeric, 2)
where coalesce(valor_total, 0) = 0
  and coalesce(preco_unitario_anuncio, 0) > 0;

with item_rollup as (
  select
    li.lead_id,
    count(*)::integer as item_count,
    sum(greatest(li.quantidade, 1))::integer as total_offer_quantity,
    sum(greatest(li.quantidade_total_pneus, 1))::integer as total_physical_quantity,
    round(sum(li.valor_total)::numeric, 2) as total_value
  from public.lead_items li
  group by li.lead_id
),
first_item as (
  select distinct on (li.lead_id)
    li.lead_id,
    li.titulo_anuncio,
    li.medida,
    greatest(li.quantidade_por_anuncio, 1) as quantidade_por_anuncio,
    round(li.preco_unitario_anuncio::numeric, 2) as preco_unitario_anuncio
  from public.lead_items li
  order by li.lead_id, li.created_at, li.id
)
update public.leads l
set titulo_anuncio = coalesce(fi.titulo_anuncio, l.titulo_anuncio),
    produto_nome = case
      when ir.item_count > 1 then format('%s itens no orcamento', ir.item_count)
      else coalesce(fi.titulo_anuncio, l.produto_nome)
    end,
    produto_medida = coalesce(fi.medida, l.produto_medida),
    produto_preco = case
      when ir.item_count = 1 and coalesce(fi.preco_unitario_anuncio, 0) > 0
        then fi.preco_unitario_anuncio
      when ir.item_count > 1 and coalesce(l.produto_preco, 0) = 0 and ir.total_value > 0
        then ir.total_value
      else l.produto_preco
    end,
    preco_anuncio = case
      when ir.item_count = 1 and coalesce(fi.preco_unitario_anuncio, 0) > 0
        then fi.preco_unitario_anuncio
      when ir.item_count > 1 and coalesce(l.preco_anuncio, 0) = 0 and ir.total_value > 0
        then ir.total_value
      else l.preco_anuncio
    end,
    quantidade_anuncios = ir.total_offer_quantity,
    quantidade_por_anuncio = case
      when ir.item_count = 1 then fi.quantidade_por_anuncio
      else coalesce(l.quantidade_por_anuncio, 1)
    end,
    quantidade_total_pneus = ir.total_physical_quantity,
    desired_quantity = case
      when coalesce(l.desired_quantity, 0) < 1 then ir.total_physical_quantity
      else l.desired_quantity
    end,
    sold_quantity = case
      when l.venda_confirmada = true and coalesce(l.sold_quantity, 0) < 1 then ir.total_physical_quantity
      else l.sold_quantity
    end,
    valor_total = case
      when coalesce(l.valor_total, 0) = 0 and ir.total_value > 0
        then ir.total_value
      else l.valor_total
    end
from item_rollup ir
left join first_item fi
  on fi.lead_id = ir.lead_id
where l.id = ir.lead_id;

with legacy_fix as (
  select
    l.id,
    greatest(coalesce(l.quantidade_por_anuncio, 1), 1) as quantity_per_offer,
    greatest(
      coalesce(
        case when l.venda_confirmada = true then l.sold_quantity end,
        l.quantidade_total_pneus,
        l.desired_quantity,
        1
      ),
      1
    ) as physical_quantity,
    greatest(
      ceil(
        greatest(
          coalesce(
            case when l.venda_confirmada = true then l.sold_quantity end,
            l.quantidade_total_pneus,
            l.desired_quantity,
            1
          ),
          1
        )::numeric / greatest(coalesce(l.quantidade_por_anuncio, 1), 1)
      )::integer,
      1
    ) as offer_quantity,
    round(
      (
        coalesce(nullif(l.preco_anuncio, 0), nullif(l.produto_preco, 0))
        * greatest(
            ceil(
              greatest(
                coalesce(
                  case when l.venda_confirmada = true then l.sold_quantity end,
                  l.quantidade_total_pneus,
                  l.desired_quantity,
                  1
                ),
                1
              )::numeric / greatest(coalesce(l.quantidade_por_anuncio, 1), 1)
            )::integer,
            1
          )
      )::numeric,
      2
    ) as recovered_total_value
  from public.leads l
  where greatest(coalesce(l.quantidade_por_anuncio, 1), 1) > 1
    and not exists (
      select 1
      from public.lead_items li
      where li.lead_id = l.id
    )
)
update public.leads l
set quantidade_anuncios = lf.offer_quantity,
    quantidade_total_pneus = lf.physical_quantity,
    desired_quantity = case
      when coalesce(l.desired_quantity, 0) < 1 then lf.physical_quantity
      else l.desired_quantity
    end,
    sold_quantity = case
      when l.venda_confirmada = true and coalesce(l.sold_quantity, 0) < 1 then lf.physical_quantity
      else l.sold_quantity
    end,
    valor_total = case
      when coalesce(l.valor_total, 0) = 0 and lf.recovered_total_value > 0
        then lf.recovered_total_value
      else l.valor_total
    end
from legacy_fix lf
where l.id = lf.id
  and (
    l.quantidade_anuncios is null
    or l.quantidade_anuncios = l.quantidade_total_pneus
    or l.quantidade_anuncios = l.desired_quantity
    or coalesce(l.valor_total, 0) = 0
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
      when coalesce(ir.item_count, 0) > 1 then round(coalesce(ir.total_value, l.valor_total)::numeric, 2)
      else coalesce(first_item.preco_unitario_anuncio, l.preco_anuncio, l.produto_preco)
    end as produto_preco,
    case
      when coalesce(ir.item_count, 0) > 1 then round(coalesce(ir.total_value, l.valor_total)::numeric, 2)
      else coalesce(first_item.preco_unitario_anuncio, l.preco_anuncio, l.produto_preco)
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
    case
      when coalesce(ir.item_count, 0) > 0 then round(coalesce(ir.total_value, l.valor_total)::numeric, 2)
      when coalesce(l.valor_total, 0) > 0 then round(l.valor_total::numeric, 2)
      when coalesce(l.preco_anuncio, l.produto_preco, 0) > 0 then round((coalesce(l.preco_anuncio, l.produto_preco) * greatest(coalesce(l.quantidade_anuncios, ceil(greatest(coalesce(l.quantidade_total_pneus, l.desired_quantity, 1), 1)::numeric / greatest(coalesce(l.quantidade_por_anuncio, 1), 1))::integer, 1), 1))::numeric, 2)
      else null
    end as valor_total,
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
            'preco_unitario_anuncio', coalesce(l.preco_anuncio, l.produto_preco),
            'valor_total', case
              when coalesce(l.valor_total, 0) > 0 then round(l.valor_total::numeric, 2)
              when coalesce(l.preco_anuncio, l.produto_preco, 0) > 0 then round((coalesce(l.preco_anuncio, l.produto_preco) * greatest(coalesce(l.quantidade_anuncios, ceil(greatest(coalesce(l.quantidade_total_pneus, l.desired_quantity, 1), 1)::numeric / greatest(coalesce(l.quantidade_por_anuncio, 1), 1))::integer, 1), 1))::numeric, 2)
              else null
            end
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

alter function public.get_leads_com_vendedor(uuid) owner to postgres;

grant execute on function public.get_leads_com_vendedor(uuid) to authenticated;

notify pgrst, 'reload schema';
