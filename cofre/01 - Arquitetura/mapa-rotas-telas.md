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
  - src/pages/Dashboard/DashboardShell.jsx
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/StoreFront/StoreHome.jsx
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> `src/App.jsx` concentra as rotas públicas, auth, dashboard e vitrine.
> Dashboard usa `DashboardShell` + `StoreProvider` + `DashboardLayout` + `<Outlet />`.

# Mapa de Rotas e Telas

## Contrato de roteamento

`src/App.jsx` usa `BrowserRouter`, `Routes`, `Route`, `Navigate`, `React.lazy` e `Suspense`.

Todas as páginas abaixo são carregadas por lazy import. O fallback global é um bloco "Carregando..." com fundo escuro.

## Rotas públicas

| Rota | Tela | Responsabilidade | Dados reais |
|---|---|---|---|
| `/` | `LandingPage` | Página comercial do PneuFlow, hero, demo mockada, prova social, FAQ e CTA | Não usa Supabase |
| `/privacidade` | `PrivacyPolicy` | Política de Privacidade e resumo de Termos de Uso | Não usa Supabase |
| `/store/:storeSlug` | `StoreHome` | Vitrine pública real da loja | Supabase: `stores`, `pneus`, `leads`, referral |

## Rotas de autenticação

| Rota | Tela | Funções principais | Observações |
|---|---|---|---|
| `/login` | `Login` | `storageService.login`, lembrar sessão/e-mail | Usa Supabase Auth |
| `/register` | `Register` | `storageService.createStore`, aceite frontend | Não grava aceite no banco |
| `/forgot-password` | `ForgotPassword` | `storageService.resetPasswordEmail` | Redireciona para `/reset-password` |
| `/reset-password` | `ResetPassword` | `storageService.updatePassword` | Atualiza senha da sessão atual |
| `/auth/callback` | `AuthCallback` | lê sessão Supabase e decide destino | Convidado vai para `/auth/set-password` |
| `/auth/set-password` | `SetPassword` | `supabase.auth.updateUser`, ativa `store_members` | Vendedor convidado define senha |

## Rotas do dashboard

`/dashboard` usa `DashboardShell`, que envolve o dashboard com `StoreProvider` e `DashboardLayout`.

| Rota | Tela filha | Responsabilidade | Permissão visual |
|---|---|---|---|
| `/dashboard` | `DashboardHome` | Métricas, leads recentes, ranking, ações rápidas | owner/seller |
| `/dashboard/catalog` | `Catalog` | CRUD de pneus e upload de imagens | owner/seller; delete apenas owner no UI |
| `/dashboard/leads` | `Leads` | Listagem, filtros, venda confirmada, exclusão | owner/seller conforme RLS/RPC |
| `/dashboard/sellers` | `Sellers` | Gestão de vendedores, ref_code e WhatsApp | owner |
| `/dashboard/settings` | `StoreSettings` | Dados/identidade/SEO da loja | owner |

## Fallback

Qualquer rota desconhecida redireciona para `/`.

## Pontos sensíveis

- Alterar `DashboardShell` ou `DashboardLayout` pode quebrar todas as telas filhas do painel.
- Alterar `StoreProvider` pode bloquear dashboard inteiro se loja/role não forem resolvidos.
- Alterar `/store/:storeSlug` afeta vitrine pública, leads, WhatsApp e métricas de referral.
- Alterar `/register` pode afetar Supabase Auth e criação de loja.

## Checklist mínimo por rota

- `/`: abrir landing desktop/mobile, testar CTAs e demo.
- `/login`: login com e sem "lembrar-me".
- `/register`: validações de senha, WhatsApp e aceite.
- `/dashboard`: carregamento com owner e seller.
- `/dashboard/catalog`: listar, filtrar, criar, editar e testar limite de imagens.
- `/dashboard/leads`: listar, buscar, paginar, confirmar venda e excluir.
- `/dashboard/sellers`: criar, editar ref_code/WhatsApp, desativar/reativar/remover.
- `/dashboard/settings`: salvar dados e upload de logo.
- `/store/:storeSlug`: abrir sem ref, com `?ref=`, filtrar, gerar lead e abrir WhatsApp.
