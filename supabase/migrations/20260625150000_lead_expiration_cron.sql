do $$
begin
  if not exists (
    select 1
    from pg_available_extensions
    where name = 'pg_cron'
  ) then
    raise exception 'A extensão pg_cron não está disponível neste projeto Supabase.';
  end if;
end
$$;

create extension if not exists pg_cron;

create or replace function public.expirar_leads_inativos_job()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_has_updated_at boolean := false;
  v_updated_count integer := 0;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'updated_at'
  )
  into v_has_updated_at;

  if v_has_updated_at then
    execute $sql$
      update public.leads
      set
        status_atendimento = 'desistencia',
        venda_confirmada = false,
        venda_confirmada_em = null,
        venda_confirmada_por = null,
        sold_quantity = null,
        updated_at = now()
      where status_atendimento = 'em_atendimento'
        and coalesce(venda_confirmada, false) = false
        and last_interaction_at <= now() - interval '24 hours'
    $sql$;
  else
    update public.leads
    set
      status_atendimento = 'desistencia',
      venda_confirmada = false,
      venda_confirmada_em = null,
      venda_confirmada_por = null,
      sold_quantity = null
    where status_atendimento = 'em_atendimento'
      and coalesce(venda_confirmada, false) = false
      and last_interaction_at <= now() - interval '24 hours';
  end if;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

alter function public.expirar_leads_inativos_job() owner to postgres;

revoke all on function public.expirar_leads_inativos_job() from public;
revoke all on function public.expirar_leads_inativos_job() from anon;
revoke all on function public.expirar_leads_inativos_job() from authenticated;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'pneuflow-expire-inactive-leads'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'pneuflow-expire-inactive-leads',
    '5 * * * *',
    $job$select public.expirar_leads_inativos_job();$job$
  );
end
$$;
