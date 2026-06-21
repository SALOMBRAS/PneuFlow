---
tipo: decisao
area: mercado-pago-checkout-pro
status: ativo
tokens: baixo
decisao: "Criar primeira etapa do Checkout Pro sem ativacao automatica de assinatura"
data: 2026-06-18
fonte:
  - src/App.jsx
  - src/pages/Subscription.jsx
  - src/pages/SubscriptionReturn.jsx
  - api/mercadopago/create-preference.js
  - vercel.json
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> A primeira etapa do Mercado Pago cria uma preferencia de Checkout Pro no backend e redireciona o lojista para pagamento.
> A pagina de retorno e apenas visual; webhook e ativacao automatica ainda nao existem.
> Em teste local, `APP_URL` com `localhost` ou `127.0.0.1` nao envia `back_urls` nem `auto_return`.

# Mercado Pago Checkout Pro - Etapa 1

## Escopo confirmado

- Endpoint Vercel: `api/mercadopago/create-preference.js`.
- Rota publica da funcao: `/api/mercadopago/create-preference`.
- Tela de origem: `src/pages/Subscription.jsx`.
- Rota de retorno visual: `/assinatura/retorno`.
- Tela de retorno: `src/pages/SubscriptionReturn.jsx`.
- Valor: R$ 39,00.
- Item: `Assinatura PneuFlow - Plano PRO`.
- SDK: `mercadopago@3.1.0`, usando `MercadoPagoConfig` e `Preference`.

## Status atual auditado

- O botao em `/assinatura` chama `/api/mercadopago/create-preference` via `POST`.
- A preferencia e criada no backend.
- O Checkout Pro sandbox abre corretamente quando a preferencia retorna `sandboxInitPoint`.
- O pagamento sandbox ainda nao foi finalizado com sucesso no fluxo completo.
- Webhook ainda nao existe.
- A assinatura ainda nao e ativada automaticamente no Supabase.
- A pagina `/assinatura/retorno` e apenas visual.

## Seguranca

- `MERCADO_PAGO_ACCESS_TOKEN` e lido somente no backend/API via `process.env`.
- O frontend chama apenas `/api/mercadopago/create-preference`.
- Em `vercel.json`, a rota especifica do Mercado Pago deve vir antes do catch-all `/api/(.*)` e usar destino sem `.js`: `/api/mercadopago/create-preference`.
- Em `vercel dev`, se `process.env` nao carregar `MERCADO_PAGO_ACCESS_TOKEN`/`APP_URL`, a funcao pode usar fallback local restrito a essas duas chaves em `.env.local`; esse fallback nao roda em `VERCEL_ENV=production`.
- Logs de debug da funcao podem registrar metodo, presenca do token e erro do SDK, mas nunca o valor do token.
- Para teste sandbox, `MERCADO_PAGO_ACCESS_TOKEN` deve pertencer ao Seller Test User `TESTUSER1128828319103991222` (`3484025164`) e o checkout deve ser pago com o Buyer Test User `TESTUSER7217731358368666817` (`3484025166`).
- Em ambiente local/desenvolvimento, a funcao consulta `/users/me` com o token carregado, loga apenas `id`, `nickname`, email mascarado e `site_id`, e bloqueia a criacao da preferencia se o token nao for do Seller Test User esperado.
- Nenhum token deve ser salvo no repositorio ou impresso em log.
- `.env.local` nao deve ser commitado.

## Contrato da preferencia

- `external_reference`: `store.id` quando existir, com fallback para `store.slug`.
- `metadata`: `store_id`, `store_slug`, `store_name`, `plan: pro`, `source: pneuflow`.
- `back_urls`, somente quando `APP_URL` for uma URL publica `https`:
  - success: `${APP_URL}/assinatura/retorno?status=success`
  - failure: `${APP_URL}/assinatura/retorno?status=failure`
  - pending: `${APP_URL}/assinatura/retorno?status=pending`
- `auto_return`: `approved`, somente junto com `back_urls`.
- Se `APP_URL` for `localhost`, `127.0.0.1`, vazio ou invalido, a preferencia e criada sem `back_urls` e sem `auto_return`.

## Fora do escopo desta etapa

- Nao ativa plano automaticamente.
- Nao altera banco.
- Nao cria migration.
- Nao cria webhook.
- Nao altera regra de trial.
- Nao altera bloqueio comercial da vitrine.

## Proximos passos

- Finalizar teste sandbox com Seller Test User e Buyer Test User corretos.
- Implementar webhook em etapa separada para validar pagamento e atualizar `stores.subscription_status`.
- Registrar id de pagamento/preferencia quando houver modelo de persistencia definido.
- Configurar variaveis de ambiente na Vercel antes de testar producao.
- Nao commitar `.env.local`.
