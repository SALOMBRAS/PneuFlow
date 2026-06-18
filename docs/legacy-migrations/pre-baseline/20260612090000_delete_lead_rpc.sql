CREATE OR REPLACE FUNCTION public.excluir_lead(
  p_lead_id uuid,
  p_store_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner boolean;
  v_deleted_count integer;
BEGIN
  IF p_lead_id IS NULL OR p_store_id IS NULL THEN
    RAISE EXCEPTION 'Lead ou loja inválidos';
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
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para excluir este lead';
  END IF;

  DELETE FROM public.leads
  WHERE id = p_lead_id
    AND loja_id = p_store_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Lead não encontrado ou já removido';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.excluir_lead(uuid, uuid) TO authenticated;
