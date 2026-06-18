CREATE OR REPLACE FUNCTION public.get_leads_com_vendedor(p_store_id uuid)
RETURNS TABLE (
  id uuid,
  loja_id uuid,
  seller_id uuid,
  ref_code text,
  attribution_source text,
  nome_cliente text,
  produto_nome text,
  produto_medida text,
  produto_preco numeric,
  origem text,
  created_at timestamptz,
  vendedor_nome text,
  vendedor_email text,
  vendedor_ref_code text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
    sm.ref_code AS vendedor_ref_code
  FROM public.leads l
  LEFT JOIN public.store_members sm
    ON sm.store_id = l.loja_id
    AND (
      sm.user_id = l.seller_id
      OR (
        l.ref_code IS NOT NULL
        AND sm.ref_code = l.ref_code
      )
    )
  WHERE l.loja_id = p_store_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.stores s
        WHERE s.id = p_store_id
        AND s.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.store_members m
        WHERE m.store_id = p_store_id
        AND m.user_id = auth.uid()
      )
    )
  ORDER BY l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_leads_com_vendedor(uuid) TO authenticated;
