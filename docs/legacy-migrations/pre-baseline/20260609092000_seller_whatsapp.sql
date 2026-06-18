-- Add individual WhatsApp numbers for store sellers.
ALTER TABLE public.store_members
ADD COLUMN IF NOT EXISTS whatsapp text;

-- Public storefront resolver for seller referral links.
-- Returns only active sellers from the requested store with a usable WhatsApp.
DROP FUNCTION IF EXISTS public.get_referral_seller(uuid, text);

CREATE OR REPLACE FUNCTION public.get_referral_seller(
  p_store_id uuid,
  p_ref_code text
)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  user_id uuid,
  seller_id uuid,
  nome text,
  email text,
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
    sm.store_id,
    sm.user_id,
    sm.user_id AS seller_id,
    sm.nome,
    sm.email,
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

GRANT EXECUTE ON FUNCTION public.get_referral_seller(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referral_seller(uuid, text) TO authenticated;
