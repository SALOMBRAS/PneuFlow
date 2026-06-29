alter table public.notification_stock_state
  add column if not exists alert_cycle integer not null default 0;

create or replace function public.handle_pneu_stock_notifications()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_owner_id uuid;
  v_old_stock integer := coalesce(old.estoque, 0);
  v_new_stock integer := coalesce(new.estoque, 0);
  v_product_label text;
  v_low_stock_alert_active boolean := false;
  v_out_of_stock_alert_active boolean := false;
  v_alert_cycle integer := 0;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if v_old_stock = v_new_stock then
    return new;
  end if;

  select s.owner_id
  into v_owner_id
  from public.stores s
  where s.id = new.loja_id;

  if v_owner_id is null then
    return new;
  end if;

  v_product_label := trim(concat(coalesce(new.marca, ''), ' ', coalesce(new.modelo, ''), ' ', coalesce(new.medida, '')));
  insert into public.notification_stock_state (
    store_id,
    product_id
  )
  values (
    new.loja_id,
    new.id
  )
  on conflict (product_id) do nothing;

  select
    ns.low_stock_alert_active,
    ns.out_of_stock_alert_active,
    ns.alert_cycle
  into
    v_low_stock_alert_active,
    v_out_of_stock_alert_active,
    v_alert_cycle
  from public.notification_stock_state ns
  where ns.product_id = new.id
  for update;

  if v_new_stock > 3 then
    if v_old_stock <= 3 or v_low_stock_alert_active or v_out_of_stock_alert_active then
      update public.notification_stock_state
      set low_stock_alert_active = false,
          out_of_stock_alert_active = false,
          alert_cycle = alert_cycle + 1,
          updated_at = now()
      where product_id = new.id
      returning alert_cycle into v_alert_cycle;
    end if;

    return new;
  end if;

  if v_new_stock between 1 and 3 and not v_low_stock_alert_active then
    perform public.create_notifications_for_users(
      new.loja_id,
      array[v_owner_id],
      'warning',
      'low_stock',
      'Estoque baixo',
      format('%s possui apenas %s unidade(s).', coalesce(nullif(v_product_label, ''), 'Este pneu'), v_new_stock),
      'pneu',
      new.id,
      '/dashboard/catalog',
      jsonb_build_object('estoque', v_new_stock),
      concat('stock-low:', new.id::text, ':cycle:', v_alert_cycle::text)
    );

    update public.notification_stock_state
    set low_stock_alert_active = true,
        updated_at = now()
    where product_id = new.id;
  end if;

  if v_new_stock = 0 and not v_out_of_stock_alert_active then
    perform public.create_notifications_for_users(
      new.loja_id,
      array[v_owner_id],
      'error',
      'out_of_stock',
      'Pneu esgotado',
      format('%s ficou sem estoque.', coalesce(nullif(v_product_label, ''), 'Este pneu')),
      'pneu',
      new.id,
      '/dashboard/catalog',
      jsonb_build_object('estoque', v_new_stock),
      concat('stock-out:', new.id::text, ':cycle:', v_alert_cycle::text)
    );

    update public.notification_stock_state
    set low_stock_alert_active = true,
        out_of_stock_alert_active = true,
        updated_at = now()
    where product_id = new.id;
  end if;

  return new;
end;
$$;

alter function public.handle_pneu_stock_notifications() owner to postgres;
revoke all on function public.handle_pneu_stock_notifications() from public;

notify pgrst, 'reload schema';
