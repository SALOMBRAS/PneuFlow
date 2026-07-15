/*
  Migration: manual_monthly_checkout
  Created: 2026-07-14
  Purpose: Protect store billing fields and add idempotent manual Checkout Pro records.
  Affects: public.stores grants/trigger, public.payment_orders, public.payment_webhook_events,
           public.apply_manual_payment_approval(uuid, text, timestamptz)
  Risk: Existing client writes to protected store billing columns are intentionally rejected.
  Rollback: Create a new migration restoring only the required grants or dropping the new objects
            after confirming no payment data must be retained.
*/

-- Client-side store edits currently use only the profile, storefront and branding columns below.
-- Revoke broad table privileges first; column grants preserve those legitimate updates while
-- keeping plan and payment lifecycle changes exclusive to service_role/backend code.
revoke update on table public.stores from anon, authenticated;
grant update (
  nome, whatsapp, telefone, postal_code, endereco, address_number, address_complement,
  neighborhood, cidade, estado, logo, banner, foto_capa, cor_principal, cor_secundaria,
  seo_titulo, seo_descricao, business_hours, slug, tipo_vitrine, template_vitrine
) on table public.stores to authenticated;

revoke insert on table public.stores from anon, authenticated;
grant insert (
  owner_id, nome, whatsapp, telefone, postal_code, endereco, address_number,
  address_complement, neighborhood, cidade, estado, logo, banner, foto_capa,
  cor_principal, cor_secundaria, seo_titulo, seo_descricao, business_hours, slug,
  tipo_vitrine, template_vitrine
) on table public.stores to authenticated;

-- Public storefront reads do not need owner or provider identifiers. The frontend already
-- selects this allow-list of display and access-state columns.
revoke select on table public.stores from anon;
grant select (
  id, nome, whatsapp, telefone, postal_code, endereco, address_number, address_complement,
  neighborhood, cidade, estado, logo, banner, foto_capa, cor_principal, cor_secundaria,
  seo_titulo, seo_descricao, business_hours, plano, subscription_status, trial_ends_at,
  current_period_end, created_at, slug, tipo_vitrine, template_vitrine
) on table public.stores to anon;

create or replace function public.prevent_client_store_billing_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'insert' then
    if new.plano is distinct from 'free'
       or new.plan_due_date is not null
       or new.subscription_status is distinct from 'trialing'
       or new.subscription_started_at is not null
       or new.current_period_end is not null
       or new.payment_provider is not null
       or new.payment_subscription_id is not null then
      raise exception 'store billing fields are managed by the payment backend'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.plano is distinct from old.plano
     or new.plan_due_date is distinct from old.plan_due_date
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_started_at is distinct from old.trial_started_at
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.subscription_started_at is distinct from old.subscription_started_at
     or new.current_period_end is distinct from old.current_period_end
     or new.payment_provider is distinct from old.payment_provider
     or new.payment_subscription_id is distinct from old.payment_subscription_id then
    raise exception 'store billing fields are managed by the payment backend'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_client_store_billing_write on public.stores;
create trigger prevent_client_store_billing_write
before insert or update on public.stores
for each row execute function public.prevent_client_store_billing_write();

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null default 'mercadopago' check (provider = 'mercadopago'),
  plan_code text not null default 'pro_manual_monthly' check (plan_code = 'pro_manual_monthly'),
  amount_cents integer not null default 3900 check (amount_cents = 3900),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'created' check (status in (
    'created', 'pending', 'approved', 'rejected', 'cancelled', 'expired',
    'refunded', 'charged_back', 'error'
  )),
  external_reference text not null unique,
  preference_id text unique,
  payment_id text,
  idempotency_key uuid not null,
  checkout_mode text not null check (checkout_mode in ('test', 'production')),
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  access_applied_at timestamptz,
  needs_review boolean not null default false,
  constraint payment_orders_owner_idempotency_key_key unique (owner_user_id, idempotency_key),
  constraint payment_orders_provider_payment_id_key unique (provider, payment_id)
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercadopago' check (provider = 'mercadopago'),
  provider_event_id text not null,
  event_type text not null,
  resource_id text,
  payment_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in (
    'received', 'processed', 'ignored', 'error'
  )),
  error_code text,
  payload_hash text not null,
  constraint payment_webhook_events_provider_event_key unique (provider, provider_event_id),
  constraint payment_webhook_events_provider_payload_hash_key unique (provider, payload_hash)
);

-- Backend-only tables: grants are deliberately limited to service_role. RLS remains enabled
-- as a fail-closed second layer; service_role performs the internal operations.
revoke all on table public.payment_orders from anon, authenticated;
revoke all on table public.payment_webhook_events from anon, authenticated;
grant select, insert, update, delete on table public.payment_orders to service_role;
grant select, insert, update, delete on table public.payment_webhook_events to service_role;

alter table public.payment_orders enable row level security;
alter table public.payment_webhook_events enable row level security;

create index if not exists payment_orders_store_created_at_idx
  on public.payment_orders (store_id, created_at desc);
create index if not exists payment_orders_owner_created_at_idx
  on public.payment_orders (owner_user_id, created_at desc);
create index if not exists payment_orders_external_reference_idx
  on public.payment_orders (external_reference);
create index if not exists payment_webhook_events_payment_id_idx
  on public.payment_webhook_events (payment_id);
create index if not exists payment_webhook_events_received_at_idx
  on public.payment_webhook_events (received_at desc);

-- This RPC is intentionally callable only by service_role. It locks the order and store row,
-- records the provider payment once, and extends an already valid period instead of replacing it.
create or replace function public.apply_manual_payment_approval(
  p_order_id uuid,
  p_payment_id text,
  p_approved_at timestamptz
)
returns table (period_start timestamptz, period_end timestamptz, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
  v_store public.stores%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  select * into v_order
  from public.payment_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'payment order not found' using errcode = 'P0002';
  end if;

  if v_order.payment_id is not null and v_order.payment_id is distinct from p_payment_id then
    raise exception 'payment id does not match payment order' using errcode = '22023';
  end if;

  if v_order.access_applied_at is not null then
    return query select v_order.period_start, v_order.period_end, false;
    return;
  end if;

  select * into v_store
  from public.stores
  where id = v_order.store_id
  for update;

  if not found then
    raise exception 'store not found' using errcode = 'P0002';
  end if;

  v_period_start := case
    when v_store.current_period_end is not null and v_store.current_period_end > p_approved_at
      then v_store.current_period_end
    else p_approved_at
  end;
  v_period_end := v_period_start + interval '30 days';

  update public.stores
  set
    plano = 'pro',
    subscription_status = 'active',
    subscription_started_at = coalesce(subscription_started_at, p_approved_at),
    current_period_end = v_period_end,
    plan_due_date = v_period_end::date,
    payment_provider = 'mercadopago'
  where id = v_store.id;

  update public.payment_orders
  set
    status = 'approved',
    payment_id = p_payment_id,
    approved_at = p_approved_at,
    period_start = v_period_start,
    period_end = v_period_end,
    access_applied_at = now(),
    updated_at = now()
  where id = v_order.id;

  return query select v_period_start, v_period_end, true;
end;
$$;

revoke all on function public.apply_manual_payment_approval(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_manual_payment_approval(uuid, text, timestamptz) to service_role;
