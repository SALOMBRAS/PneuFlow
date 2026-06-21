---
tipo: arquitetura
area: frontend-rotas-react
camada: frontend
status: ativo
tokens: baixo
fonte:
  - src/main.jsx
  - src/App.jsx
  - src/pages/Subscription.jsx
  - src/pages/SubscriptionReturn.jsx
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> O frontend Ã© uma SPA React/Vite com rotas lazy em `src/App.jsx`.
> Landing, auth, dashboard e vitrine pÃºblica sÃ£o chunks separados.

# Frontend e Rotas React

## Entrada

`src/main.jsx` renderiza `<App />` dentro de `StrictMode`.

## Roteamento

`src/App.jsx` usa `BrowserRouter`, `Routes`, `Route`, `Navigate`, `React.lazy` e `Suspense`.

## Rotas confirmadas

- `/`: `LandingPage`
- `/privacidade`: `PrivacyPolicy`
- `/login`: `Auth/Login`
- `/register`: `Auth/Register`
- `/forgot-password`: `Auth/ForgotPassword`
- `/reset-password`: `Auth/ResetPassword`
- `/auth/callback`: `Auth/AuthCallback`
- `/auth/set-password`: `Auth/SetPassword`
- `/assinatura`: `Subscription`
- `/assinatura/retorno`: `SubscriptionReturn`
- `/store/:storeSlug`: `StoreFront/StoreHome`
- `/dashboard`: `Dashboard/DashboardShell`
- `/dashboard/catalog`: `Dashboard/Catalog`
- `/dashboard/leads`: `Dashboard/Leads`
- `/dashboard/sellers`: `Dashboard/Sellers`
- `/dashboard/settings`: `Dashboard/StoreSettings`

## ObservaÃ§Ãµes

- Fallback global de rota mostra `Carregando...`.
- Catch-all redireciona para `/`.
