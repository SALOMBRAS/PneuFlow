begin;

alter table public.store_referral_visits
alter column ref_code drop not null;

alter table public.store_referral_visits
alter column seller_id drop not null;

notify pgrst, 'reload schema';

commit;
