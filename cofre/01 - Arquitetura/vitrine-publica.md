---
tipo: arquitetura
area: vitrine-publica
camada: frontend-publico
status: ativo
tokens: baixo
fonte:
  - src/App.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/StoreFront/StoreFront.css
  - src/pages/StoreFront/components/VehicleSearchBox.jsx
  - src/pages/StoreFront/components/ProductCard.jsx
  - src/pages/StoreFront/components/StoreFilters.jsx
  - src/services/storage.js
  - src/utils/visitorId.js
  - supabase/migrations/20260615090000_store_referral_visits_visitor_tracking.sql
  - cofre/01 - Arquitetura/fluxos-principais.md
  - supabase/migrations/20260609091000_public_referral_seller.sql
  - supabase/migrations/20260609092000_seller_whatsapp.sql
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> A vitrine publica fica em `/store/:storeSlug` e usa dados Supabase.
> Cada visitante recebe `pneuflow_visitor_id` em `localStorage` e a visita e deduplicada por loja/visitante em 24 horas.

# Vitrine Publica

## Entrada

Rota `/store/:storeSlug` aponta para `src/pages/StoreFront/StoreHome.jsx`.

## Arquivos principais

- `src/pages/StoreFront/StoreHome.jsx`
- `src/pages/StoreFront/StoreFront.css`
- `src/pages/StoreFront/components/`

## Referral e WhatsApp

As migrations confirmam RPCs publicas para resolver vendedor ativo por `ref_code`, incluindo WhatsApp:

- `get_public_referral_seller`
- `get_referral_seller`

`storage.js` contem funcoes relacionadas a vendedor por referencia e registro de visita referral.
`src/utils/visitorId.js` centraliza o identificador persistente do visitante para a vitrine publica.

## Fluxo publico confirmado

- `StoreHome.jsx` carrega loja e pneus da vitrine pelo slug.
- A URL pode conter `ref` ou `vendedor`; quando ha vendedor ativo com WhatsApp valido, o WhatsApp de destino passa a ser o do vendedor.
- `storageService.getSellerByRefCode` chama `get_public_referral_seller`.
- `storageService.registerReferralVisit` chama `registrar_visita_referral` com `store_id`, `seller_id`, `ref_code`, `visitor_id`, `path` e `user_agent`.
- A RPC bloqueia nova insercao se ja houver visita da mesma combinacao `store_id` + `visitor_id` nas ultimas 24 horas.
- A vitrine registra visita mesmo sem referral, mantendo compatibilidade com links antigos sem `ref` ou `vendedor`.
- Leads sao registrados por `storageService.registerLead`, que chama `registrar_lead` com `seller_id`, `ref_code` e `attribution_source` quando aplicavel.
- Se nao houver vendedor/referral valido, o fluxo cai para WhatsApp da loja.

## Componentes visuais confirmados

- `VehicleSearchBox.jsx`: hero publico, carrossel/card "Em destaque", quick CTAs, busca por medida, busca por veiculo e busca por marca.
- `ProductCard.jsx`: card de produto da listagem publica.
- `StoreFilters.jsx`: filtros da vitrine.
- `StoreHome.jsx`: modal/fluxo de interesse e botao flutuante de WhatsApp.

## Filtros e modal de interesse

`StoreHome.jsx` mantem filtros por texto, marca, estoque, tipo de veiculo e busca por veiculo. `StoreFilters.jsx` controla os filtros laterais/drawer. `VehicleSearchBox.jsx` expoe busca rapida por medida/marca/veiculo no hero.

O modal de interesse recebe `targetTire` e `customerName`, chama `storageService.createLead` e depois abre WhatsApp com mensagem do produto. Quando ha referral valido, o payload usa `ref_code` e `attribution_source: 'referral'`; sem referral, usa `attribution_source: 'product'`.
