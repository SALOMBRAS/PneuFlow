-- Phase 1: Multi-Seller System - Database Schema & RLS

-- 1. Create store_members table
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    nome TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'seller')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_members_store_user ON public.store_members (store_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_members_store_email ON public.store_members (store_id, LOWER(email));

-- 2. Update pneus table
ALTER TABLE public.pneus ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.pneus ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Update leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_store_owner(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_id = target_store_id
          AND user_id = auth.uid()
          AND role = 'owner'
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_store_member(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_id = target_store_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_store_seller(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_id = target_store_id
          AND user_id = auth.uid()
          AND role = 'seller'
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Backfill existing data
-- Add owners to store_members
INSERT INTO public.store_members (store_id, user_id, email, role, status)
SELECT id, owner_id, (SELECT email FROM auth.users WHERE id = owner_id), 'owner', 'active'
FROM public.stores
ON CONFLICT DO NOTHING;

-- Update pneus.created_by
UPDATE public.pneus p
SET created_by = s.owner_id, updated_by = s.owner_id
FROM public.stores s
WHERE p.loja_id = s.id AND p.created_by IS NULL;

-- Update leads.seller_id (based on product owner)
UPDATE public.leads l
SET seller_id = p.created_by
FROM public.pneus p
WHERE l.produto_id = p.id AND l.seller_id IS NULL;

-- 6. RLS Policies

-- Enable RLS on new table
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- store_members policies
CREATE POLICY "Owners can see all members of their store"
ON public.store_members FOR SELECT
USING (public.is_store_owner(store_id));

CREATE POLICY "Sellers can see their own member record"
ON public.store_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Owners can invite/manage members"
ON public.store_members FOR ALL
USING (public.is_store_owner(store_id));

-- pneus policies (updated)
ALTER TABLE public.pneus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see active tires in public storefront"
ON public.pneus FOR SELECT
USING (status = 'ativo');

CREATE POLICY "Owners can manage all tires of their store"
ON public.pneus FOR ALL
USING (public.is_store_owner(loja_id));

CREATE POLICY "Sellers can see their own tires"
ON public.pneus FOR SELECT
USING (public.is_store_seller(loja_id) AND created_by = auth.uid());

CREATE POLICY "Sellers can insert tires to their store"
ON public.pneus FOR INSERT
WITH CHECK (public.is_store_seller(loja_id) AND created_by = auth.uid());

CREATE POLICY "Sellers can update their own tires"
ON public.pneus FOR UPDATE
USING (public.is_store_seller(loja_id) AND created_by = auth.uid())
WITH CHECK (public.is_store_seller(loja_id) AND created_by = auth.uid());

-- leads policies (updated)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can see all leads of their store"
ON public.leads FOR SELECT
USING (public.is_store_owner(loja_id));

CREATE POLICY "Sellers can see their own leads"
ON public.leads FOR SELECT
USING (public.is_store_seller(loja_id) AND seller_id = auth.uid());

CREATE POLICY "Public can insert leads"
ON public.leads FOR INSERT
WITH CHECK (true);

-- 7. Update registrar_lead function to support seller_id
CREATE OR REPLACE FUNCTION public.registrar_lead(
    p_loja_id UUID,
    p_produto_id UUID DEFAULT NULL,
    p_nome_cliente TEXT DEFAULT NULL,
    p_produto_nome TEXT DEFAULT NULL,
    p_produto_medida TEXT DEFAULT NULL,
    p_produto_preco NUMERIC DEFAULT 0,
    p_origem TEXT DEFAULT 'whatsapp'
)
RETURNS UUID AS $$
DECLARE
    v_lead_id UUID;
    v_seller_id UUID;
BEGIN
    -- Resolve seller_id from product
    IF p_produto_id IS NOT NULL THEN
        SELECT created_by INTO v_seller_id
        FROM public.pneus
        WHERE id = p_produto_id;
    END IF;

    INSERT INTO public.leads (
        loja_id,
        produto_id,
        seller_id,
        nome_cliente,
        produto_nome,
        produto_medida,
        produto_preco,
        origem
    ) VALUES (
        p_loja_id,
        p_produto_id,
        v_seller_id,
        p_nome_cliente,
        p_produto_nome,
        p_produto_medida,
        p_produto_preco,
        p_origem
    ) RETURNING id INTO v_lead_id;

    RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- stores policies (updated)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stores"
ON public.stores FOR SELECT
USING (true);

CREATE POLICY "Owners can update their own store"
ON public.stores FOR UPDATE
USING (public.is_store_owner(id));
