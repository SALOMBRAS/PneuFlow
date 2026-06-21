---
tipo: contexto
area: visao-geral
status: ativo
tokens: medio
fonte:
  - README.md
  - package.json
  - vite.config.js
  - vercel.json
  - index.html
  - src/index.css
  - src/main.jsx
  - src/App.jsx
  - src/pages/PrivacyPolicy.jsx
  - src/components/TermsAcceptanceModal.jsx
  - src/lib/supabase.js
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - src/utils/imageOptimizer.js
  - src/utils/subscriptionAccess.js
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Subscription.jsx
  - src/pages/SubscriptionReturn.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/StoreFront/StoreFront.css
  - src/pages/StoreFront/components/VehicleSearchBox.jsx
  - api/mercadopago/create-preference.js
  - supabase/migrations/20260618171439_remote_schema.sql
  - supabase/migrations/20260618172000_store_subscription_trial.sql
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> PneuFlow e uma SPA React/Vite para landing, auth, dashboard, catalogo, leads, vendedores, assinatura e vitrine publica.
> Supabase e a base de dados/Auth/Storage; Vercel serve SPA e API, incluindo Checkout Pro etapa 1.

# Visao Geral

## Finalidade

PneuFlow permite que lojas de pneus criem uma vitrine digital, organizem catalogo, captem leads pelo WhatsApp, acompanhem metricas e operem com dono/vendedores.

## Stack

- Frontend: React 19, Vite 8, React Router DOM 7.
- UI: CSS proprio, lucide-react, componentes visuais da landing.
- Backend/API local legado: `server.js` e `api/index.js`.
- Backend de pagamento: `api/mercadopago/create-preference.js` em Vercel Functions.
- Banco/Auth/Storage: Supabase via `@supabase/supabase-js`.
- Deploy: Vercel com rewrites em `vercel.json`.

## Comandos

- Desenvolvimento frontend: `npm run dev:frontend`
- Desenvolvimento backend legado: `npm run dev:backend`
- Desenvolvimento combinado: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview: `npm run preview`

## Pontos de entrada

- HTML: `index.html`.
- React: `src/main.jsx`.
- Rotas: `src/App.jsx`.
- API Vercel Mercado Pago: `api/mercadopago/create-preference.js`.
- API Vercel legado/mock: `api/index.js`.
- Backend local legado/mock: `server.js`.

## Rotas confirmadas

- `/`: landing publica.
- `/privacidade`: politica de privacidade.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/set-password`: auth.
- `/store/:storeSlug`: vitrine publica.
- `/dashboard`: dashboard autenticado.
- `/dashboard/catalog`: catalogo.
- `/dashboard/leads`: leads.
- `/dashboard/sellers`: vendedores.
- `/dashboard/settings`: configuracoes.
- `/assinatura`: tela de assinatura/trial encerrado.
- `/assinatura/retorno`: retorno visual do Checkout Pro.

## Banco e migrations

`supabase/migrations/` deve conter somente:

- `20260618171439_remote_schema.sql`
- `20260618172000_store_subscription_trial.sql`

Migrations antigas ficam em `docs/legacy-migrations/pre-baseline/` e nao devem voltar para a pasta ativa sem tarefa explicita.

`20260618171439_remote_schema.sql` contem `store_referral_visits`, `registrar_visita_referral`, `visitor_id` e `user_agent`.

`20260618172000_store_subscription_trial.sql` adiciona campos de trial/assinatura em `stores`.

## Variaveis de ambiente

Listar apenas nomes, nunca valores:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `APP_URL`

`.env` e `.env.local` nao devem ser commitados.

## Trial e assinatura

- A regra central fica em `src/utils/subscriptionAccess.js`.
- `getSubscriptionAccess(store)` calcula `hasStoreAccess`.
- Vencimento e inclusivo ate `23:59:59.999` do dia final.
- Dashboard redireciona para `/assinatura` quando `hasStoreAccess` e falso.
- `/assinatura` tem CTA para Checkout Pro, mas nao ativa assinatura no banco.
- Detalhes: [[../03 - Decisões/trial-e-assinatura|Trial e assinatura]].

## Vitrine publica

- A vitrine publica carrega loja e pneus por slug.
- Referral pode usar `ref` ou `vendedor`.
- Visitas usam `pneuflow_visitor_id` em `localStorage` e dedupe de 24h via RPC.
- Sem acesso comercial, a vitrine continua aberta, mas bloqueia WhatsApp/leads/CTAs comerciais.
- Detalhes: [[../03 - Decisões/vitrine-bloqueio-comercial|Vitrine com bloqueio comercial]].

## Mercado Pago

- Checkout Pro etapa 1 cria preferencia no backend e redireciona o lojista.
- `MERCADO_PAGO_ACCESS_TOKEN` e usado apenas no backend.
- Em localhost, nao envia `back_urls` nem `auto_return`.
- A pagina `/assinatura/retorno` e apenas visual.
- Webhook e ativacao automatica de assinatura ainda nao existem.
- Detalhes: [[../03 - Decisões/mercado-pago-checkout-pro-etapa-1|Mercado Pago Checkout Pro - etapa 1]].

## Vercel

- `vercel.json` precisa manter `/api/mercadopago/create-preference` antes do catch-all `/api/(.*)`.
- O fallback SPA aponta para `/index.html`.
- O fallback nao deve capturar `/src/main.jsx`, `/@vite/client` ou `/@react-refresh` no `vercel dev`.

## Identidade visual

- A landing e a referencia visual global: dark premium, amber/orange, cards escuros, bordas sutis, Inter/Outfit.
- `src/index.css` centraliza tokens globais e aliases legados.
- `src/pages/StoreFront/StoreFront.css` herda tokens globais por aliases locais.
- Detalhes: [[../03 - Decisões/padronizacao-visual-frontend|Padronizacao visual do frontend]].

## Riscos e cuidados

- `AGENTS.md` ainda contem blocos do template AIOX; a secao do Cofre e valida, mas comandos AIOX podem nao representar o app PneuFlow.
- `server.js` e `api/index.js` sao legado/mock e convivem com o fluxo principal Supabase.
- `docs/legacy-migrations/20260604_multi_seller_phase2.txt` nao e SQL executavel.
- Nao executar migrations, `supabase db push`, `db reset`, RLS/Auth ou webhook sem nova autorizacao.
- Nao copiar segredos para o Cofre.

## Estado atual

Snapshot operacional em [[estado-atual-do-projeto]].
