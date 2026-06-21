---
tipo: banco
area: schema-remoto-confirmado
status: ativo
tokens: medio
fonte:
  - supabase/migrations/20260618171439_remote_schema.sql
  - supabase/migrations/20260618172000_store_subscription_trial.sql
  - src/services/storage.js
  - cofre/02 - Banco de Dados/supabase.md
  - cofre/02 - Banco de Dados/migrations-rpcs.md
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> O schema remoto atual foi consolidado na baseline `20260618171439_remote_schema.sql`.
> Campos de trial/assinatura ficam na migration complementar `20260618172000_store_subscription_trial.sql`.

# Schema Remoto Confirmado

## Origem

A baseline `20260618171439_remote_schema.sql` foi mantida como snapshot do schema remoto confirmado. A migration `20260618172000_store_subscription_trial.sql` complementa o schema com campos de trial/assinatura.

## Tabelas relevantes

- `stores`
- `profiles`
- `store_members`
- `pneus`
- `leads`
- `store_referral_visits`

## Campos relevantes

`stores`:

- `id`
- `owner_id`
- `nome`
- `whatsapp`
- `telefone`
- `endereco`
- `cidade`
- `estado`
- `logo`
- `banner`
- `foto_capa`
- `cor_principal`
- `cor_secundaria`
- `seo_titulo`
- `seo_descricao`
- `plano`
- `plan_due_date`
- `subscription_status`
- `trial_started_at`
- `trial_ends_at`
- `subscription_started_at`
- `current_period_end`
- `payment_provider`
- `payment_subscription_id`
- `created_at`
- `slug`
- `tipo_vitrine`
- `template_vitrine`

`store_members`:

- `id`
- `store_id`
- `user_id`
- `email`
- `nome`
- `role`
- `status`
- `ref_code`
- `whatsapp`

`pneus`:

- `id`
- `loja_id`
- `marca`
- `modelo`
- `medida`
- `preco`
- `estoque`
- `descricao`
- `status`
- `foto_principal_url`
- `fotos`
- `tipo_veiculo`
- `created_by`
- `updated_by`

`leads`:

- `id`
- `loja_id`
- `produto_id`
- `seller_id`
- `store_id`
- `pneu_id`
- `ref_code`
- `attribution_source`
- `nome_cliente`
- `produto_nome`
- `produto_medida`
- `produto_preco`
- `origem`
- `created_at`
- `venda_confirmada`
- `venda_confirmada_em`
- `venda_confirmada_por`

`store_referral_visits`:

- `id`
- `store_id`
- `seller_id`
- `ref_code`
- `path`
- `visitor_id`
- `user_agent`
- `created_at`

## RPCs relevantes

- `registrar_lead`
- `registrar_visita_referral`
- `get_leads_com_vendedor`
- `get_public_referral_seller`
- `get_referral_seller`
- `atualizar_status_venda_lead`
- `excluir_lead`
- `is_store_owner`
- `is_store_member`
- `is_active_store_member`
- `is_valid_referral`

## Uso atual no frontend

- Dashboard: consulta `store_referral_visits` para visualizacoes e conversao por vendedor.
- Vitrine publica: chama `registrar_visita_referral` com `store_id`, `seller_id`, `ref_code`, `visitor_id`, `path` e `user_agent`.
- Leads: `registrar_lead` recebe `seller_id`, `ref_code` e `attribution_source` no fluxo atual.
- Assinatura/trial: `storage.js` inclui campos de assinatura em `STORE_COLUMNS`.

## Observacao importante

Notas antigas anteriores a 2026-06-18 podem dizer que `store_referral_visits` e `registrar_visita_referral` nao apareciam em migrations locais. Isso deixou de ser verdade depois da baseline `20260618171439_remote_schema.sql`.
