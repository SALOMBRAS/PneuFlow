


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."atualizar_status_venda_lead"("p_lead_id" "uuid", "p_venda_confirmada" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_is_owner boolean := false;
  v_is_seller_allowed boolean := false;
BEGIN
  SELECT *
  INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead nÃ£o encontrado';
  END IF;

  -- Dono da loja pode marcar e desmarcar qualquer lead
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = v_lead.loja_id
    AND s.owner_id = auth.uid()
  )
  INTO v_is_owner;

  -- Vendedor pode marcar apenas leads atribuÃ­dos a ele
  SELECT EXISTS (
    SELECT 1
    FROM public.store_members sm
    WHERE sm.store_id = v_lead.loja_id
    AND sm.user_id = auth.uid()
    AND (
      sm.status IS NULL
      OR sm.status IN ('active', 'ativo')
    )
    AND (
      v_lead.seller_id = sm.user_id
      OR (
        v_lead.ref_code IS NOT NULL
        AND sm.ref_code = v_lead.ref_code
      )
    )
  )
  INTO v_is_seller_allowed;

  IF NOT v_is_owner AND NOT v_is_seller_allowed THEN
    RAISE EXCEPTION 'Sem permissÃ£o para alterar este lead';
  END IF;

  -- Vendedor pode marcar como vendido, mas nÃ£o pode desmarcar
  IF p_venda_confirmada = false AND NOT v_is_owner THEN
    RAISE EXCEPTION 'Somente o dono da loja pode desmarcar uma venda confirmada';
  END IF;

  -- Se jÃ¡ estÃ¡ vendido, vendedor nÃ£o altera mais
  IF v_lead.venda_confirmada = true AND NOT v_is_owner THEN
    RAISE EXCEPTION 'Venda jÃ¡ confirmada. Somente o dono da loja pode alterar';
  END IF;

  UPDATE public.leads
  SET
    venda_confirmada = p_venda_confirmada,
    venda_confirmada_em = CASE
      WHEN p_venda_confirmada THEN COALESCE(v_lead.venda_confirmada_em, now())
      ELSE NULL
    END,
    venda_confirmada_por = CASE
      WHEN p_venda_confirmada THEN COALESCE(v_lead.venda_confirmada_por, auth.uid())
      ELSE NULL
    END
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'venda_confirmada', p_venda_confirmada
  );
END;
$$;


