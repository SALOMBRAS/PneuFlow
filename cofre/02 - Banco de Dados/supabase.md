---
tipo: banco
area: supabase
status: ativo
tokens: medio
fonte:
  - src/lib/supabase.js
  - src/services/storage.js
  - supabase/migrations/20260604_multi_seller_phase1.sql
  - supabase/migrations/20260609_public_referral_seller.sql
  - supabase/migrations/20260609_seller_whatsapp.sql
  - supabase/migrations/20260612_delete_lead_rpc.sql
  - cofre/02 - Banco de Dados/schema-remoto-confirmado.md
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Supabase fornece Auth, tabelas, RPCs, storage e edge functions para o PneuFlow.
> Usar anon/publishable key no frontend; nunca service role.

# Supabase

## Configuração frontend

`src/lib/supabase.js` usa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Tabelas confirmadas por código/migrations

- `stores`
- `store_members`
- `pneus`
- `leads`
- `store_referral_visits` foi confirmado no schema remoto e usado pelo código, mas não está representado em migration local atual.

## Campos confirmados relevantes

`store_members`:

- `store_id`
- `user_id`
- `email`
- `nome`
- `role`
- `status`
- `ref_code`
- `whatsapp`

`pneus`:

- `loja_id`
- `created_by`
- `updated_by`
- `status`

`leads`:

- `loja_id`
- `produto_id`
- `seller_id`
- `ref_code`
- `attribution_source`
- `nome_cliente`
- `produto_nome`
- `produto_medida`
- `produto_preco`
- `origem`
- `venda_confirmada`

`store_referral_visits`:

- `store_id`
- `seller_id`
- `ref_code`
- `path`
- `created_at`

## Edge functions confirmadas no frontend

- `invite-seller`
- `manage-seller-access`

## RPCs usadas pelo frontend

- `get_leads_com_vendedor`
- `registrar_lead`
- `atualizar_status_venda_lead`
- `get_public_referral_seller`
- `get_referral_seller`
- `registrar_visita_referral`

`registrar_visita_referral` é chamada em `storage.js` e foi confirmada no schema remoto informado, mas não foi localizada nas migrations locais atuais.

## Regras de segurança

- Não usar service role no frontend.
- Não copiar valores de `.env` para notas.
- Confirmar impacto antes de alterar RLS/policies.
