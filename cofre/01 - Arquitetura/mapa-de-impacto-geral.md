---
tipo: arquitetura
area: mapa-de-impacto-geral
camada: fullstack
status: ativo
tokens: alto
fonte:
  - src/App.jsx
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - src/pages/LandingPage.jsx
  - src/pages/Auth/Register.jsx
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/StoreFront/components/VehicleSearchBox.jsx
  - src/pages/StoreFront/components/ProductCard.jsx
  - src/pages/StoreFront/components/StoreFilters.jsx
  - src/utils/imageOptimizer.js
  - supabase/functions/invite-seller/index.ts
  - supabase/functions/manage-seller-access/index.ts
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Os pontos de maior impacto são `storage.js`, `StoreContext`, `DashboardLayout`, `StoreHome` e rotas em `App.jsx`.
> Cada mudança deve ser validada no fluxo direto e no fluxo inverso que depende dos mesmos dados.

# Mapa de Impacto Geral

## 1. Rotas e navegação

- Arquivo principal: `src/App.jsx`.
- Impacta: todas as telas públicas, auth, dashboard e vitrine.
- Dependências diretas: React Router, lazy imports, `DashboardShell`.
- Regressão mínima: abrir `/`, `/login`, `/register`, `/dashboard`, `/store/:slug` e uma rota inexistente.
- Ver também: [[mapa-rotas-telas]].

## 2. Auth e sessão

- Arquivos: `src/lib/supabase.js`, `src/pages/Auth/*`, `src/contexts/StoreContext.jsx`, `src/services/storage.js`.
- Dados: Supabase Auth, `profiles`, `stores`, `store_members`.
- Impacta: login, cadastro, vendedor convidado, dashboard inteiro.
- Fragilidade: `pneuflow_remember_session` decide onde a sessão fica salva.
- Regressão mínima: login com lembrar-me, login sem lembrar-me, cadastro, reset de senha, callback de convite.
- Ver também: [[auth-store-context]], [[cadastro-privacidade]].

## 3. Contexto da loja

- Arquivo: `src/contexts/StoreContext.jsx`.
- Depende de: `storageService.getStoreByOwner`, `getStoreByMember`, `getStoreMemberRole`.
- Impacta: todas as páginas do dashboard, permissões owner/seller, link da vitrine.
- Efeito colateral: erro na resolução de loja desmonta dashboard e mostra estado de erro.
- Regressão mínima: abrir painel como dono e como vendedor ativo.

## 4. Dashboard shell/sidebar

- Arquivo: `src/pages/Dashboard/DashboardLayout.jsx`.
- Impacta: navegação, logout, mobile menu, permissão visual das rotas, `<main>` do dashboard.
- Fragilidade: ajustes em `position`, `height`, `overflow` e `margin-left` podem esconder o `<Outlet />` ou cortar a sidebar.
- Regressão mínima: rolar dashboard desktop, abrir menu mobile, acessar todas as rotas, logout.

## 5. Dashboard Home/métricas

- Arquivos: `src/pages/Dashboard/DashboardHome.jsx`, `src/services/storage.js`.
- Dados: `leads`, `pneus`, `store_members`, `store_referral_visits`.
- Impacta: cards, painel de detalhes, bottom sheet mobile, ranking comercial.
- Regressão mínima: loja sem dados, loja com dados, erro parcial de RLS, mobile 360px.
- Ver também: [[dashboard]].

## 6. Catálogo de pneus

- Arquivos: `Catalog.jsx`, `storage.js`, `imageOptimizer.js`.
- Dados: `pneus`, bucket `pneus-fotos`.
- Impacta: vitrine pública, leads, ranking de pneus, estoque.
- Fragilidade: limite de 2 imagens, WebP, `created_by`/`updated_by`, RLS de vendedores.
- Regressão mínima: criar, editar, excluir como dono, listar como vendedor, upload PNG/JPG/WEBP/HEIC.

## 7. Upload e otimização

- Arquivos: `src/utils/imageOptimizer.js`, `src/services/storage.js`, `Catalog.jsx`, `StoreSettings.jsx`.
- Buckets: `pneus-fotos`, `stores`.
- Impacta: catálogo e configurações da loja.
- Fragilidade: HEIC/HEIF depende de import dinâmico `heic2any`; imagem da loja não passa pelo mesmo otimizador.
- Regressão mínima: upload de pneu e logo, validar preview e URL pública.
- Ver também: [[upload-imagens]].

