-- Allow all active sellers in a store to view the full store tire catalog
-- while keeping public storefront visibility and seller write restrictions intact.

DROP POLICY IF EXISTS "Sellers can see their own tires" ON public.pneus;

CREATE POLICY "Sellers can see all tires in their store"
ON public.pneus
FOR SELECT
USING (public.is_store_seller(loja_id));
