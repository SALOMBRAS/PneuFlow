---
tipo: contexto
area: estado-atual-do-projeto
status: ativo
tokens: medio
fonte:
  - git status
  - git log --oneline --decorate -n 20
  - package.json
  - vercel.json
  - src/App.jsx
  - src/index.css
  - src/utils/subscriptionAccess.js
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/Subscription.jsx
  - src/pages/SubscriptionReturn.jsx
  - api/mercadopago/create-preference.js
  - supabase/migrations/20260618171439_remote_schema.sql
  - supabase/migrations/20260618172000_store_subscription_trial.sql
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> Estado auditado em 2026-06-21: PneuFlow esta em `main`, com Checkout Pro etapa 1 no commit local `01ae562` ainda nao enviado para `origin/main`.
> A pasta ativa de migrations contem apenas a baseline remota e a migration de trial; nao executar Supabase sem nova autorizacao.

# Estado Atual do Projeto

## Git

- Branch atual confirmada: `main`.
- `origin/main` aponta para `e1dc1ae feat: bloquear CTAs da vitrine apos trial vencido`.
- `HEAD` local: `01ae562 feat: integrar Checkout Pro do Mercado Pago`.
- Estado auditado no inicio da tarefa: reposititorio local estava `ahead 1` em relacao ao remoto.
- Mudancas nao commitadas ja existentes antes desta auditoria:
  - `src/index.css`
  - `src/pages/StoreFront/StoreFront.css`
  - `cofre/00 - Contexto/visao-geral.md`
- As mudancas nao commitadas sao da primeira padronizacao visual global e da nota de contexto relacionada.
- Esta auditoria tambem atualizou/criou notas do Cofre; ver `git status --short` final da tarefa para a lista completa.

## Migrations ativas

`supabase/migrations/` deve conter somente:

- `20260618171439_remote_schema.sql`
- `20260618172000_store_subscription_trial.sql`

As migrations antigas pre-baseline ficam arquivadas em `docs/legacy-migrations/pre-baseline/`.

## Estado funcional confirmado por codigo

- Landing page publica em `/`.
- Auth em `/login`, `/register`, reset/callback/set-password.
- Dashboard em `/dashboard` com catalogo, leads, vendedores e configuracoes.
- Vitrine publica em `/store/:storeSlug`.
- Assinatura/trial encerrado em `/assinatura`.
- Retorno visual do Checkout Pro em `/assinatura/retorno`.
- Trial/assinatura centralizados em `src/utils/subscriptionAccess.js`.
- Dashboard bloqueia acesso e redireciona para `/assinatura` quando `hasStoreAccess` e falso.
- Vitrine publica continua abrindo quando `hasStoreAccess` e falso, mas bloqueia CTAs comerciais.
- Checkout Pro etapa 1 cria preferencia no backend e redireciona para Mercado Pago, sem webhook e sem ativar assinatura automaticamente.
- Vercel Dev usa `vercel.json` com rota especifica de Mercado Pago antes do catch-all de API e fallback de SPA para `/index.html`.
- `npm run build` e o comando de build padrao a validar depois de mudancas.

## Seguranca auditada

- `.env` e `.env.local` nao aparecem rastreados nem staged.
- `.gitignore` contem `.env`, `.env.local`, `.env.*.local` e `supabase/functions/.env`.
- `MERCADO_PAGO_ACCESS_TOKEN` deve existir apenas como nome de variavel/documentacao, nunca como valor versionado.
- Chaves reais do Supabase e Mercado Pago nao devem ser copiadas para o Cofre.

## Pendencias atuais

- Enviar o commit local `01ae562` para o GitHub quando as credenciais/ambiente permitirem.
- Finalizar teste sandbox do Mercado Pago com Seller Test User e Buyer Test User.
- Criar webhook do Mercado Pago em etapa propria.
- Atualizar assinatura automaticamente no Supabase apos pagamento aprovado.
- Persistir dados de pagamento quando o modelo estiver definido:
  - `payment_provider`
  - `payment_subscription_id`
  - `current_period_end`
  - `subscription_status`
- Configurar variaveis de ambiente na Vercel antes de testar producao.
- Nao subir `.env.local`.
- Revisar visual tela por tela depois da primeira padronizacao global.
- No notebook novo, rodar `git pull` ou `git clone`, instalar dependencias e validar `npm run build`.
