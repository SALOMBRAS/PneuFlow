-- 1. Update leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS venda_confirmada boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS venda_confirmada_em timestamptz,
ADD COLUMN IF NOT EXISTS venda_confirmada_por uuid;

-- 2. Create RPC to update lead sale status
CREATE OR REPLACE FUNCTION public.atualizar_status_venda_lead(
  p_lead_id uuid,
  p_venda_confirmada boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja_id uuid;
  v_seller_id uuid;
  v_ref_code text;
  v_is_owner boolean;
  v_is_assigned_seller boolean;
BEGIN
  -- Get lead info
  SELECT loja_id, seller_id, ref_code 
  INTO v_loja_id, v_seller_id, v_ref_code
  FROM public.leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  -- Check if user is owner of the store
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = v_loja_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Check if user is the assigned seller
  v_is_assigned_seller := (v_seller_id = auth.uid());

  -- Fallback check for ref_code if seller_id doesn't match
  IF NOT v_is_assigned_seller AND v_ref_code IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_id = v_loja_id AND user_id = auth.uid() AND ref_code = v_ref_code
    ) INTO v_is_assigned_seller;
  END IF;

  -- Permission check
  IF NOT v_is_owner AND NOT v_is_assigned_seller THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para atualizar este lead';
  END IF;

  -- Update lead
  UPDATE public.leads
  SET 
    venda_confirmada = p_venda_confirmada,
    venda_confirmada_em = CASE WHEN p_venda_confirmada THEN now() ELSE NULL END,
    venda_confirmada_por = CASE WHEN p_venda_confirmada THEN auth.uid() ELSE NULL END
  WHERE id = p_lead_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_status_venda_lead(uuid, boolean) TO authenticated;

-- 3. Update get_leads_com_vendedor to include new fields
DROP FUNCTION IF EXISTS public.get_leads_com_vendedor(uuid);

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
  vendedor_ref_code text,
  venda_confirmada boolean,
  venda_confirmada_em timestamptz,
  venda_confirmada_por uuid
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
    sm.ref_code AS vendedor_ref_code,
    l.venda_confirmada,
    l.venda_confirmada_em,
    l.venda_confirmada_por
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
