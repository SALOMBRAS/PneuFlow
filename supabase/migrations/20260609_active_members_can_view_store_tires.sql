-- Allow active store members to view the full tire catalog for their own store.
-- This prevents duplicate product registration while preserving write restrictions.

DROP POLICY IF EXISTS "Sellers can see their own tires" ON public.pneus;
DROP POLICY IF EXISTS "Sellers can see all tires in their store" ON public.pneus;
DROP POLICY IF EXISTS "Active members can see all tires in their store" ON public.pneus;

CREATE POLICY "Active members can see all tires in their store"
ON public.pneus
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_members sm
    WHERE sm.store_id = pneus.loja_id
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
      AND sm.role IN ('owner', 'seller')
  )
);
