---
tipo: arquitetura
area: fluxos-principais
camada: fullstack
status: ativo
tokens: alto
fonte:
  - src/App.jsx
  - src/lib/supabase.js
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - src/pages/Auth/Login.jsx
  - src/pages/Auth/Register.jsx
  - src/pages/Auth/AuthCallback.jsx
  - src/pages/Auth/SetPassword.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/Subscription.jsx
  - src/utils/subscriptionAccess.js
  - src/pages/StoreFront/StoreHome.jsx
  - src/components/InteractiveDemo/InteractiveDemo.jsx
atualizado: 2026-06-18
tags: []
---

> [!tldr]
> Os fluxos principais conectam Supabase Auth, loja atual, catÃ¡logo, leads, vendedores, vitrine pÃºblica e mÃ©tricas.
> A landing/demo Ã© local e mockada; o dashboard e a vitrine pÃºblica usam dados reais.

# Fluxos Principais

## Cadastro de lojista

- Entrada: `/register`.
- Tela: `Register`.
- ServiÃ§o: `storageService.createStore`.
- Supabase: `auth.signUp` com `user_metadata` (`full_name`, `store_name`, `phone_number`).
- Aceite: `TermsAcceptanceModal` marca apenas estado local `acceptedPolicies`; sem banco.
- SaÃ­da esperada: estado "Cadastro realizado" e orientaÃ§Ã£o para confirmar e-mail.
- Checklist: validaÃ§Ã£o de e-mail, senha, WhatsApp, aceite; confirmar que campos nÃ£o somem ao abrir modal.

## Login e sessÃ£o

- Entrada: `/login`.
- Tela: `Login`.
- ServiÃ§o: `storageService.login`, `storageService.getSession`.
- Supabase: `auth.signInWithPassword`.
- PersistÃªncia: `pneuflow_remember_session` decide `localStorage` ou `sessionStorage`.
- SaÃ­da esperada: navegaÃ§Ã£o para `/dashboard`.
- Checklist: login vÃ¡lido/invÃ¡lido, lembrar-me, limpar sessÃ£o no logout.

## RecuperaÃ§Ã£o e troca de senha

- Entradas: `/forgot-password`, `/reset-password`.
- ServiÃ§os: `resetPasswordEmail`, `updatePassword`.
- Supabase: `auth.resetPasswordForEmail`, `auth.updateUser`.
- Checklist: envio de e-mail, senha mÃ­nima, confirmaÃ§Ã£o igual.

## Convite e senha de vendedor

- Entrada: `/auth/callback` e `/auth/set-password`.
- `AuthCallback` verifica `user_metadata.invited_to_store`.
- `SetPassword` atualiza senha e tenta ativar `store_members.status = active`.
- Edge Function relacionada ao convite: `invite-seller`.
- Checklist: convite, callback, definir senha, cair no dashboard/leads.

## ResoluÃ§Ã£o da loja no dashboard

- Entrada: qualquer `/dashboard/*`.
- `DashboardShell` envolve `StoreProvider`.
- `StoreContext.loadStoreData` tenta dono por `getStoreByOwner`; se nÃ£o achar, tenta membro por `getStoreByMember` e `getStoreMemberRole`.
- Estado resultante: `store`, `role`, `member`, `isOwner`, `isSeller`.
- Checklist: dono vÃª todas as rotas; vendedor nÃ£o vÃª vendedores/configuraÃ§Ãµes.

## Trial e assinatura

- Entrada de bloqueio: qualquer `/dashboard/*`.
- Helper central: `src/utils/subscriptionAccess.js`.
- Dados: campos de assinatura em `stores`.
- Regra atual: `subscription_status = active` libera acesso; `trialing` libera enquanto `trial_ends_at` for futuro.
- Bloqueio: `DashboardLayout` redireciona painel expirado para `/assinatura`.
- Tela: `Subscription` informa que os dados ficam salvos e prepara CTA de R$ 39,00/mes sem ativar pagamento.
- Checklist: loja nova trialing, loja vencida redireciona, loja active acessa mesmo com trial vencido.

## CatÃ¡logo de pneus

- Entrada: `/dashboard/catalog`.
- Tela: `Catalog`.
- ServiÃ§o leitura: `getPneus(store.id)`.
- ServiÃ§os escrita: `createPneu`, `updatePneu`, `deletePneu`, `uploadPneuImages`.
- Dados: `pneus`, bucket `pneus-fotos`.
- Regras: atÃ© 2 fotos por pneu; `status` controla visibilidade; `tipo_veiculo` carro/moto.
- Checklist: listar, buscar, filtrar marca, criar, editar, excluir como dono, vendedor visualizar catÃ¡logo completo.

