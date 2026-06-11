-- Public, minimal seller resolver for storefront referral links.
-- Does not expose store_members directly and returns only fields needed by the public storefront.
CREATE OR REPLACE FUNCTION public.get_public_referral_seller(
  p_store_id uuid,
  p_ref_code text
)
RETURNS TABLE (
  id uuid,
  nome text,
  ref_code text,
  whatsapp text,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.get_public_referral_seller(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_referral_seller(uuid, text) TO authenticated;
