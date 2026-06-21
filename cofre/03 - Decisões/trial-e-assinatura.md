---
tipo: decisao
area: trial-e-assinatura
status: ativo
tokens: medio
decisao: "Centralizar regra de acesso comercial em getSubscriptionAccess e tratar vencimento como fim do dia"
data: 2026-06-18
fonte:
  - src/utils/subscriptionAccess.js
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/Subscription.jsx
  - src/pages/SubscriptionReturn.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - supabase/migrations/20260618172000_store_subscription_trial.sql
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> Acesso de trial/assinatura e calculado em `getSubscriptionAccess(store)`.
> Vencimento e inclusivo ate 23:59:59.999 do dia de `trial_ends_at` ou `current_period_end`.

# Trial e Assinatura

## Campos em `public.stores`

A migration `20260618172000_store_subscription_trial.sql` adiciona:

- `subscription_status`
- `trial_started_at`
- `trial_ends_at`
- `subscription_started_at`
- `current_period_end`
- `payment_provider`
- `payment_subscription_id`

`subscription_status` aceita:

- `trialing`
- `active`
- `past_due`
- `canceled`
- `blocked`

## Regra central

`src/utils/subscriptionAccess.js` exporta:

- `SUBSCRIPTION_STATUSES`
- `endOfLocalDay(dateValue)`
- `getSubscriptionAccess(store, now)`
- `formatSubscriptionDate(date)`
- `getTrialMessage(access)`

`endOfLocalDay` ajusta a data para `23:59:59.999`. Assim, se `trial_ends_at` for 18/06/2026, o acesso continua liberado durante todo o dia 18/06/2026 e bloqueia somente depois.

## Estados

- Trial ativo: `subscription_status === 'trialing'` e `now <= endOfLocalDay(trial_ends_at)`.
- Trial vencido: status diferente de `active`, data valida em `trial_ends_at` e `now > endOfLocalDay(trial_ends_at)`.
- Plano ativo: `subscription_status === 'active'`.
- Acesso liberado: plano ativo ou trial ativo.
- `hasStoreAccess` e a chave usada pelo dashboard e pela vitrine publica.

## Dashboard

`src/pages/Dashboard/DashboardLayout.jsx` chama `getSubscriptionAccess(store)`.

- Se `hasStoreAccess` for falso, redireciona para `/assinatura`.
- Se trial estiver ativo, mostra aviso no topo do dashboard com CTA para assinatura.
- O dashboard nao altera o banco ao verificar acesso.

## Pagina `/assinatura`

`src/pages/Subscription.jsx`:

- Usa `StoreProvider` para carregar a loja atual.
- Se nao houver sessao, redireciona para `/login`.
- Se `hasStoreAccess` for verdadeiro, redireciona para `/dashboard`.
- Se o acesso estiver bloqueado, mostra a tela de assinatura.
- O botao de assinatura chama `/api/mercadopago/create-preference`.

## Pagina `/assinatura/retorno`

`src/pages/SubscriptionReturn.jsx` e apenas visual.

- `status=success`: informa que o pagamento foi aprovado e sera confirmado.
- `status=pending`: informa pagamento pendente.
- `status=failure`: informa pagamento nao aprovado.
- Nao ativa assinatura no banco.
- Nao cria webhook.

## Pendencias

- Criar webhook do Mercado Pago.
- Validar pagamento aprovado no backend.
- Atualizar `subscription_status`, `payment_provider`, `payment_subscription_id` e `current_period_end`.
- Definir como tratar renovacao mensal e periodo ativo pago.
