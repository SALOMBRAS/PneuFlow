create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('info', 'success', 'warning', 'error')),
  category text not null,
  title text not null,
  message text not null,
  entity_type text null,
  entity_id uuid null,
  action_path text null,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  popup_enabled boolean not null default true,
  category_preferences jsonb not null default '{
    "new_leads": true,
    "sales": true,
    "low_stock": true,
    "out_of_stock": true,
    "operation_errors": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create index if not exists idx_notifications_recipient_created_at
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists idx_notifications_store_created_at
  on public.notifications (store_id, created_at desc);

create index if not exists idx_notifications_recipient_read_at
  on public.notifications (recipient_user_id, read_at);

create unique index if not exists idx_notifications_recipient_dedupe
  on public.notifications (recipient_user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.is_store_notification_recipient(
  p_store_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and s.owner_id = p_user_id
  )
  or exists (
    select 1
    from public.store_members sm
    where sm.store_id = p_store_id
      and sm.user_id = p_user_id
      and sm.status = 'active'
  );
$$;

create or replace function public.is_notification_category_enabled(
  p_store_id uuid,
  p_user_id uuid,
  p_category text
) returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_preferences jsonb;
  v_key text := lower(trim(coalesce(p_category, '')));
begin
  if v_key = '' then
    return true;
  end if;

  select np.category_preferences
  into v_preferences
  from public.notification_preferences np
  where np.store_id = p_store_id
    and np.user_id = p_user_id;

  if v_preferences is null then
    return true;
  end if;

  if not (v_preferences ? v_key) then
    return true;
  end if;

  return coalesce((v_preferences ->> v_key)::boolean, true);
end;
$$;

create or replace function public.create_notifications_for_users(
  p_store_id uuid,
  p_recipient_user_ids uuid[],
  p_type text,
  p_category text,
  p_title text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_path text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_key text default null
) returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_inserted_count integer := 0;
begin
  if p_store_id is null then
    raise exception 'Loja obrigatoria';
  end if;

  if p_recipient_user_ids is null or cardinality(p_recipient_user_ids) = 0 then
    return 0;
  end if;

  if p_type not in ('info', 'success', 'warning', 'error') then
    raise exception 'Tipo de notificacao invalido';
  end if;

  insert into public.notifications (
    store_id,
    recipient_user_id,
    type,
    category,
    title,
    message,
    entity_type,
    entity_id,
    action_path,
    metadata,
    dedupe_key
  )
  select
    p_store_id,
    recipients.user_id,
    p_type,
    lower(trim(coalesce(p_category, 'geral'))),
    left(trim(coalesce(p_title, 'Notificacao')), 140),
    left(trim(coalesce(p_message, '')), 600),
    nullif(trim(coalesce(p_entity_type, '')), ''),
    p_entity_id,
    nullif(trim(coalesce(p_action_path, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    case
      when nullif(trim(coalesce(p_dedupe_key, '')), '') is null then null
      else concat(trim(p_dedupe_key), ':', recipients.user_id::text)
    end
  from (
    select distinct unnest(p_recipient_user_ids) as user_id
  ) as recipients
  where recipients.user_id is not null
    and public.is_store_notification_recipient(p_store_id, recipients.user_id)
    and public.is_notification_category_enabled(
      p_store_id,
      recipients.user_id,
      lower(trim(coalesce(p_category, 'geral')))
    )
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;

create or replace function public.create_notification_for_current_user(
  p_store_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_path text default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.notifications
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_notification public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio';
  end if;

  if not public.is_store_notification_recipient(p_store_id, auth.uid()) then
    raise exception 'Sem permissao para criar notificacao nesta loja';
  end if;

  if not public.is_notification_category_enabled(
    p_store_id,
    auth.uid(),
    lower(trim(coalesce(p_category, 'geral')))
  ) then
    return null;
  end if;

  insert into public.notifications (
    store_id,
    recipient_user_id,
    type,
    category,
    title,
    message,
    entity_type,
    entity_id,
    action_path,
    metadata
  )
  values (
    p_store_id,
    auth.uid(),
    p_type,
    lower(trim(coalesce(p_category, 'geral'))),
    left(trim(coalesce(p_title, 'Notificacao')), 140),
    left(trim(coalesce(p_message, '')), 600),
    nullif(trim(coalesce(p_entity_type, '')), ''),
    p_entity_id,
    nullif(trim(coalesce(p_action_path, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_notification;

  return v_notification;
end;
$$;

create or replace function public.mark_all_notifications_read(
  p_store_id uuid
) returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_updated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio';
  end if;

  update public.notifications
  set read_at = now()
  where recipient_user_id = auth.uid()
    and store_id = p_store_id
    and read_at is null;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

create or replace function public.upsert_notification_preference(
  p_store_id uuid,
  p_popup_enabled boolean,
  p_category_preferences jsonb default null
) returns public.notification_preferences
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_row public.notification_preferences;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio';
  end if;

  if not public.is_store_notification_recipient(p_store_id, auth.uid()) then
    raise exception 'Sem permissao para alterar preferencias nesta loja';
  end if;

  insert into public.notification_preferences (
    user_id,
    store_id,
    popup_enabled,
    category_preferences
  )
  values (
    auth.uid(),
    p_store_id,
    coalesce(p_popup_enabled, true),
    coalesce(
      p_category_preferences,
      '{
        "new_leads": true,
        "sales": true,
        "low_stock": true,
        "out_of_stock": true,
        "operation_errors": true
      }'::jsonb
    )
  )
  on conflict (user_id, store_id)
  do update set
    popup_enabled = excluded.popup_enabled,
    category_preferences = coalesce(excluded.category_preferences, public.notification_preferences.category_preferences),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

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
set search_path to 'public', 'pg_temp'
as $$
declare
  v_lead_id uuid;
  v_final_seller_id uuid := null;
  v_final_source text := 'unknown';
  v_clean_ref text := null;
  v_desired_quantity integer := greatest(coalesce(p_desired_quantity, 1), 1);
  v_available_stock integer;
  v_owner_id uuid;
  v_recipients uuid[];
  v_title text := 'Novo cliente interessado';
  v_message text;
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
    desired_quantity,
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
    coalesce(p_produto_nome, ''),
    coalesce(p_produto_medida, ''),
    coalesce(p_produto_preco, 0),
    coalesce(p_origem, 'whatsapp'),
    v_clean_ref,
    v_final_source,
    v_desired_quantity,
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
    '%s esta aguardando atendimento%s.',
    trim(p_nome_cliente),
    case
      when nullif(trim(coalesce(p_produto_nome, '')), '') is null then ''
      else format(' para %s', trim(p_produto_nome))
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
        'produto', coalesce(nullif(trim(coalesce(p_produto_nome, '')), ''), null),
        'quantidade', v_desired_quantity
      ),
      concat('lead-created:', v_lead_id::text)
    );
  end if;

  return v_lead_id;
end;
$$;

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
  v_product_label text;
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
        last_interaction_at = now(),
        desired_quantity = v_desired_quantity,
        venda_confirmada = true,
        venda_confirmada_em = case
          when v_current_status = 'vendido' and v_lead.venda_confirmada_em is not null then v_lead.venda_confirmada_em
          else now()
        end,
        venda_confirmada_por = auth.uid(),
        sold_quantity = v_requested_quantity
    where id = p_lead_id;

    if v_current_status <> 'vendido' then
      select s.owner_id
      into v_owner_id
      from public.stores s
      where s.id = v_lead.loja_id;

      v_recipients := array_remove(array[v_owner_id, v_lead.seller_id], null);
      v_product_label := coalesce(nullif(trim(coalesce(v_lead.produto_nome, '')), ''), 'pneu');

      if array_length(v_recipients, 1) is not null then
        perform public.create_notifications_for_users(
          v_lead.loja_id,
          v_recipients,
          'success',
          'sales',
          'Venda finalizada',
          format('Venda de %s pneu(s) confirmada para %s.', v_requested_quantity, trim(coalesce(v_lead.nome_cliente, 'Cliente'))),
          'lead',
          v_lead.id,
          '/dashboard/leads',
          jsonb_build_object(
            'cliente', trim(coalesce(v_lead.nome_cliente, 'Cliente')),
            'produto', v_product_label,
            'quantidade', v_requested_quantity
          ),
          concat('sale-completed:', v_lead.id::text)
        );
      end if;
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
      last_interaction_at = now(),
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

alter function public.is_store_notification_recipient(uuid, uuid) owner to postgres;
alter function public.is_notification_category_enabled(uuid, uuid, text) owner to postgres;
alter function public.create_notifications_for_users(uuid, uuid[], text, text, text, text, text, uuid, text, jsonb, text) owner to postgres;
alter function public.create_notification_for_current_user(uuid, text, text, text, text, text, uuid, text, jsonb) owner to postgres;
alter function public.mark_all_notifications_read(uuid) owner to postgres;
alter function public.upsert_notification_preference(uuid, boolean, jsonb) owner to postgres;
alter function public.registrar_lead(uuid, uuid, text, text, text, numeric, text, uuid, text, text, integer) owner to postgres;
alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer) owner to postgres;

revoke all on function public.is_store_notification_recipient(uuid, uuid) from public;
revoke all on function public.is_notification_category_enabled(uuid, uuid, text) from public;
revoke all on function public.create_notifications_for_users(uuid, uuid[], text, text, text, text, text, uuid, text, jsonb, text) from public;
revoke all on function public.create_notification_for_current_user(uuid, text, text, text, text, text, uuid, text, jsonb) from public;
revoke all on function public.mark_all_notifications_read(uuid) from public;
revoke all on function public.upsert_notification_preference(uuid, boolean, jsonb) from public;
grant select, update on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant execute on function public.create_notification_for_current_user(uuid, text, text, text, text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.mark_all_notifications_read(uuid) to authenticated;
grant execute on function public.upsert_notification_preference(uuid, boolean, jsonb) to authenticated;

alter publication supabase_realtime add table public.notifications;

notify pgrst, 'reload schema';
