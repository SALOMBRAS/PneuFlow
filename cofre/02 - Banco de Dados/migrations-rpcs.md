---
tipo: banco
area: migrations-rpcs
status: ativo
tokens: medio
fonte:
  - supabase/migrations/20260618171439_remote_schema.sql
  - supabase/migrations/20260618172000_store_subscription_trial.sql
  - supabase/migrations/20260624120000_stock_sale_quantity.sql
  - supabase/migrations/20260625143000_lead_attendance_status.sql
  - supabase/migrations/20260625150000_lead_expiration_cron.sql
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
atualizado: 2026-06-25
tags: []
---

> [!tldr]
> A pasta ativa tem a baseline, trial, a migration local de estoque por venda e duas migrations locais de status/expiracao de leads.
> Migrations antigas arquivadas continuam fora da pasta ativa e nao devem ser executadas.

# Migrations e RPCs

## Migrations ativas

Arquivos ativos/locais confirmados em `supabase/migrations/`:

- `20260618171439_remote_schema.sql`
- `20260618172000_store_subscription_trial.sql`
- `20260624120000_stock_sale_quantity.sql` (criada localmente em 2026-06-24; pendente de aplicar no remoto)
- `20260625143000_lead_attendance_status.sql` (criada localmente em 2026-06-25; pendente de aplicar no remoto)
- `20260625150000_lead_expiration_cron.sql` (criada localmente em 2026-06-25; pendente de aplicar no remoto)

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
- `atualizar_status_atendimento_lead`
- `atualizar_status_venda_lead`
- `expirar_leads_inativos`
- `excluir_lead`
- `get_public_referral_seller`
- `get_referral_seller`
- `registrar_visita_referral`

## Estoque por venda

`20260624120000_stock_sale_quantity.sql` prepara:

- `leads.desired_quantity`
- `leads.sold_quantity`
- `registrar_lead(..., p_desired_quantity)` sem decremento de estoque;
- `atualizar_status_venda_lead(..., p_sold_quantity)` com decremento/restauracao atomica em `pneus.estoque`;
- `get_leads_com_vendedor` retornando quantidade desejada e vendida.

Nao executar `supabase db push` ou aplicar essa migration sem autorizacao explicita.

## Status e expiracao de leads

`20260625143000_lead_attendance_status.sql` prepara:

- `leads.status_atendimento` com `em_atendimento`, `vendido` e `desistencia`;
- `leads.last_interaction_at` para marcar a ultima interacao humana relevante;
- `atualizar_status_atendimento_lead(..., p_sold_quantity, p_desired_quantity)` com permissao em RPC:
  - owner pode reabrir lead, desfazer venda e ajustar quantidades;
  - vendedor responsavel pode sair de `em_atendimento` para `vendido` ou `desistencia`;
  - vendedor responsavel pode corrigir `desired_quantity` e `sold_quantity`;
  - vendedor nao pode reabrir lead vendido ou em desistencia;
- `registrar_lead` sempre criando lead com status inicial `em_atendimento`;
- `get_leads_com_vendedor` retornando status, `last_interaction_at`, `desired_quantity` e `sold_quantity`.

`20260625150000_lead_expiration_cron.sql` prepara:

- funcao interna `public.expirar_leads_inativos_job()` sem dependencia de `auth.uid()`;
- tentativa idempotente de instalar `pg_cron` apenas se a extensao estiver disponivel;
- job `pneuflow-expire-inactive-leads` com frequencia `5 * * * *`;
- expiracao automatica de leads em `em_atendimento` com mais de 24h sem interacao;
- revogacao de execucao publica da funcao interna do job.

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
