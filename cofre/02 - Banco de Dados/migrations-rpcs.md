---
tipo: banco
area: migrations-rpcs
status: ativo
tokens: medio
fonte:
  - supabase/migrations/20260604_get_leads_com_vendedor.sql
  - supabase/migrations/20260604_lead_conversion_tracking.sql
  - supabase/migrations/20260604_multi_seller_phase1.sql
  - supabase/migrations/20260604_multi_seller_phase2.sql
  - supabase/migrations/20260607_sellers_can_view_store_tires.sql
  - supabase/migrations/20260609_active_members_can_view_store_tires.sql
  - supabase/migrations/20260609_public_referral_seller.sql
  - supabase/migrations/20260609_seller_whatsapp.sql
  - supabase/migrations/20260612_delete_lead_rpc.sql
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Migrations confirmam multi-vendedor, leads atribuídos, referral, WhatsApp por vendedor e exclusão RPC de lead.
> `store_referral_visits` e `registrar_visita_referral` existem no remoto confirmado, mas não aparecem nas migrations locais atuais.

# Migrations e RPCs

## Arquivos confirmados

- `20260604_multi_seller_phase1.sql`
- `20260604_multi_seller_phase2.sql`
- `20260604_get_leads_com_vendedor.sql`
- `20260604_lead_conversion_tracking.sql`
- `20260607_sellers_can_view_store_tires.sql`
- `20260609_active_members_can_view_store_tires.sql`
- `20260609_public_referral_seller.sql`
- `20260609_seller_whatsapp.sql`
- `20260612_delete_lead_rpc.sql`

## Funções/RPCs confirmadas

- `get_leads_com_vendedor`
- `atualizar_status_venda_lead`
- `registrar_lead`
- `is_store_owner`
- `is_store_member`
- `is_store_seller`
- `get_public_referral_seller`
- `get_referral_seller`
- `excluir_lead`

## Diferença remoto vs migrations locais

O schema remoto confirmado contém tabela `store_referral_visits` e RPC `registrar_visita_referral(p_store_id uuid, p_ref_code text, p_path text DEFAULT NULL)`.

Esses itens são usados por `src/services/storage.js`, porém não foram localizados nos arquivos em `supabase/migrations/` durante esta auditoria. Tratar como divergência documental/repositório antes de recriar ou alterar migrations.

## Políticas/RLS confirmadas

- `store_members` tem RLS.
- `pneus` tem políticas para vitrine pública e membros ativos.
- `leads` tem políticas para owner/seller e insert público.

## Cuidados

- Alterações em RPCs podem afetar dashboard, vitrine pública e links de vendedor.
- `excluir_lead` implementa exclusão direta e valida dono/owner ativo da loja.