ALTER FUNCTION "public"."atualizar_status_venda_lead"("p_lead_id" "uuid", "p_venda_confirmada" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."excluir_lead"("p_lead_id" "uuid", "p_store_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_owner boolean;
  v_deleted_count integer;
BEGIN
  IF p_lead_id IS NULL OR p_store_id IS NULL THEN
    RAISE EXCEPTION 'Lead ou loja invÃ¡lidos';
  END IF;

  SELECT (
    EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = p_store_id
        AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.store_members sm
      WHERE sm.store_id = p_store_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.status = 'active'
    )
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Acesso negado: vocÃª nÃ£o tem permissÃ£o para excluir este lead';
  END IF;

  DELETE FROM public.leads
  WHERE id = p_lead_id
    AND loja_id = p_store_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Lead nÃ£o encontrado ou jÃ¡ removido';
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."excluir_lead"("p_lead_id" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leads_com_vendedor"("p_store_id" "uuid") RETURNS TABLE("id" "uuid", "loja_id" "uuid", "seller_id" "uuid", "ref_code" "text", "attribution_source" "text", "nome_cliente" "text", "produto_nome" "text", "produto_medida" "text", "produto_preco" numeric, "origem" "text", "created_at" timestamp with time zone, "vendedor_nome" "text", "vendedor_email" "text", "vendedor_ref_code" "text", "venda_confirmada" boolean, "venda_confirmada_em" timestamp with time zone, "venda_confirmada_por" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_owner boolean := false;
BEGIN
  -- Verifica se o usuÃ¡rio logado Ã© dono da loja
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = p_store_id
    AND s.owner_id = auth.uid()
  )
  INTO v_is_owner;

  -- Se nÃ£o for dono e nem membro da loja, nÃ£o retorna nada
  IF NOT v_is_owner
  AND NOT EXISTS (
    SELECT 1
    FROM public.store_members m
    WHERE m.store_id = p_store_id
    AND m.user_id = auth.uid()
  )
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.loja_id,
    l.seller_id,
    l.ref_code,
    l.attribution_source,
    l.nome_cliente,
    l.produto_nome,
    l.produto_medida,
    l.produto_preco,
    l.origem,
    l.created_at,
    sm.nome AS vendedor_nome,
    sm.email AS vendedor_email,
    sm.ref_code AS vendedor_ref_code,
    l.venda_confirmada,
    l.venda_confirmada_em,
    l.venda_confirmada_por
  FROM public.leads l
  LEFT JOIN LATERAL (
    SELECT
      m.nome,
      m.email,
      m.ref_code
    FROM public.store_members m
    WHERE m.store_id = l.loja_id
    AND (
      m.user_id = l.seller_id
      OR (
        l.ref_code IS NOT NULL
        AND m.ref_code = l.ref_code
      )
    )
    ORDER BY
      CASE
        WHEN m.user_id = l.seller_id THEN 0
        ELSE 1
      END
    LIMIT 1
  ) sm ON true
  WHERE l.loja_id = p_store_id
  AND (
    -- Dono vÃª todos os leads
    v_is_owner = true

    -- Vendedor vÃª apenas leads atribuÃ­dos a ele
    OR EXISTS (
      SELECT 1
      FROM public.store_members current_member
      WHERE current_member.store_id = p_store_id
      AND current_member.user_id = auth.uid()
      AND (
        l.seller_id = current_member.user_id
        OR (
          l.ref_code IS NOT NULL
          AND current_member.ref_code = l.ref_code
        )
      )
    )
  )
  ORDER BY l.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_leads_com_vendedor"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") RETURNS TABLE("id" "uuid", "nome" "text", "ref_code" "text", "whatsapp" "text", "status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    sm.id,
    sm.nome,
    sm.ref_code,
    sm.whatsapp,
    sm.status
  FROM public.store_members sm
  WHERE sm.store_id = p_store_id
    AND sm.ref_code = p_ref_code
    AND sm.role = 'seller'
    AND sm.status = 'active'
    AND NULLIF(regexp_replace(COALESCE(sm.whatsapp, ''), '\D', '', 'g'), '') IS NOT NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_public_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") RETURNS TABLE("seller_id" "uuid", "seller_name" "text", "ref_code" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    sm.user_id as seller_id,
    sm.nome as seller_name,
    sm.ref_code
  from public.store_members sm
  where sm.store_id = p_store_id
    and sm.status = 'active'
    and sm.user_id is not null
    and sm.ref_code is not null
    and lower(sm.ref_code) = lower(public.slugify_ref_code(p_ref_code))
  limit 1;
$$;


ALTER FUNCTION "public"."get_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_store_member"("_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.stores s
    where s.id = _store_id
      and s.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.store_members sm
    where sm.store_id = _store_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
      and sm.role in ('owner', 'seller')
  );
$$;


ALTER FUNCTION "public"."is_active_store_member"("_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_member"("_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_members sm
    WHERE sm.store_id = _store_id
    AND sm.user_id = auth.uid()
    AND (
      sm.status IS NULL
      OR sm.status IN ('active', 'ativo', 'pending', 'pendente')
    )
  );
$$;


ALTER FUNCTION "public"."is_store_member"("_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_owner"("_store_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = _store_id
    AND s.owner_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_store_owner"("_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_valid_referral"("p_store_id" "uuid", "p_seller_id" "uuid", "p_ref_code" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = p_store_id
      and sm.user_id = p_seller_id
      and sm.status = 'active'
      and sm.ref_code is not null
      and lower(sm.ref_code) = lower(public.slugify_ref_code(p_ref_code))
  );
$$;


ALTER FUNCTION "public"."is_valid_referral"("p_store_id" "uuid", "p_seller_id" "uuid", "p_ref_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loja_id" "uuid" NOT NULL,
    "produto_id" "uuid",
    "nome_cliente" "text" NOT NULL,
    "produto_nome" "text",
    "produto_medida" "text",
    "produto_preco" numeric,
    "origem" "text" DEFAULT 'whatsapp'::"text",
    "data_interesse" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "seller_id" "uuid",
    "store_id" "uuid",
    "pneu_id" "uuid",
    "ref_code" "text",
    "attribution_source" "text" DEFAULT 'product'::"text",
    "venda_confirmada" boolean DEFAULT false NOT NULL,
    "venda_confirmada_em" timestamp with time zone,
    "venda_confirmada_por" "uuid",
    CONSTRAINT "leads_attribution_source_check" CHECK (("attribution_source" = ANY (ARRAY['referral'::"text", 'product'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text" DEFAULT ''::"text", "p_produto_medida" "text" DEFAULT ''::"text", "p_produto_preco" numeric DEFAULT 0, "p_origem" "text" DEFAULT 'whatsapp'::"text") RETURNS "public"."leads"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  novo_lead public.leads;
begin
  if p_loja_id is null then
    raise exception 'loja_id obrigatÃ³rio';
  end if;

  if nullif(trim(p_nome_cliente), '') is null then
    raise exception 'nome_cliente obrigatÃ³rio';
  end if;

  insert into public.leads (
    loja_id,
    produto_id,
    nome_cliente,
    produto_nome,
    produto_medida,
    produto_preco,
    origem
  )
  values (
    p_loja_id,
    p_produto_id,
    trim(p_nome_cliente),
    coalesce(p_produto_nome, ''),
    coalesce(p_produto_medida, ''),
    coalesce(p_produto_preco, 0),
    coalesce(p_origem, 'whatsapp')
  )
  returning * into novo_lead;

  return novo_lead;
end;
$$;


ALTER FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text", "p_produto_medida" "text", "p_produto_preco" numeric, "p_origem" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid" DEFAULT NULL::"uuid", "p_nome_cliente" "text" DEFAULT NULL::"text", "p_produto_nome" "text" DEFAULT NULL::"text", "p_produto_medida" "text" DEFAULT NULL::"text", "p_produto_preco" numeric DEFAULT 0, "p_origem" "text" DEFAULT 'whatsapp'::"text", "p_seller_id" "uuid" DEFAULT NULL::"uuid", "p_ref_code" "text" DEFAULT NULL::"text", "p_attribution_source" "text" DEFAULT 'product'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_lead_id uuid;
  v_final_seller_id uuid := null;
  v_final_source text := 'unknown';
  v_clean_ref text := null;
begin
  -- 1. Se veio ref_code, resolver seller pelo banco
  if p_ref_code is not null and p_ref_code <> '' then
    v_clean_ref := public.slugify_ref_code(p_ref_code);

    select sm.user_id
    into v_final_seller_id
    from public.store_members sm
    where sm.store_id = p_loja_id
      and sm.status = 'active'
      and sm.user_id is not null
      and lower(sm.ref_code) = lower(v_clean_ref)
    limit 1;

    if v_final_seller_id is not null then
      v_final_source := 'referral';
    end if;
  end if;

  -- 2. Se nÃ£o achou por ref, aceitar p_seller_id somente se for membro ativo da loja
  if v_final_seller_id is null and p_seller_id is not null then
    select sm.user_id
    into v_final_seller_id
    from public.store_members sm
    where sm.store_id = p_loja_id
      and sm.user_id = p_seller_id
      and sm.status = 'active'
    limit 1;

    if v_final_seller_id is not null then
      v_final_source := 'referral';
    end if;
  end if;

  -- 3. Fallback: dono/criador do produto
  if v_final_seller_id is null and p_produto_id is not null then
    select p.created_by
    into v_final_seller_id
    from public.pneus p
    where p.id = p_produto_id
      and p.loja_id = p_loja_id
    limit 1;

    if v_final_seller_id is not null then
      v_final_source := 'product';
    end if;
  end if;

  insert into public.leads (
    loja_id,
    store_id,
    produto_id,
    pneu_id,
    seller_id,
    nome_cliente,
    produto_nome,
    produto_medida,
    produto_preco,
    origem,
    ref_code,
    attribution_source
  )
  values (
    p_loja_id,
    p_loja_id,
    p_produto_id,
    p_produto_id,
    v_final_seller_id,
    p_nome_cliente,
    p_produto_nome,
    p_produto_medida,
    p_produto_preco,
    coalesce(p_origem, 'whatsapp'),
    v_clean_ref,
    v_final_source
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;


ALTER FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text", "p_produto_medida" "text", "p_produto_preco" numeric, "p_origem" "text", "p_seller_id" "uuid", "p_ref_code" "text", "p_attribution_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_visita_referral"("p_store_id" "uuid", "p_ref_code" "text" DEFAULT NULL::"text", "p_path" "text" DEFAULT NULL::"text", "p_seller_id" "uuid" DEFAULT NULL::"uuid", "p_visitor_id" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_existing_id uuid;
  v_visit_id uuid;
  v_visitor_id text;
  v_ref_code text;
  v_path text;
  v_user_agent text;
begin
  if p_store_id is null then
    return jsonb_build_object(
      'inserted', false,
      'reason', 'missing_store_id'
    );
  end if;

  v_visitor_id := nullif(trim(coalesce(p_visitor_id, '')), '');

  if v_visitor_id is null then
    return jsonb_build_object(
      'inserted', false,
      'reason', 'missing_visitor_id'
    );
  end if;

  if length(v_visitor_id) > 120 then
    return jsonb_build_object(
      'inserted', false,
      'reason', 'invalid_visitor_id'
    );
  end if;

  if not exists (
    select 1
    from public.stores s
    where s.id = p_store_id
  ) then
    return jsonb_build_object(
      'inserted', false,
      'reason', 'store_not_found'
    );
  end if;

  v_ref_code := nullif(left(trim(coalesce(p_ref_code, '')), 80), '');
  v_path := nullif(left(trim(coalesce(p_path, '')), 500), '');
  v_user_agent := nullif(left(trim(coalesce(p_user_agent, '')), 500), '');

  perform pg_advisory_xact_lock(
    hashtext(p_store_id::text),
    hashtext(v_visitor_id)
  );

  select id
  into v_existing_id
  from public.store_referral_visits
  where store_id = p_store_id
    and visitor_id = v_visitor_id
    and created_at >= now() - interval '24 hours'
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'inserted', false,
      'reason', 'duplicate_24h',
      'existing_visit_id', v_existing_id
    );
  end if;

  insert into public.store_referral_visits (
    store_id,
    seller_id,
    ref_code,
    visitor_id,
    path,
    user_agent,
    created_at
  )
  values (
    p_store_id,
    p_seller_id,
    v_ref_code,
    v_visitor_id,
    v_path,
    v_user_agent,
    now()
  )
  returning id into v_visit_id;

  return jsonb_build_object(
    'inserted', true,
    'visit_id', v_visit_id
  );
end;
$$;


ALTER FUNCTION "public"."registrar_visita_referral"("p_store_id" "uuid", "p_ref_code" "text", "p_path" "text", "p_seller_id" "uuid", "p_visitor_id" "text", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_pneu_user_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;

    if new.updated_by is null then
      new.updated_by := auth.uid();
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_pneu_user_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify_ref_code"("input_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(
        lower(coalesce(input_text, '')),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      ''
    ),
    'vendedor'
  );
$$;


ALTER FUNCTION "public"."slugify_ref_code"("input_text" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pneus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loja_id" "uuid" NOT NULL,
    "marca" "text" NOT NULL,
    "modelo" "text" NOT NULL,
    "medida" "text" NOT NULL,
    "preco" numeric(10,2) NOT NULL,
    "estoque" integer DEFAULT 0,
    "descricao" "text",
    "status" "text" DEFAULT 'ativo'::"text",
    "compatibilidade" "text",
    "foto_principal_url" "text",
    "fotos" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo_veiculo" "text" DEFAULT 'carro'::"text",
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "pneus_tipo_veiculo_check" CHECK (("tipo_veiculo" = ANY (ARRAY['carro'::"text", 'moto'::"text"])))
);


ALTER TABLE "public"."pneus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "telefone" "text",
    "role" "text" DEFAULT 'lojista'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "nome" "text",
    "role" "text" DEFAULT 'seller'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ref_code" "text",
    "disabled_at" timestamp with time zone,
    "removed_at" timestamp with time zone,
    "auth_deleted_at" timestamp with time zone,
    "removed_by" "uuid",
    "senha_inicial" "text",
    "whatsapp" "text",
    CONSTRAINT "store_members_ref_code_format_check" CHECK ((("ref_code" IS NULL) OR ("ref_code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))),
    CONSTRAINT "store_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'seller'::"text"]))),
    CONSTRAINT "store_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'inactive'::"text", 'removed'::"text", 'cancelled'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."store_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_referral_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "seller_id" "uuid",
    "ref_code" "text",
    "path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "visitor_id" "text",
    "user_agent" "text"
);


ALTER TABLE "public"."store_referral_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "whatsapp" "text",
    "telefone" "text",
    "endereco" "text",
    "cidade" "text",
    "estado" "text",
    "logo" "text",
    "banner" "text",
    "foto_capa" "text",
    "cor_principal" "text" DEFAULT '#f59e0b'::"text",
    "cor_secundaria" "text" DEFAULT '#111827'::"text",
    "seo_titulo" "text",
    "seo_descricao" "text",
    "plano" "text" DEFAULT 'free'::"text",
    "plan_due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "tipo_vitrine" "text" DEFAULT 'carro'::"text",
    "template_vitrine" "text" DEFAULT 'moderno'::"text",
    CONSTRAINT "stores_template_vitrine_check" CHECK (("template_vitrine" = ANY (ARRAY['moderno'::"text", 'premium'::"text", 'comercial'::"text"]))),
    CONSTRAINT "stores_tipo_vitrine_check" CHECK (("tipo_vitrine" = ANY (ARRAY['carro'::"text", 'moto'::"text", 'ambos'::"text"])))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pneus"
    ADD CONSTRAINT "pneus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_referral_visits"
    ADD CONSTRAINT "store_referral_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_pneus_loja_id_created_at" ON "public"."pneus" USING "btree" ("loja_id", "created_at" DESC);



CREATE INDEX "idx_pneus_loja_id_status" ON "public"."pneus" USING "btree" ("loja_id", "status");



CREATE INDEX "idx_referral_visits_created_at" ON "public"."store_referral_visits" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_referral_visits_seller" ON "public"."store_referral_visits" USING "btree" ("seller_id");



CREATE INDEX "idx_referral_visits_store" ON "public"."store_referral_visits" USING "btree" ("store_id");



CREATE INDEX "idx_store_members_store_id_status" ON "public"."store_members" USING "btree" ("store_id", "status");



CREATE UNIQUE INDEX "idx_store_members_store_ref_code" ON "public"."store_members" USING "btree" ("store_id", "lower"("ref_code")) WHERE ("ref_code" IS NOT NULL);



CREATE INDEX "idx_store_referral_visits_store_created" ON "public"."store_referral_visits" USING "btree" ("store_id", "created_at" DESC);



CREATE INDEX "idx_store_referral_visits_store_seller_created" ON "public"."store_referral_visits" USING "btree" ("store_id", "seller_id", "created_at" DESC) WHERE ("seller_id" IS NOT NULL);



CREATE INDEX "idx_store_referral_visits_store_visitor_created" ON "public"."store_referral_visits" USING "btree" ("store_id", "visitor_id", "created_at" DESC) WHERE ("visitor_id" IS NOT NULL);



CREATE INDEX "idx_stores_owner_id" ON "public"."stores" USING "btree" ("owner_id");



CREATE UNIQUE INDEX "idx_stores_slug_unique" ON "public"."stores" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE UNIQUE INDEX "store_members_store_email_unique" ON "public"."store_members" USING "btree" ("store_id", "lower"("email"));



CREATE UNIQUE INDEX "store_members_store_user_unique" ON "public"."store_members" USING "btree" ("store_id", "user_id") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "stores_slug_unique" ON "public"."stores" USING "btree" ("slug");



CREATE OR REPLACE TRIGGER "set_pneu_user_fields_trigger" BEFORE INSERT OR UPDATE ON "public"."pneus" FOR EACH ROW EXECUTE FUNCTION "public"."set_pneu_user_fields"();



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pneu_id_fkey" FOREIGN KEY ("pneu_id") REFERENCES "public"."pneus"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."pneus"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pneus"
    ADD CONSTRAINT "pneus_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pneus"
    ADD CONSTRAINT "pneus_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pneus"
    ADD CONSTRAINT "pneus_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_referral_visits"
    ADD CONSTRAINT "store_referral_visits_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_referral_visits"
    ADD CONSTRAINT "store_referral_visits_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active members can view store tires" ON "public"."pneus" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."store_members" "sm"
  WHERE (("sm"."store_id" = "pneus"."loja_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"text") AND ("sm"."role" = ANY (ARRAY['owner'::"text", 'seller'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "pneus"."loja_id") AND ("s"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Authenticated can create own store" ON "public"."stores" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners and members can view store_members" ON "public"."store_members" FOR SELECT TO "authenticated" USING (("public"."is_store_owner"("store_id") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Owners can delete store_members" ON "public"."store_members" FOR DELETE TO "authenticated" USING ("public"."is_store_owner"("store_id"));



CREATE POLICY "Owners can delete stores" ON "public"."stores" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners can insert store_members" ON "public"."store_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_store_owner"("store_id"));



CREATE POLICY "Owners can update store_members" ON "public"."store_members" FOR UPDATE TO "authenticated" USING ("public"."is_store_owner"("store_id")) WITH CHECK ("public"."is_store_owner"("store_id"));



CREATE POLICY "Owners can update stores" ON "public"."stores" FOR UPDATE TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners can view all leads of their store" ON "public"."leads" FOR SELECT TO "authenticated" USING ("public"."is_store_owner"(COALESCE("loja_id", "store_id")));



CREATE POLICY "Owners can view all visits of their store" ON "public"."store_referral_visits" FOR SELECT TO "authenticated" USING ("public"."is_store_owner"("store_id"));



CREATE POLICY "Public can insert leads" ON "public"."leads" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public can insert valid referral visits" ON "public"."store_referral_visits" FOR INSERT TO "authenticated", "anon" WITH CHECK ("public"."is_valid_referral"("store_id", "seller_id", "ref_code"));



CREATE POLICY "Public can view stores" ON "public"."stores" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Sellers can view their own leads" ON "public"."leads" FOR SELECT TO "authenticated" USING (("seller_id" = "auth"."uid"()));



CREATE POLICY "Sellers can view their own visits" ON "public"."store_referral_visits" FOR SELECT TO "authenticated" USING (("seller_id" = "auth"."uid"()));



CREATE POLICY "Store owners can read their leads" ON "public"."leads" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "leads"."loja_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "UsuÃ¡rio pode atualizar seu prÃ³prio perfil" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "UsuÃ¡rio pode criar seu prÃ³prio perfil" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "UsuÃ¡rio pode ver seu prÃ³prio perfil" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pneus" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pneus_delete_owner_only" ON "public"."pneus" FOR DELETE TO "authenticated" USING ("public"."is_store_owner"("loja_id"));



CREATE POLICY "pneus_insert_active_member" ON "public"."pneus" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_store_member"("loja_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "pneus_public_select_active" ON "public"."pneus" FOR SELECT TO "anon" USING (("status" = 'ativo'::"text"));



CREATE POLICY "pneus_select_owner_all_seller_own" ON "public"."pneus" FOR SELECT TO "authenticated" USING (("public"."is_store_owner"("loja_id") OR ("public"."is_active_store_member"("loja_id") AND ("created_by" = "auth"."uid"()))));



CREATE POLICY "pneus_update_owner_all_seller_own" ON "public"."pneus" FOR UPDATE TO "authenticated" USING (("public"."is_store_owner"("loja_id") OR ("public"."is_active_store_member"("loja_id") AND ("created_by" = "auth"."uid"())))) WITH CHECK (("public"."is_store_owner"("loja_id") OR ("public"."is_active_store_member"("loja_id") AND ("created_by" = "auth"."uid"()))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_referral_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."leads";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."atualizar_status_venda_lead"("p_lead_id" "uuid", "p_venda_confirmada" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."excluir_lead"("p_lead_id" "uuid", "p_store_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_leads_com_vendedor"("p_store_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_public_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_referral_seller"("p_store_id" "uuid", "p_ref_code" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_active_store_member"("_store_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_store_member"("_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_store_member"("_store_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_store_owner"("_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_store_owner"("_store_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."is_valid_referral"("p_store_id" "uuid", "p_seller_id" "uuid", "p_ref_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_referral"("p_store_id" "uuid", "p_seller_id" "uuid", "p_ref_code" "text") TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text", "p_produto_medida" "text", "p_produto_preco" numeric, "p_origem" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text", "p_produto_medida" "text", "p_produto_preco" numeric, "p_origem" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text", "p_produto_medida" "text", "p_produto_preco" numeric, "p_origem" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text", "p_produto_medida" "text", "p_produto_preco" numeric, "p_origem" "text", "p_seller_id" "uuid", "p_ref_code" "text", "p_attribution_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_lead"("p_loja_id" "uuid", "p_produto_id" "uuid", "p_nome_cliente" "text", "p_produto_nome" "text", "p_produto_medida" "text", "p_produto_preco" numeric, "p_origem" "text", "p_seller_id" "uuid", "p_ref_code" "text", "p_attribution_source" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."registrar_visita_referral"("p_store_id" "uuid", "p_ref_code" "text", "p_path" "text", "p_seller_id" "uuid", "p_visitor_id" "text", "p_user_agent" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_visita_referral"("p_store_id" "uuid", "p_ref_code" "text", "p_path" "text", "p_seller_id" "uuid", "p_visitor_id" "text", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_visita_referral"("p_store_id" "uuid", "p_ref_code" "text", "p_path" "text", "p_seller_id" "uuid", "p_visitor_id" "text", "p_user_agent" "text") TO "authenticated";


















GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pneus" TO "anon";
GRANT ALL ON TABLE "public"."pneus" TO "authenticated";
GRANT ALL ON TABLE "public"."pneus" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."store_members" TO "anon";
GRANT ALL ON TABLE "public"."store_members" TO "authenticated";
GRANT ALL ON TABLE "public"."store_members" TO "service_role";



GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."store_referral_visits" TO "anon";
GRANT ALL ON TABLE "public"."store_referral_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."store_referral_visits" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";
