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
  - supabase/migrations/20260615_store_referral_visits_visitor_tracking.sql
  - cofre/02 - Banco de Dados/schema-remoto-confirmado.md
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Migrations confirmam multi-vendedor, leads atribuidos, referral, WhatsApp por vendedor e exclusao RPC de lead.
> `store_referral_visits` e `registrar_visita_referral` agora tem migration local nova com `visitor_id`, `user_agent` e dedupe de 24h.

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
- `20260615_store_referral_visits_visitor_tracking.sql`

## Funcoes/RPCs confirmadas

- `get_leads_com_vendedor`
- `atualizar_status_venda_lead`
- `registrar_lead`
- `is_store_owner`
- `is_store_member`
- `is_store_seller`
- `get_public_referral_seller`
- `get_referral_seller`
- `excluir_lead`
- `registrar_visita_referral`

## Diferenca remoto vs migrations locais

A migration nova define `registrar_visita_referral(p_store_id uuid, p_seller_id uuid DEFAULT NULL, p_ref_code text DEFAULT NULL, p_visitor_id text DEFAULT NULL, p_path text DEFAULT NULL, p_user_agent text DEFAULT NULL)` e acrescenta `visitor_id`/`user_agent` em `store_referral_visits`.

Se o banco remoto ainda estiver sem essa evolucao, aplicar a migration nova no SQL Editor antes de depender das metricas de visualizacao por visitante.

## Divergencia em arquivo local

`supabase/migrations/20260604_multi_seller_phase2.sql` nao contem SQL executavel: o arquivo guarda texto de uma tarefa/prompt sobre Leads de WhatsApp. Nao usar esse arquivo como migration real sem limpeza previa.

## Polticas/RLS confirmadas

- `store_members` tem RLS.
- `pneus` tem politicas para vitrine publica e membros ativos.
- `leads` tem politicas para owner/seller e insert publico.

## Cuidados

- Alteracoes em RPCs podem afetar dashboard, vitrine publica e links de vendedor.
- `excluir_lead` implementa exclusao direta e valida dono/owner ativo da loja.
