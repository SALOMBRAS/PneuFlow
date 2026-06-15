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
  - src/utils/imageOptimizer.js
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/LandingPage.jsx
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> `storage.js`, `StoreContext`, Supabase e rotas em `App.jsx` são os pontos compartilhados mais sensíveis.
> Mudanças neles afetam dashboard, catálogo, leads, vendedores e vitrine pública.

# Dependências Compartilhadas

## Pontos de entrada compartilhados

- `src/App.jsx`: rotas públicas, auth, dashboard e vitrine pública.
- `src/contexts/StoreContext.jsx`: sessão, usuário, loja atual, membro e role.
- `src/services/storage.js`: camada central para Supabase, Auth, loja, pneus, leads, vendedores, métricas e uploads.
- `src/utils/imageOptimizer.js`: otimização de fotos de pneus antes do upload.

## Mapa de impacto

`storageService.getDashboardMetrics`

- Impacta: [[dashboard]], ranking comercial, cards do Dashboard Home.
- Depende de: `leads`, `pneus`, `store_members`, `store_referral_visits`.
- Risco: RLS/permissão pode zerar uma métrica parcial; o código usa fallback seguro.

`storageService.registerLead`

- Impacta: [[vitrine-publica]], leads do dashboard e atribuição de vendedor.
- Depende de: RPC `registrar_lead`, `seller_id`, `ref_code`, `attribution_source`.
- Risco: alterar assinatura da RPC quebra criação de leads.

`storageService.getSellerByRefCode` e `registerReferralVisit`

- Impacta: [[vitrine-publica]] e métricas de visualização/conversão.
- Depende de: `get_public_referral_seller` e `registrar_visita_referral`.
- Risco: `registrar_visita_referral` existe no remoto confirmado, mas não em migration local.

`storageService.uploadPneuImages`

- Impacta: [[upload-imagens]] e Catálogo.
- Depende de: bucket `pneus-fotos` e `optimizeImageToWebp`.
- Risco: conversão HEIC/HEIF aumenta tamanho do chunk se usada no fluxo de upload.

`StoreContext`

- Impacta: todas as rotas do dashboard.
- Depende de: `getStoreByOwner`, `getStoreByMember` e status ativo em `store_members`.
- Risco: mudar resolução de role pode esconder/mostrar dados incorretos.

## Áreas que não devem ser misturadas sem necessidade

- Landing/demo interativa: mock local, sem Supabase.
- Vitrine pública real: usa Supabase, loja real, pneus reais e leads reais.
- Dashboard: usa dados autenticados e RLS.
- Política/aceite: frontend estático/local, sem persistência de banco.
