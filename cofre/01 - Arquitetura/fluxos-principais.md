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
  - src/pages/StoreFront/StoreHome.jsx
  - src/components/InteractiveDemo/InteractiveDemo.jsx
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Os fluxos principais conectam Supabase Auth, loja atual, catálogo, leads, vendedores, vitrine pública e métricas.
> A landing/demo é local e mockada; o dashboard e a vitrine pública usam dados reais.

# Fluxos Principais

## Cadastro de lojista

- Entrada: `/register`.
- Tela: `Register`.
- Serviço: `storageService.createStore`.
- Supabase: `auth.signUp` com `user_metadata` (`full_name`, `store_name`, `phone_number`).
- Aceite: `TermsAcceptanceModal` marca apenas estado local `acceptedPolicies`; sem banco.
- Saída esperada: estado "Cadastro realizado" e orientação para confirmar e-mail.
- Checklist: validação de e-mail, senha, WhatsApp, aceite; confirmar que campos não somem ao abrir modal.

## Login e sessão

- Entrada: `/login`.
- Tela: `Login`.
- Serviço: `storageService.login`, `storageService.getSession`.
- Supabase: `auth.signInWithPassword`.
- Persistência: `pneuflow_remember_session` decide `localStorage` ou `sessionStorage`.
- Saída esperada: navegação para `/dashboard`.
- Checklist: login válido/inválido, lembrar-me, limpar sessão no logout.

## Recuperação e troca de senha

- Entradas: `/forgot-password`, `/reset-password`.
- Serviços: `resetPasswordEmail`, `updatePassword`.
- Supabase: `auth.resetPasswordForEmail`, `auth.updateUser`.
- Checklist: envio de e-mail, senha mínima, confirmação igual.

## Convite e senha de vendedor

- Entrada: `/auth/callback` e `/auth/set-password`.
- `AuthCallback` verifica `user_metadata.invited_to_store`.
- `SetPassword` atualiza senha e tenta ativar `store_members.status = active`.
- Edge Function relacionada ao convite: `invite-seller`.
- Checklist: convite, callback, definir senha, cair no dashboard/leads.

## Resolução da loja no dashboard

- Entrada: qualquer `/dashboard/*`.
- `DashboardShell` envolve `StoreProvider`.
- `StoreContext.loadStoreData` tenta dono por `getStoreByOwner`; se não achar, tenta membro por `getStoreByMember` e `getStoreMemberRole`.
- Estado resultante: `store`, `role`, `member`, `isOwner`, `isSeller`.
- Checklist: dono vê todas as rotas; vendedor não vê vendedores/configurações.

## Catálogo de pneus

- Entrada: `/dashboard/catalog`.
- Tela: `Catalog`.
- Serviço leitura: `getPneus(store.id)`.
- Serviços escrita: `createPneu`, `updatePneu`, `deletePneu`, `uploadPneuImages`.
- Dados: `pneus`, bucket `pneus-fotos`.
- Regras: até 2 fotos por pneu; `status` controla visibilidade; `tipo_veiculo` carro/moto.
- Checklist: listar, buscar, filtrar marca, criar, editar, excluir como dono, vendedor visualizar catálogo completo.

## Leads

- Entrada: `/dashboard/leads`.
- Tela: `Leads`.
- Serviço: `getLeads`, `updateLeadSaleStatus`, `deleteLead`.
- RPCs: `get_leads_com_vendedor`, `atualizar_status_venda_lead`, `excluir_lead`.
- Dados: `leads`, vínculo com `store_members` por `seller_id` ou `ref_code`.
- Checklist: pesquisar por cliente/produto/vendedor, confirmar venda, desfazer venda, excluir.

## Vendedores

- Entrada: `/dashboard/sellers`.
- Tela: `Sellers`.
- Serviços: `getStoreMembers`, `inviteSeller`, `manageSellerAccess`, `updateSellerRefCode`, `updateSellerWhatsapp`, `updateMemberStatus`.
- Dados: `store_members`.
- Edge Functions: `invite-seller`, `manage-seller-access`.
- Checklist: criar vendedor, gerar/refinar ref_code, salvar WhatsApp, desativar/reativar/remover.

## Configurações da loja

- Entrada: `/dashboard/settings`.
- Tela: `StoreSettings`.
- Serviços: `updateStore`, `uploadStoreImage`, `refreshStore`.
- Dados: `stores`, bucket `stores`.
- Campos: nome, WhatsApp, telefone, endereço, cidade, UF, horário, tipo de vitrine, logo, descrição, SEO.
- Checklist: salvar WhatsApp válido, salvar tipo vitrine, upload logo, abrir vitrine pública.

## Vitrine pública sem referral

- Entrada: `/store/:storeSlug`.
- Tela: `StoreHome`.
- Serviços: `getStoreBySlug`, `getPneus`.
- Dados: `stores`, `pneus`.
- WhatsApp: usa `store.whatsapp`.
- Checklist: carregar loja, filtros, card destaque, produto, modal de interesse, WhatsApp da loja.

## Vitrine pública com referral

- Entrada: `/store/:storeSlug?ref=:ref_code` ou `?vendedor=:ref_code`.
- Serviço: `getSellerByRefCode` via RPC `get_public_referral_seller`.
- Se vendedor ativo e WhatsApp válido: `registerReferralVisit` chama `registrar_visita_referral`; WhatsApp vai para o vendedor.
- Se inválido: fallback para WhatsApp da loja.
- Checklist: ref válido, ref inválido, vendedor sem WhatsApp, vendedor inativo.

## Geração de lead pela vitrine

- Entrada: botão de interesse/WhatsApp em `StoreHome`.
- Serviço: `createLead` via RPC `registrar_lead`.
- Payload: `loja_id`, `produto_id`, cliente, nome/medida/preço do produto, `seller_id` quando aplicável, `ref_code`, `attribution_source`.
- Efeito: abre `wa.me` com mensagem montada.
- Checklist: lead aparece em `/dashboard/leads`; vendedor atribuído aparece quando referral é válido.

## Métricas comerciais

- Entrada: `/dashboard`.
- Serviço: `getDashboardCommercialMetrics`.
- Dados: `leads`, `pneus`, `store_members`, `store_referral_visits`.
- Tratamento: `Promise.allSettled`, erro parcial vira array vazio.
- UI: cards pequenos, painel desktop e bottom sheet mobile.
- Checklist: dados vazios, dados reais, RLS parcial, clique/toggle nos cards.

## Landing e demo interativa

- Entrada: `/`.
- Componentes: `LandingPage`, `InteractiveDemo`, `FeedbackCarousel`, `CardSwapHero`.
- Dados: mock local, sem Supabase.
- Interações: abas da demo, filtros de aro/condição, toast de interesse.
- Checklist: hero mobile, demo Vitrine/Catálogo/Leads/Dashboard, FAQ, CTAs.
