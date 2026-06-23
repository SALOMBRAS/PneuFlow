create or replace function public.ensure_store_provisioned()
returns public.stores
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := nullif(auth.jwt() ->> 'email', '');
  v_metadata jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  v_owner_name text := coalesce(nullif(v_metadata ->> 'full_name', ''), nullif(v_metadata ->> 'name', ''), 'Usuario');
  v_store_name text := coalesce(nullif(v_metadata ->> 'store_name', ''), 'Minha Loja');
  v_phone text := coalesce(nullif(v_metadata ->> 'phone_number', ''), nullif(v_metadata ->> 'phone', ''), '');
  v_base_slug text;
  v_slug text;
  v_suffix text;
  v_attempt integer := 0;
  v_store public.stores%rowtype;
  v_member_store public.stores%rowtype;
begin
  if v_user_id is null then
    raise exception 'Usuario autenticado obrigatorio' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select s.*
    into v_member_store
  from public.store_members sm
  join public.stores s on s.id = sm.store_id
  where sm.user_id = v_user_id
    and sm.status = 'active'
  order by
    case when sm.role = 'owner' then 0 else 1 end,
    sm.accepted_at asc nulls last,
    sm.created_at asc
  limit 1;

  if v_member_store.id is not null then
    return v_member_store;
  end if;

  if coalesce((v_metadata ->> 'invited_to_store')::boolean, false) then
    raise exception 'Usuario convidado nao deve criar loja propria' using errcode = '42501';
  end if;

  insert into public.profiles (id, user_id, nome, telefone, role)
  values (v_user_id, v_user_id, v_owner_name, v_phone, 'lojista')
  on conflict (user_id) do update
  set
    nome = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
    telefone = coalesce(nullif(public.profiles.telefone, ''), excluded.telefone);

  select *
    into v_store
  from public.stores
  where owner_id = v_user_id
  order by created_at asc
  limit 1
  for update;

  if v_store.id is null then
    v_base_slug := lower(regexp_replace(v_store_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);

    if v_base_slug is null or length(v_base_slug) < 3 then
      v_base_slug := 'minha-loja';
    end if;

    v_suffix := replace(left(v_user_id::text, 8), '-', '');
    v_slug := left(v_base_slug, 39) || '-' || v_suffix;

    while exists (select 1 from public.stores where slug = v_slug) loop
      v_attempt := v_attempt + 1;
      v_slug := left(v_base_slug, 36) || '-' || v_suffix || '-' || v_attempt::text;

      if v_attempt > 20 then
        raise exception 'Nao foi possivel gerar um link unico para a loja';
      end if;
    end loop;

    insert into public.stores (
      owner_id,
      nome,
      slug,
      whatsapp,
      plano,
      cor_principal,
      cor_secundaria
    )
    values (
      v_user_id,
      v_store_name,
      v_slug,
      v_phone,
      'free',
      '#f59e0b',
      '#121214'
    )
    returning * into v_store;
  end if;

  if v_email is not null and not exists (
    select 1
    from public.store_members
    where store_id = v_store.id
      and user_id = v_user_id
  ) then
    insert into public.store_members (
      store_id,
      user_id,
      email,
      nome,
      role,
      status,
      accepted_at,
      whatsapp
    )
    values (
      v_store.id,
      v_user_id,
      v_email,
      v_owner_name,
      'owner',
      'active',
      now(),
      v_phone
    )
    on conflict do nothing;
  end if;

  select *
    into v_store
  from public.stores
  where id = v_store.id;

  return v_store;
end;
$$;

revoke all on function public.ensure_store_provisioned() from public;
revoke execute on function public.ensure_store_provisioned() from anon;
grant execute on function public.ensure_store_provisioned() to authenticated;
