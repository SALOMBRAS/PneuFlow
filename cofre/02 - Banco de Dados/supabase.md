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
  - supabase/migrations/20260623143000_signup_store_provisioning.sql
  - supabase/migrations/20260624120000_stock_sale_quantity.sql
  - cofre/02 - Banco de Dados/schema-remoto-confirmado.md
atualizado: 2026-06-25
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
- `desired_quantity` (migration local pendente de aplicar)
- `sold_quantity` (migration local pendente de aplicar)

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
- `ensure_store_provisioned`: cria/garante `profiles`, `stores` e o membro dono em `store_members` para usuarios autenticados de cadastro normal. Usa `auth.uid()` e `user_metadata`; antes de criar loja, retorna a loja de `store_members.status = active` para proteger vendedores e membros existentes.

## Regras de seguranca

- Nao usar service role no frontend.
- Nao copiar valores de `.env` para notas.
- Confirmar impacto antes de alterar RLS/policies.

## Estado atual das migrations

- supabase/migrations/ contem a baseline 20260618171439_remote_schema.sql, a trial 20260618172000_store_subscription_trial.sql, a RPC de provisionamento 20260623143000_signup_store_provisioning.sql e a migration local 20260624120000_stock_sale_quantity.sql.
- 20260623143000_signup_store_provisioning.sql foi aplicada ao remoto em etapa autorizada para garantir profiles, stores e store_members apos cadastro confirmado.
- 20260624120000_stock_sale_quantity.sql adiciona quantidade desejada/vendida e baixa atomica de estoque por RPC; confirmar/aplicar no Supabase remoto em etapa propria autorizada.
- Migrations antigas ficam em `docs/legacy-migrations/pre-baseline/` e nao devem ser executadas como ativas.
- O schema remoto confirmado esta documentado em [[schema-remoto-confirmado]].

## Estoque e vendas

Detalhes da regra de estoque, quantidade desejada, quantidade vendida e RPC atomica ficam em [[../03 - Decisões/estoque-e-vendas|Estoque e vendas]].
