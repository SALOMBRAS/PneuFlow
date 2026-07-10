alter table public.leads
  add column if not exists telefone_cliente text;

create or replace function public.atualizar_status_atendimento_lead(
  p_desired_quantity integer default null,
  p_lead_id uuid default null,
  p_preco_anuncio numeric default null,
  p_quantidade_por_anuncio integer default null,
  p_sold_quantity integer default null,
  p_status_atendimento text default null,
  p_telefone_cliente text default null,
  p_titulo_anuncio text default null,
  p_valor_total numeric default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if p_lead_id is null then
    raise exception 'Lead nao encontrado';
  end if;

  return public.atualizar_status_atendimento_lead(
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
end;
$$;

alter function public.atualizar_status_atendimento_lead(integer, uuid, numeric, integer, integer, text, text, text, numeric) owner to postgres;

grant execute on function public.atualizar_status_atendimento_lead(integer, uuid, numeric, integer, integer, text, text, text, numeric) to authenticated;

notify pgrst, 'reload schema';
