alter table public.stores
add column if not exists business_hours jsonb;

update public.stores
set business_hours = jsonb_build_object(
  'monday', jsonb_build_object('enabled', true, 'open', '08:00', 'close', '18:00'),
  'tuesday', jsonb_build_object('enabled', true, 'open', '08:00', 'close', '18:00'),
  'wednesday', jsonb_build_object('enabled', true, 'open', '08:00', 'close', '18:00'),
  'thursday', jsonb_build_object('enabled', true, 'open', '08:00', 'close', '18:00'),
  'friday', jsonb_build_object('enabled', true, 'open', '08:00', 'close', '18:00'),
  'saturday', jsonb_build_object('enabled', false, 'open', '08:00', 'close', '13:00'),
  'sunday', jsonb_build_object('enabled', false, 'open', '08:00', 'close', '18:00')
)
where business_hours is null;