## 8. Leads

- Arquivos: `Leads.jsx`, `StoreHome.jsx`, `storage.js`.
- Dados/RPCs: `leads`, `registrar_lead`, `get_leads_com_vendedor`, `atualizar_status_venda_lead`, `excluir_lead`.
- Impacta: Dashboard Home, ranking, faturamento, WhatsApp.
- Fragilidade: vendedor pode ser vinculado por `seller_id` ou fallback `ref_code`.
- Regressão mínima: criar lead na vitrine, ver no dashboard, marcar/desmarcar venda, excluir.

## 9. Vendedores

- Arquivos: `Sellers.jsx`, `storage.js`, edge functions.
- Dados: `store_members`.
- Edge Functions: `invite-seller`, `manage-seller-access`.
- Impacta: links de referral, WhatsApp por vendedor, visibilidade do catálogo, métricas por vendedor.
- Fragilidade: service role deve ficar somente em Edge Function.
- Regressão mínima: criar vendedor, editar ref_code/WhatsApp, desativar, reativar, remover acesso.

## 10. Configurações da loja

- Arquivos: `StoreSettings.jsx`, `storage.js`.
- Dados: `stores`, bucket `stores`.
- Impacta: header/identidade da vitrine, WhatsApp principal, SEO básico, tipo de vitrine.
- Regressão mínima: salvar nome, WhatsApp, endereço, tipo de vitrine e logo.

## 11. Vitrine pública

- Arquivos: `StoreHome.jsx`, `StoreFront.css`, `VehicleSearchBox.jsx`, `ProductCard.jsx`, `StoreFilters.jsx`, `PublicStoreHeader.jsx`.
- Dados: `stores`, `pneus`, `leads`, `store_members` via RPC, `store_referral_visits` via RPC.
- Impacta: cliente final, lead, WhatsApp, referral e métricas.
- Fragilidade: `debugReferral` não deve expor dados em produção; WhatsApp cai para loja se vendedor inválido.
- Regressão mínima: abrir sem ref, com ref válido, com ref inválido, filtrar por medida/marca/tipo, gerar lead.
- Ver também: [[vitrine-publica]].

## 12. Landing page

- Arquivos: `LandingPage.jsx`, `LandingPage.css`, componentes em `src/components`.
- Dados: mock local na demo, sem Supabase.
- Impacta: conversão inicial, SEO, CTA para cadastro.
- Fragilidade: CardSwap é lazy e desativado no mobile; demo não deve chamar dados reais.
- Regressão mínima: hero mobile/desktop, demo tabs, FAQ, CTAs, footer privacidade.
- Ver também: [[landing-page]].

## 13. Política e aceite

- Arquivos: `PrivacyPolicy.jsx`, `Register.jsx`, `TermsAcceptanceModal.jsx`.
- Dados: nenhum banco nesta fase.
- Impacta: cadastro e percepção legal.
- Fragilidade: abrir modal não pode limpar campos do formulário.
- Regressão mínima: tentar cadastrar sem aceite, abrir modal, rolar até fim, aceitar, cadastrar.

## 14. Supabase e RLS

- Arquivos: `src/lib/supabase.js`, `storage.js`, migrations.
- Dados: `stores`, `profiles`, `store_members`, `pneus`, `leads`, `store_referral_visits`.
- Fragilidade: schema remoto tem itens não representados localmente em migrations.
- Regressão mínima: não executar SQL sem comparar remoto/local.
- Ver também: [[../02 - Banco de Dados/supabase|Supabase]], [[../02 - Banco de Dados/schema-remoto-confirmado|Schema remoto confirmado]].

## 15. Backend mock legado

- Arquivos: `server.js`, `api/index.js`, `vercel.json`.
- Dados: `database.json` quando usado localmente.
- Impacta: desenvolvimento antigo/fallback, mas fluxo principal atual usa Supabase.
- Fragilidade: pode confundir manutenção por ter modelos `tires/stores/leads` diferentes do schema real `pneus/stores/leads`.
- Regressão mínima: só testar se alguém decidir usar `/api`.

## 16. Estilos globais e responsividade

- Arquivos: `src/index.css`, CSS de páginas/componentes.
- Impacta: toda UI.
- Fragilidade: classes globais como `.card`, `.btn`, `.grid-cols-*`, `.modal-*` afetam várias telas.
- Regressão mínima: Android pequeno 340/360/390/412, desktop 1366/1440, sem overflow horizontal.
