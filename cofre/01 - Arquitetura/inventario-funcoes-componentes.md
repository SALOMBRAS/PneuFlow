---
tipo: arquitetura
area: inventario-funcoes-componentes
camada: fullstack
status: ativo
tokens: alto
fonte:
  - src/services/storage.js
  - src/contexts/StoreContext.jsx
  - src/utils/imageOptimizer.js
  - src/App.jsx
  - src/pages/LandingPage.jsx
  - src/components/InteractiveDemo/InteractiveDemo.jsx
  - src/components/TermsAcceptanceModal.jsx
  - src/pages/Auth/Login.jsx
  - src/pages/Auth/Register.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/StoreFront/components/VehicleSearchBox.jsx
  - supabase/functions/invite-seller/index.ts
  - supabase/functions/manage-seller-access/index.ts
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Este inventÃ¡rio lista os componentes, serviÃ§os e helpers que mais impactam o projeto.
> Antes de editar uma funÃ§Ã£o daqui, veja impacto em [[mapa-de-impacto-geral]] e checklist em [[checklists-regressao]].

# InventÃ¡rio de FunÃ§Ãµes e Componentes

## AplicaÃ§Ã£o e contexto

| Nome | Tipo | Arquivo | Responsabilidade | Impacto |
|---|---|---|---|---|
| `App` | componente/rotas | `src/App.jsx` | Define rotas e lazy imports | Todas as telas |
| `StoreProvider` | contexto | `src/contexts/StoreContext.jsx` | Resolve sessÃ£o, loja, membro e role | Dashboard inteiro |
| `useStore` | hook | `src/contexts/StoreContext.jsx` | Acesso ao contexto da loja | Dashboard e permissÃµes |
| `loadStoreData` | funÃ§Ã£o interna | `StoreContext.jsx` | Busca loja por owner ou member | Login, refresh, dashboard |

## `storageService`

| Nome | Responsabilidade | LÃª/escreve | Chamadores principais | Risco |
|---|---|---|---|---|
| `login` | Login por Supabase Auth | Auth | `Login` | Alto |
| `logout` | Encerra sessÃ£o e limpa chaves locais | Auth/localStorage | `DashboardLayout` | MÃ©dio |
| `getSession`, `getCurrentUser` | Consulta sessÃ£o/usuÃ¡rio | Auth | Auth/contexto | MÃ©dio |
| `resetPasswordEmail`, `updatePassword` | RecuperaÃ§Ã£o/troca de senha | Auth | `ForgotPassword`, `ResetPassword` | MÃ©dio |
| `createStore` | Cadastro inicial via `auth.signUp` | Auth metadata | `Register` | Alto |
| `completeRegistration` | Cria profile/store a partir de metadata | `profiles`, `stores` | nÃ£o observado nas rotas atuais | Alto se reativado |
| `getStoreByOwner` | Busca loja do dono | `stores` | `StoreContext` | Alto |
| `getStoreByMember` | Busca loja por membro ativo | `store_members` + `stores` | `StoreContext` | Alto |
| `getStoreMemberRole` | Busca role/status/ref_code | `store_members` | `StoreContext` | Alto |
| `getStoreBySlug` | Busca loja pÃºblica | `stores` | `StoreHome` | Alto |
| `updateStore` | Atualiza dados da loja | `stores` | `StoreSettings` | Alto |
| `getPneus` | Lista pneus por loja | `pneus` | CatÃ¡logo, vitrine | Alto |
| `createPneu`, `updatePneu`, `deletePneu` | CRUD de pneus | `pneus` | `Catalog` | Alto |
| `normalizePneuImages` | Limita/deduplica fotos | objeto pneu | CRUD pneus | MÃ©dio |
| `uploadPneuImages` | Otimiza e envia fotos | bucket `pneus-fotos` | `Catalog` | Alto |
| `uploadStoreImage` | Envia imagem da loja | bucket `stores` | `StoreSettings` | MÃ©dio |
| `getLeads` | Lista leads com vendedor | RPC `get_leads_com_vendedor` | `Leads` | Alto |
| `createLead` | Registra lead pÃºblico | RPC `registrar_lead` | `StoreHome` | Alto |
| `deleteLead` | Remove lead | RPC `excluir_lead` | `Leads` | Alto |
| `updateLeadSaleStatus` | Marca/desmarca venda | RPC `atualizar_status_venda_lead` | `Leads` | Alto |
| `getDashboardCommercialMetrics` | MÃ©tricas somente leitura | `leads`, `pneus`, `store_members`, `store_referral_visits` | `DashboardHome` | MÃ©dio |
| `getStoreMembers` | Lista membros da loja | `store_members` | `Sellers`, mÃ©tricas | Alto |
| `inviteSeller` | Invoca Edge Function de convite | `invite-seller` | `Sellers` | Alto |
| `manageSellerAccess` | Invoca Edge Function de status/acesso | `manage-seller-access` | `Sellers` | Alto |
| `updateMemberStatus` | Atualiza status direto | `store_members` | `Sellers` | MÃ©dio |
| `updateSellerRefCode` | Atualiza referral | `store_members` | `Sellers` | Alto |
| `updateSellerWhatsapp` | Atualiza WhatsApp individual | `store_members` | `Sellers` | Alto |
| `getSellerByRefCode` | Resolve vendedor pÃºblico | RPC `get_public_referral_seller` | `StoreHome` | Alto |
| `registerReferralVisit` | Registra visualizaÃ§Ã£o referral | RPC `registrar_visita_referral` | `StoreHome` | MÃ©dio |