## Leads

- Entrada: `/dashboard/leads`.
- Tela: `Leads`.
- ServiÃ§o: `getLeads`, `updateLeadSaleStatus`, `deleteLead`.
- RPCs: `get_leads_com_vendedor`, `atualizar_status_venda_lead`, `excluir_lead`.
- Dados: `leads`, vÃ­nculo com `store_members` por `seller_id` ou `ref_code`.
- Checklist: pesquisar por cliente/produto/vendedor, confirmar venda, desfazer venda, excluir.

## Vendedores

- Entrada: `/dashboard/sellers`.
- Tela: `Sellers`.
- ServiÃ§os: `getStoreMembers`, `inviteSeller`, `manageSellerAccess`, `updateSellerRefCode`, `updateSellerWhatsapp`, `updateMemberStatus`.
- Dados: `store_members`.
- Edge Functions: `invite-seller`, `manage-seller-access`.
- Checklist: criar vendedor, gerar/refinar ref_code, salvar WhatsApp, desativar/reativar/remover.

## ConfiguraÃ§Ãµes da loja

- Entrada: `/dashboard/settings`.
- Tela: `StoreSettings`.
- ServiÃ§os: `updateStore`, `uploadStoreImage`, `refreshStore`.
- Dados: `stores`, bucket `stores`.
- Campos: nome, WhatsApp, telefone, endereÃ§o, cidade, UF, horÃ¡rio, tipo de vitrine, logo, descriÃ§Ã£o, SEO.
- Checklist: salvar WhatsApp vÃ¡lido, salvar tipo vitrine, upload logo, abrir vitrine pÃºblica.

## Vitrine pÃºblica sem referral

- Entrada: `/store/:storeSlug`.
- Tela: `StoreHome`.
- ServiÃ§os: `getStoreBySlug`, `getPneus`.
- Dados: `stores`, `pneus`.
- WhatsApp: usa `store.whatsapp`.
- Checklist: carregar loja, filtros, card destaque, produto, modal de interesse, WhatsApp da loja.

## Vitrine pÃºblica com referral

- Entrada: `/store/:storeSlug?ref=:ref_code` ou `?vendedor=:ref_code`.
- ServiÃ§o: `getSellerByRefCode` via RPC `get_public_referral_seller`.
- Se vendedor ativo e WhatsApp vÃ¡lido: `registerReferralVisit` chama `registrar_visita_referral`; WhatsApp vai para o vendedor.
- Se invÃ¡lido: fallback para WhatsApp da loja.
- Checklist: ref vÃ¡lido, ref invÃ¡lido, vendedor sem WhatsApp, vendedor inativo.

## GeraÃ§Ã£o de lead pela vitrine

- Entrada: botÃ£o de interesse/WhatsApp em `StoreHome`.
- ServiÃ§o: `createLead` via RPC `registrar_lead`.
- Payload: `loja_id`, `produto_id`, cliente, nome/medida/preÃ§o do produto, `seller_id` quando aplicÃ¡vel, `ref_code`, `attribution_source`.
- Efeito: abre `wa.me` com mensagem montada.
- Checklist: lead aparece em `/dashboard/leads`; vendedor atribuÃ­do aparece quando referral Ã© vÃ¡lido.

## MÃ©tricas comerciais

- Entrada: `/dashboard`.
- ServiÃ§o: `getDashboardCommercialMetrics`.
- Dados: `leads`, `pneus`, `store_members`, `store_referral_visits`.
- Tratamento: `Promise.allSettled`, erro parcial vira array vazio.
- UI: cards pequenos, painel desktop e bottom sheet mobile.
- Checklist: dados vazios, dados reais, RLS parcial, clique/toggle nos cards.

## Landing e demo interativa

- Entrada: `/`.
- Componentes: `LandingPage`, `InteractiveDemo`, `FeedbackCarousel`, `CardSwapHero`.
- Dados: mock local, sem Supabase.
- InteraÃ§Ãµes: abas da demo, filtros de aro/condiÃ§Ã£o, toast de interesse.
- Checklist: hero mobile, demo Vitrine/CatÃ¡logo/Leads/Dashboard, FAQ, CTAs.
