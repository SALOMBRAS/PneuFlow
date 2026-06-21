---
tipo: arquitetura
area: mapa-rotas-telas
camada: frontend
status: ativo
tokens: medio
fonte:
  - src/App.jsx
  - src/pages/LandingPage.jsx
  - src/pages/PrivacyPolicy.jsx
  - src/pages/Auth/Login.jsx
  - src/pages/Auth/Register.jsx
  - src/pages/Auth/ForgotPassword.jsx
  - src/pages/Auth/ResetPassword.jsx
  - src/pages/Auth/AuthCallback.jsx
  - src/pages/Auth/SetPassword.jsx
  - src/pages/Subscription.jsx
  - src/pages/SubscriptionReturn.jsx
  - src/pages/Dashboard/DashboardShell.jsx
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/StoreFront/StoreHome.jsx
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> `src/App.jsx` concentra as rotas pÃºblicas, auth, dashboard e vitrine.
> Dashboard usa `DashboardShell` + `StoreProvider` + `DashboardLayout` + `<Outlet />`.

# Mapa de Rotas e Telas

## Contrato de roteamento

`src/App.jsx` usa `BrowserRouter`, `Routes`, `Route`, `Navigate`, `React.lazy` e `Suspense`.

Todas as pÃ¡ginas abaixo sÃ£o carregadas por lazy import. O fallback global Ã© um bloco "Carregando..." com fundo escuro.

## Rotas pÃºblicas

| Rota | Tela | Responsabilidade | Dados reais |
|---|---|---|---|
| `/` | `LandingPage` | PÃ¡gina comercial do PneuFlow, hero, demo mockada, prova social, FAQ e CTA | NÃ£o usa Supabase |
| `/privacidade` | `PrivacyPolicy` | PolÃ­tica de Privacidade e resumo de Termos de Uso | NÃ£o usa Supabase |
| `/assinatura` | `Subscription` | Trial encerrado e CTA de assinatura por R$ 39,00/mes | Supabase: loja atual via `StoreProvider` |
| `/assinatura/retorno` | `SubscriptionReturn` | Retorno visual do Checkout Pro (`success`, `pending`, `failure`) | Nao ativa assinatura no banco |
| `/store/:storeSlug` | `StoreHome` | Vitrine pÃºblica real da loja | Supabase: `stores`, `pneus`, `leads`, referral |

## Rotas de autenticaÃ§Ã£o

| Rota | Tela | FunÃ§Ãµes principais | ObservaÃ§Ãµes |
|---|---|---|---|
| `/login` | `Login` | `storageService.login`, lembrar sessÃ£o/e-mail | Usa Supabase Auth |
| `/register` | `Register` | `storageService.createStore`, aceite frontend | NÃ£o grava aceite no banco |
| `/forgot-password` | `ForgotPassword` | `storageService.resetPasswordEmail` | Redireciona para `/reset-password` |
| `/reset-password` | `ResetPassword` | `storageService.updatePassword` | Atualiza senha da sessÃ£o atual |
| `/auth/callback` | `AuthCallback` | lÃª sessÃ£o Supabase e decide destino | Convidado vai para `/auth/set-password` |
| `/auth/set-password` | `SetPassword` | `supabase.auth.updateUser`, ativa `store_members` | Vendedor convidado define senha |

## Rotas do dashboard

`/dashboard` usa `DashboardShell`, que envolve o dashboard com `StoreProvider` e `DashboardLayout`.
`DashboardLayout` redireciona para `/assinatura` quando o trial expira ou a assinatura nao esta ativa.

| Rota | Tela filha | Responsabilidade | PermissÃ£o visual |
|---|---|---|---|
| `/dashboard` | `DashboardHome` | MÃ©tricas, leads recentes, ranking, aÃ§Ãµes rÃ¡pidas | owner/seller |
| `/dashboard/catalog` | `Catalog` | CRUD de pneus e upload de imagens | owner/seller; delete apenas owner no UI |
| `/dashboard/leads` | `Leads` | Listagem, filtros, venda confirmada, exclusÃ£o | owner/seller conforme RLS/RPC |
| `/dashboard/sellers` | `Sellers` | GestÃ£o de vendedores, ref_code e WhatsApp | owner |
| `/dashboard/settings` | `StoreSettings` | Dados/identidade/SEO da loja | owner |

## Fallback

Qualquer rota desconhecida redireciona para `/`.

## Pontos sensÃ­veis

- Alterar `DashboardShell` ou `DashboardLayout` pode quebrar todas as telas filhas do painel.
- Alterar `StoreProvider` pode bloquear dashboard inteiro se loja/role nÃ£o forem resolvidos.
- Alterar `/store/:storeSlug` afeta vitrine pÃºblica, leads, WhatsApp e mÃ©tricas de referral.
- Alterar `/register` pode afetar Supabase Auth e criaÃ§Ã£o de loja.

## Checklist mÃ­nimo por rota

- `/`: abrir landing desktop/mobile, testar CTAs e demo.
- `/login`: login com e sem "lembrar-me".
- `/register`: validaÃ§Ãµes de senha, WhatsApp e aceite.
- `/dashboard`: carregamento com owner e seller.
- `/dashboard/catalog`: listar, filtrar, criar, editar e testar limite de imagens.
- `/dashboard/leads`: listar, buscar, paginar, confirmar venda e excluir.
- `/dashboard/sellers`: criar, editar ref_code/WhatsApp, desativar/reativar/remover.
- `/dashboard/settings`: salvar dados e upload de logo.
- `/store/:storeSlug`: abrir sem ref, com `?ref=`, filtrar, gerar lead e abrir WhatsApp.
