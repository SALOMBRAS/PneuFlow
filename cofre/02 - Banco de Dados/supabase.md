---
tipo: banco
area: supabase
status: ativo
tokens: medio
fonte:
  - src/lib/supabase.js
  - src/services/storage.js
  - supabase/migrations/20260618171439_remote_schema.sql
  - supabase/migrations/20260618172000_store_subscription_trial.sql
  - cofre/02 - Banco de Dados/schema-remoto-confirmado.md
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> Supabase fornece Auth, tabelas, RPCs, storage e edge functions para o PneuFlow.
> Usar anon/publishable key no frontend; nunca service role.

# Supabase

## Configuracao frontend

`src/lib/supabase.js` usa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Tabelas confirmadas por codigo/migrations

- `stores`
- `store_members`
- `pneus`
- `leads`
- `store_referral_visits`

## Campos de assinatura em `stores`

- `subscription_status`
- `trial_started_at`
- `trial_ends_at`
- `subscription_started_at`
- `current_period_end`
- `payment_provider`
- `payment_subscription_id`

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
- `visitor_id`
- `user_agent`
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

`registrar_visita_referral` e chamada em `storage.js` com `store_id`, `seller_id`, `ref_code`, `visitor_id`, `path` e `user_agent`.

## Regras de seguranca

- Nao usar service role no frontend.
- Nao copiar valores de `.env` para notas.
- Confirmar impacto antes de alterar RLS/policies.

## Estado atual das migrations

- `supabase/migrations/` deve conter somente `20260618171439_remote_schema.sql` e `20260618172000_store_subscription_trial.sql`.
- Migrations antigas ficam em `docs/legacy-migrations/pre-baseline/` e nao devem ser executadas como ativas.
- O schema remoto confirmado esta documentado em [[schema-remoto-confirmado]].
