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
  - supabase/migrations/20260609_public_referral_seller.sql
  - supabase/migrations/20260609_seller_whatsapp.sql
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> A vitrine pública fica em `/store/:storeSlug` e usa dados Supabase.
> Há suporte confirmado a referral de vendedor e WhatsApp individual por vendedor.

# Vitrine Pública

## Entrada

Rota `/store/:storeSlug` aponta para `src/pages/StoreFront/StoreHome.jsx`.

## Arquivos principais

- `src/pages/StoreFront/StoreHome.jsx`
- `src/pages/StoreFront/StoreFront.css`
- `src/pages/StoreFront/components/`

## Referral e WhatsApp

Migrations confirmam RPCs públicas para resolver vendedor ativo por `ref_code`, incluindo WhatsApp:

- `get_public_referral_seller`
- `get_referral_seller`

`storage.js` contém funções relacionadas a vendedor por referência e registro de visita referral.

## Fluxo público confirmado

- `StoreHome.jsx` carrega loja e pneus da vitrine pelo slug.
- A URL pode conter `ref`/`ref_code`; quando há vendedor ativo com WhatsApp válido, o WhatsApp de destino passa a ser o do vendedor.
- `storageService.getSellerByRefCode` chama `get_public_referral_seller`.
- `storageService.registerReferralVisit` chama `registrar_visita_referral`.
- Leads são registrados por `storageService.registerLead`, que chama RPC `registrar_lead` com `seller_id`, `ref_code` e `attribution_source` quando aplicável.
- Se não houver vendedor/referral válido, o fluxo cai para WhatsApp da loja.

## Componentes visuais confirmados

- `VehicleSearchBox.jsx`: hero público, carrossel/card "Em destaque", quick CTAs, busca por medida, busca por veículo e busca por marca.
- `ProductCard.jsx`: card de produto da listagem pública.
- `StoreFilters.jsx`: filtros da vitrine.
- `StoreHome.jsx`: modal/fluxo de interesse e botão flutuante de WhatsApp.

## Observação banco/repositório

O código usa RPC `registrar_visita_referral` e tabela `store_referral_visits`, confirmadas no schema remoto informado, mas essa RPC/tabela não aparecem nas migrations locais atuais. Registrar isso em [[../02 - Banco de Dados/schema-remoto-confirmado|Schema remoto confirmado]] antes de planejar métricas ou migrations.

## Não mapeado ainda

- Detalhes completos de todos os filtros e modal de interesse.
