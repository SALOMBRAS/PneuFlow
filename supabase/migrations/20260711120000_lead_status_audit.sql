create table public.lead_status_audit (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  changed_by_user_id uuid not null,
  changed_by_member_id uuid references public.store_members(id) on delete set null,
  changed_by_name text,
  changed_by_email text,
  previous_status text,
  new_status text not null,
  action text not null,
  sold_quantity integer,
  desired_quantity integer,
  valor_total numeric,
  telefone_cliente text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint lead_status_audit_previous_status_check check (
    previous_status is null or previous_status = any (array['em_atendimento', 'vendido', 'desistencia'])
  ),
  constraint lead_status_audit_new_status_check check (
    new_status = any (array['em_atendimento', 'vendido', 'desistencia'])
  ),
  constraint lead_status_audit_action_check check (
    action = any (array['sold', 'abandoned', 'reopened_sale', 'reopened_lead', 'in_progress'])
  )
);

create index lead_status_audit_lead_id_idx on public.lead_status_audit (lead_id, created_at desc);
create index lead_status_audit_store_id_idx on public.lead_status_audit (store_id, created_at desc);
create index lead_status_audit_created_at_idx on public.lead_status_audit (created_at desc);
create index lead_status_audit_changed_by_user_id_idx on public.lead_status_audit (changed_by_user_id, created_at desc);

alter table public.lead_status_audit enable row level security;

create function public.can_read_lead_status_audit(p_lead_id uuid, p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    exists (
      select 1
      from public.stores s
      where s.id = p_store_id
        and s.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.leads l
      join public.store_members sm
        on sm.store_id = l.loja_id
       and sm.user_id = auth.uid()
       and (sm.status is null or sm.status in ('active', 'ativo'))
      where l.id = p_lead_id
        and l.loja_id = p_store_id
        and (
          l.seller_id = sm.user_id
          or (l.ref_code is not null and l.ref_code = sm.ref_code)
        )
    );
$$;

revoke all on function public.can_read_lead_status_audit(uuid, uuid) from public, anon;
grant execute on function public.can_read_lead_status_audit(uuid, uuid) to authenticated;

create policy "Authorized users can read lead status audit"
on public.lead_status_audit for select to authenticated
using (public.can_read_lead_status_audit(lead_id, store_id));

grant select on table public.lead_status_audit to authenticated;
grant all on table public.lead_status_audit to service_role;
revoke insert, update, delete on table public.lead_status_audit from authenticated;

alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text)
  rename to atualizar_status_atendimento_lead_core_20260711;

revoke all on function public.atualizar_status_atendimento_lead_core_20260711(uuid, text, integer, integer, text, numeric, integer, numeric, text)
  from public, anon, authenticated;

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
  v_actor_user_id uuid := auth.uid();
  v_actor_member_id uuid;
  v_actor_name text;
  v_actor_email text;
  v_auth_name text;
  v_auth_email text;
  v_lead public.leads%rowtype;
  v_updated_lead public.leads%rowtype;
  v_previous_status text;
  v_new_status text := lower(trim(coalesce(p_status_atendimento, '')));
  v_action text;
  v_result jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'Usuario autenticado nao encontrado';
  end if;

  select * into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead nao encontrado';
  end if;

  v_previous_status := case
    when v_lead.status_atendimento in ('em_atendimento', 'vendido', 'desistencia') then v_lead.status_atendimento
    when v_lead.venda_confirmada = true then 'vendido'
    else 'em_atendimento'
  end;

  v_result := public.atualizar_status_atendimento_lead_core_20260711(
    p_lead_id,
    p_status_atendimento,
    p_sold_quantity,
    p_desired_quantity,
    p_titulo_anuncio,
    p_preco_anuncio,
    p_quantidade_por_anuncio,
    p_valor_total,
    p_telefone_cliente
  );

  if v_previous_status = v_new_status then
    return v_result || jsonb_build_object('audit_event_created', false);
  end if;

  select * into strict v_updated_lead
  from public.leads
  where id = p_lead_id;

  select sm.id, nullif(trim(sm.nome), ''), nullif(trim(sm.email), '')
  into v_actor_member_id, v_actor_name, v_actor_email
  from public.store_members sm
  where sm.store_id = v_lead.loja_id
    and sm.user_id = v_actor_user_id
  order by
    case when sm.status in ('active', 'ativo') then 0 else 1 end,
    case when sm.role = 'owner' then 0 else 1 end,
    sm.created_at
  limit 1;

  select
    nullif(trim(u.email), ''),
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')), '')
  into v_auth_email, v_auth_name
  from auth.users u
  where u.id = v_actor_user_id;

  v_actor_name := coalesce(v_actor_name, v_auth_name);
  v_actor_email := coalesce(v_actor_email, v_auth_email);

  v_action := case
    when v_new_status = 'vendido' then 'sold'
    when v_new_status = 'desistencia' then 'abandoned'
    when v_previous_status = 'vendido' and v_new_status = 'em_atendimento' then 'reopened_sale'
    when v_previous_status = 'desistencia' and v_new_status = 'em_atendimento' then 'reopened_lead'
    else 'in_progress'
  end;

  insert into public.lead_status_audit (
    lead_id, store_id, changed_by_user_id, changed_by_member_id,
    changed_by_name, changed_by_email, previous_status, new_status,
    action, sold_quantity, desired_quantity, valor_total,
    telefone_cliente, metadata
  ) values (
    p_lead_id, v_lead.loja_id, v_actor_user_id, v_actor_member_id,
    v_actor_name, v_actor_email, v_previous_status, v_new_status,
    v_action, v_updated_lead.sold_quantity, v_updated_lead.desired_quantity,
    v_updated_lead.valor_total, v_updated_lead.telefone_cliente,
    jsonb_build_object('source', 'atualizar_status_atendimento_lead')
  );

  return v_result || jsonb_build_object('audit_event_created', true);
end;
$$;

alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text)
  owner to postgres;

grant execute on function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text)
  to authenticated;

notify pgrst, 'reload schema';
