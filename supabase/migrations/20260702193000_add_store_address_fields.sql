alter table public.stores
  add column if not exists postal_code text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text;
