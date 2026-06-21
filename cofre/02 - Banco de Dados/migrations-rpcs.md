---
tipo: banco
area: migrations-rpcs
status: ativo
tokens: medio
fonte:
  - supabase/migrations/20260618171439_remote_schema.sql
  - supabase/migrations/20260618172000_store_subscription_trial.sql
  - docs/legacy-migrations/pre-baseline/README.md
  - docs/legacy-migrations/pre-baseline/20260604090000_get_leads_com_vendedor.sql
  - docs/legacy-migrations/pre-baseline/20260604091000_lead_conversion_tracking.sql
  - docs/legacy-migrations/pre-baseline/20260604092000_multi_seller_phase1.sql
  - docs/legacy-migrations/pre-baseline/20260607090000_sellers_can_view_store_tires.sql
  - docs/legacy-migrations/pre-baseline/20260609090000_active_members_can_view_store_tires.sql
  - docs/legacy-migrations/pre-baseline/20260609091000_public_referral_seller.sql
  - docs/legacy-migrations/pre-baseline/20260609092000_seller_whatsapp.sql
  - docs/legacy-migrations/pre-baseline/20260612090000_delete_lead_rpc.sql
  - docs/legacy-migrations/pre-baseline/20260615090000_store_referral_visits_visitor_tracking.sql
  - docs/legacy-migrations/pre-baseline/20260616090000_store_referral_visits_nullable_referral.sql
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> A pasta ativa `supabase/migrations/` deve conter somente a baseline remota e a migration de trial.
> As migrations antigas foram arquivadas em `docs/legacy-migrations/pre-baseline/` e nao devem ser executadas como ativas.

# Migrations e RPCs

## Migrations ativas

Arquivos ativos confirmados em `supabase/migrations/`:

- `20260618171439_remote_schema.sql`
- `20260618172000_store_subscription_trial.sql`

Resultado confirmado anteriormente via Supabase CLI:

| Local | Remote |
|---|---|
| `20260618171439` | `20260618171439` |
| `20260618172000` | `20260618172000` |

Nao executar `supabase db push`, migrations antigas ou `db reset` sem nova autorizacao.

## Baseline remota

`20260618171439_remote_schema.sql` representa a baseline remota atual e inclui:

- tabelas principais (`stores`, `profiles`, `store_members`, `pneus`, `leads`, `store_referral_visits`);
- RPCs de leads, vendedores, referral e visitas;
- `store_referral_visits.visitor_id`;
- `store_referral_visits.user_agent`;
- `registrar_visita_referral` com dedupe por `store_id` + `visitor_id` nas ultimas 24 horas;
- `ref_code` e `seller_id` nullable em `store_referral_visits`, permitindo visita sem referral.

## Trial/assinatura

`20260618172000_store_subscription_trial.sql` adiciona campos de assinatura em `public.stores`:

- `subscription_status`
- `trial_started_at`
- `trial_ends_at`
- `subscription_started_at`
- `current_period_end`
- `payment_provider`
- `payment_subscription_id`

Tambem adiciona constraint para `subscription_status` com:

- `trialing`
- `active`
- `past_due`
- `canceled`
- `blocked`

## RPCs usadas pelo frontend

- `get_leads_com_vendedor`
- `registrar_lead`
- `atualizar_status_venda_lead`
- `excluir_lead`
- `get_public_referral_seller`
- `get_referral_seller`
- `registrar_visita_referral`

## Historico arquivado

Arquivos antigos de `20260604...` ate `20260616...` foram arquivados em `docs/legacy-migrations/pre-baseline/`.

Eles nao devem voltar para `supabase/migrations/` como migrations ativas, salvo tarefa explicita de reconstruir historico.

## Arquivo nao SQL

`docs/legacy-migrations/20260604_multi_seller_phase2.txt` contem texto de prompt/tarefa e nao deve ser executado como SQL.

## Regressao obrigatoria antes de mexer em banco

- Comparar Local/Remote no Supabase CLI.
- Confirmar se a migration pretendida nao duplica baseline.
- Confirmar impacto em `storage.js`, dashboard, vitrine publica, leads e vendedores.
- Nunca expor service role ou connection string.
