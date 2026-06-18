-- PneuFlow subscription/trial foundation.
-- Non-destructive: adds subscription fields to stores and backfills only stores without a configured subscription status.

alter table public.stores
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists subscription_started_at timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists payment_provider text,
  add column if not exists payment_subscription_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_subscription_status_check'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_subscription_status_check
      check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'blocked'));
  end if;
end $$;

update public.stores
set
  subscription_status = coalesce(subscription_status, 'trialing'),
  trial_started_at = coalesce(trial_started_at, now()),
  trial_ends_at = coalesce(trial_ends_at, now() + interval '7 days')
where subscription_status is null
   or trial_started_at is null
   or trial_ends_at is null;
