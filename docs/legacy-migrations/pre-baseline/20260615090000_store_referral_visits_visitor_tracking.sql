-- Evolui a métrica de visualizações da vitrine pública com visitor_id persistente.
-- Esta migration foi escrita para funcionar em bases novas e em bases já existentes.

CREATE TABLE IF NOT EXISTS public.store_referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  seller_id uuid,
  ref_code text,
  path text,
  visitor_id text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_referral_visits
  ADD COLUMN IF NOT EXISTS seller_id uuid;

ALTER TABLE public.store_referral_visits
  ADD COLUMN IF NOT EXISTS ref_code text;

ALTER TABLE public.store_referral_visits
  ADD COLUMN IF NOT EXISTS path text;

ALTER TABLE public.store_referral_visits
  ADD COLUMN IF NOT EXISTS visitor_id text;

ALTER TABLE public.store_referral_visits
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.store_referral_visits
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_store_referral_visits_store_visitor_created_at
  ON public.store_referral_visits (store_id, visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_referral_visits_store_created_at
  ON public.store_referral_visits (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_referral_visits_store_seller_created_at
  ON public.store_referral_visits (store_id, seller_id, created_at DESC);

ALTER TABLE public.store_referral_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read referral visits from their store" ON public.store_referral_visits;
CREATE POLICY "Owners can read referral visits from their store"
ON public.store_referral_visits
FOR SELECT
TO authenticated
USING (public.is_store_owner(store_id));

DROP POLICY IF EXISTS "Active members can read referral visits from their store" ON public.store_referral_visits;
CREATE POLICY "Active members can read referral visits from their store"
ON public.store_referral_visits
FOR SELECT
TO authenticated
USING (public.is_store_member(store_id));

REVOKE ALL ON TABLE public.store_referral_visits FROM PUBLIC;
REVOKE ALL ON TABLE public.store_referral_visits FROM anon;
REVOKE ALL ON TABLE public.store_referral_visits FROM authenticated;
GRANT SELECT ON TABLE public.store_referral_visits TO authenticated;

DROP FUNCTION IF EXISTS public.registrar_visita_referral(uuid, text, text);
DROP FUNCTION IF EXISTS public.registrar_visita_referral(uuid, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.registrar_visita_referral(
  p_store_id uuid,
  p_seller_id uuid DEFAULT NULL,
  p_ref_code text DEFAULT NULL,
  p_visitor_id text DEFAULT NULL,
  p_path text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id é obrigatório';
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_visitor_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'visitor_id é obrigatório';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.store_referral_visits
    WHERE store_id = p_store_id
      AND visitor_id = p_visitor_id
      AND created_at >= now() - interval '24 hours'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.store_referral_visits (
    store_id,
    seller_id,
    ref_code,
    visitor_id,
    path,
    user_agent,
    created_at
  ) VALUES (
    p_store_id,
    p_seller_id,
    NULLIF(BTRIM(COALESCE(p_ref_code, '')), ''),
    p_visitor_id,
    NULLIF(BTRIM(COALESCE(p_path, '')), ''),
    NULLIF(BTRIM(COALESCE(p_user_agent, '')), ''),
    now()
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_visita_referral(uuid, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_visita_referral(uuid, uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_visita_referral(uuid, uuid, text, text, text, text) TO authenticated;