## Helpers de imagem

| Nome | Arquivo | Responsabilidade | Impacto |
|---|---|---|---|
| `isSupportedImageFile` | `src/utils/imageOptimizer.js` | Valida MIME/extensÃ£o | Upload pneus |
| `optimizeImageToWebp` | `src/utils/imageOptimizer.js` | Converte e redimensiona para WebP | Upload pneus |
| `IMAGE_UPLOAD_ACCEPT` | `src/utils/imageOptimizer.js` | Aceite do input file | `Catalog` |

## Componentes/telas principais

| Nome | Arquivo | Responsabilidade | Dados |
|---|---|---|---|
| `LandingPage` | `src/pages/LandingPage.jsx` | Landing, hero, FAQ, CTAs | mock/local |
| `InteractiveDemo` | `src/components/InteractiveDemo/InteractiveDemo.jsx` | Demo local com abas/filtros/toast | mock/local |
| `TermsAcceptanceModal` | `src/components/TermsAcceptanceModal.jsx` | Modal de aceite com scroll obrigatÃ³rio | local |
| `PrivacyPolicy` | `src/pages/PrivacyPolicy.jsx` | PolÃ­tica pÃºblica | estÃ¡tico |
| `Login` | `src/pages/Auth/Login.jsx` | Login e lembrar-me | Auth |
| `Register` | `src/pages/Auth/Register.jsx` | Cadastro de lojista | Auth |
| `AuthCallback` | `src/pages/Auth/AuthCallback.jsx` | Destino pÃ³s-auth | Auth metadata |
| `SetPassword` | `src/pages/Auth/SetPassword.jsx` | Senha de vendedor convidado | Auth + `store_members` |
| `DashboardShell` | `src/pages/Dashboard/DashboardShell.jsx` | Provider + layout + outlet | contexto |
| `DashboardLayout` | `src/pages/Dashboard/DashboardLayout.jsx` | Sidebar, header mobile, permissÃµes visuais | contexto |
| `DashboardHome` | `src/pages/Dashboard/DashboardHome.jsx` | MÃ©tricas, ranking, detalhes | leitura Supabase |
| `Catalog` | `src/pages/Dashboard/Catalog.jsx` | CRUD pneus e upload | `pneus`, storage |
| `Leads` | `src/pages/Dashboard/Leads.jsx` | Leads, filtros, venda/exclusÃ£o | RPCs |
| `Sellers` | `src/pages/Dashboard/Sellers.jsx` | Vendedores, ref, WhatsApp, status | `store_members`, functions |
| `StoreSettings` | `src/pages/Dashboard/StoreSettings.jsx` | Loja, logo, SEO, tipo vitrine | `stores`, storage |
| `StoreHome` | `src/pages/StoreFront/StoreHome.jsx` | Vitrine pÃºblica, filtros, leads, referral | Supabase pÃºblico |
| `VehicleSearchBox` | `src/pages/StoreFront/components/VehicleSearchBox.jsx` | Hero/card destaque/buscas rÃ¡pidas | props de `StoreHome` |
| `ProductCard` | `src/pages/StoreFront/components/ProductCard.jsx` | Card de produto pÃºblico | pneu |
| `StoreFilters` | `src/pages/StoreFront/components/StoreFilters.jsx` | Filtros pÃºblico/drawer | props de `StoreHome` |
| `PublicStoreHeader` | `src/pages/StoreFront/components/PublicStoreHeader.jsx` | Header da vitrine | loja |

## Edge Functions

| Nome | Arquivo | Responsabilidade | Segredos |
|---|---|---|---|
| `invite-seller` | `supabase/functions/invite-seller/index.ts` | Cria/atualiza usuÃ¡rio vendedor e `store_members` | usa service role no servidor |
| `manage-seller-access` | `supabase/functions/manage-seller-access/index.ts` | Desativa, reativa ou remove acesso do vendedor | usa service role no servidor |

## ObservaÃ§Ãµes de manutenÃ§Ã£o

- `server.js` e `api/index.js` sÃ£o backend mock/legado com modelo de dados diferente; nÃ£o confundir com o fluxo Supabase real.
- `DashboardHome.jsx` ainda contÃ©m estilos antigos de accordion no bloco `<style>` mesmo apÃ³s a UI voltar para cards; ver [[../05 - DÃ­vidas TÃ©cnicas/divergencias-cofre-codigo|DivergÃªncias cofre/cÃ³digo]].
- AlteraÃ§Ãµes em `storageService` exigem teste de pelo menos uma tela consumidora direta.
