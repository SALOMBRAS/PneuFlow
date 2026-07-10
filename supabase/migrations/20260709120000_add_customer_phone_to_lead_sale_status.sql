create or replace function public.atualizar_status_atendimento_lead(
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
  v_status text := lower(trim(coalesce(p_status_atendimento, '')));
  v_existing_phone text;
  v_phone_digits text;
  v_phone_to_save text;
  v_result jsonb;
begin
  select telefone_cliente
  into v_existing_phone
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead nao encontrado';
  end if;

  v_phone_digits := nullif(regexp_replace(coalesce(p_telefone_cliente, ''), '\D', '', 'g'), '');
  v_phone_to_save := coalesce(v_phone_digits, nullif(regexp_replace(coalesce(v_existing_phone, ''), '\D', '', 'g'), ''));

  if v_status = 'vendido' then
    if v_phone_to_save is null or char_length(v_phone_to_save) not in (10, 11) then
      raise exception 'Telefone do cliente invalido';
    end if;
  elsif v_phone_to_save is not null and char_length(v_phone_to_save) not in (10, 11) then
    raise exception 'Telefone do cliente invalido';
  end if;

  v_result := public.atualizar_status_atendimento_lead(
    p_lead_id,
    p_status_atendimento,
    p_sold_quantity,
    p_desired_quantity,
    p_titulo_anuncio,
    p_preco_anuncio,
    p_quantidade_por_anuncio,
    p_valor_total
  );

  update public.leads
  set telefone_cliente = v_phone_to_save
  where id = p_lead_id;

  return v_result;
end;
$$;

alter function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text) owner to postgres;

grant execute on function public.atualizar_status_atendimento_lead(uuid, text, integer, integer, text, numeric, integer, numeric, text) to authenticated;

notify pgrst, 'reload schema';
