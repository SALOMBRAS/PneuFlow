create table if not exists public.seller_access_audit (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  seller_member_id uuid references public.store_members(id) on delete set null,
  seller_user_id uuid references auth.users(id) on delete set null,
  ticket_hash text,
  status text not null,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ended_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_access_audit_status_check check (
    status = any (array['requested', 'consumed', 'expired', 'revoked', 'ended', 'failed'])
  )
);

create unique index if not exists seller_access_audit_ticket_hash_key
  on public.seller_access_audit (ticket_hash)
  where ticket_hash is not null;

create index if not exists seller_access_audit_owner_requested_idx
  on public.seller_access_audit (owner_user_id, requested_at desc);

create index if not exists seller_access_audit_seller_requested_idx
  on public.seller_access_audit (seller_user_id, requested_at desc);

alter table public.seller_access_audit enable row level security;

drop policy if exists "Store owners can read own seller access audit" on public.seller_access_audit;
create policy "Store owners can read own seller access audit"
on public.seller_access_audit
for select
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = seller_access_audit.store_id
      and s.owner_id = auth.uid()
  )
);

grant select on table public.seller_access_audit to authenticated;
grant select, insert, update on table public.seller_access_audit to service_role;
