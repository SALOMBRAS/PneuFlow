---
tipo: arquitetura
area: dependencias-compartilhadas
camada: frontend-servicos
status: ativo
tokens: medio
fonte:
  - src/App.jsx
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - src/utils/visitorId.js
  - src/utils/imageOptimizer.js
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/LandingPage.jsx
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> `storage.js`, `StoreContext`, Supabase e rotas em `App.jsx` sao os pontos compartilhados mais sensiveis.
> Mudancas neles afetam dashboard, catalogo, leads, vendedores e vitrine publica.

# Dependencias Compartilhadas

## Pontos de entrada compartilhados

- `src/App.jsx`: rotas publicas, auth, dashboard e vitrine publica.
- `src/contexts/StoreContext.jsx`: sessao, usuario, loja atual, membro e role.
- `src/services/storage.js`: camada central para Supabase, Auth, loja, pneus, leads, vendedores, metricas e uploads.
- `src/utils/imageOptimizer.js`: otimizacao de fotos de pneus antes do upload.
- `src/utils/visitorId.js`: visitor id persistente da vitrine publica.

## Mapa de impacto

`storageService.getDashboardCommercialMetrics`

- Impacta: [[dashboard]], ranking comercial, cards do Dashboard Home.
- Depende de: `leads`, `pneus`, `store_members` e `store_referral_visits`.
- Risco: RLS/permissao pode zerar uma metrica parcial; o codigo usa fallback seguro.

`storageService.registerLead`

- Impacta: [[vitrine-publica]], leads do dashboard e atribuicao de vendedor.
- Depende de: RPC `registrar_lead`, `seller_id`, `ref_code`, `attribution_source`.
- Risco: alterar assinatura da RPC quebra criacao de leads.

`storageService.getSellerByRefCode` e `registerReferralVisit`

- Impacta: [[vitrine-publica]] e metricas de visualizacao/conversao.
- Depende de: `get_public_referral_seller`, `registrar_visita_referral` e `src/utils/visitorId.js`.
- Risco: a RPC precisa continuar aceitando `anon` apenas para registro publico, com dedupe de 24h por `store_id` + `visitor_id`.

`storageService.uploadPneuImages`

- Impacta: [[upload-imagens]] e Catalogo.
- Depende de: bucket `pneus-fotos` e `optimizeImageToWebp`.
- Risco: conversao HEIC/HEIF aumenta tamanho do chunk se usada no fluxo de upload.

`StoreContext`

- Impacta: todas as rotas do dashboard.
- Depende de: `getStoreByOwner`, `getStoreByMember` e status ativo em `store_members`.
- Risco: mudar resolucao de role pode esconder/mostrar dados incorretos.

## Areas que nao devem ser misturadas sem necessidade

- Landing/demo interativa: mock local, sem Supabase.
- Vitrine publica real: usa Supabase, loja real, pneus reais e leads reais.
- Dashboard: usa dados autenticados e RLS.
- Politica/aceite: frontend estatico/local, sem persistencia de banco.
