---
tipo: contexto
area: visao-geral
status: ativo
tokens: medio
fonte:
  - README.md
  - package.json
  - vite.config.js
  - vercel.json
  - index.html
  - src/main.jsx
  - src/App.jsx
  - src/pages/PrivacyPolicy.jsx
  - src/components/TermsAcceptanceModal.jsx
  - src/lib/supabase.js
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - src/utils/imageOptimizer.js
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Subscription.jsx
  - src/utils/subscriptionAccess.js
  - src/pages/StoreFront/components/VehicleSearchBox.jsx
  - src/components/InteractiveDemo/InteractiveDemo.jsx
  - supabase/functions/invite-seller/index.ts
  - supabase/functions/manage-seller-access/index.ts
  - supabase/migrations/20260604092000_multi_seller_phase1.sql
  - docs/legacy-migrations/20260604_multi_seller_phase2.txt
  - supabase/migrations/20260612090000_delete_lead_rpc.sql
  - supabase/migrations/20260618172000_store_subscription_trial.sql
atualizado: 2026-06-18
tags: []
---

> [!tldr]
> PneuFlow Ã© um app React/Vite para landing, autenticaÃ§Ã£o, dashboard, catÃ¡logo de pneus, leads e vitrine pÃºblica.
> Supabase Ã© usado para Auth, dados, storage, RPCs e edge functions; Vercel serve SPA e API.

# VisÃ£o Geral

## Finalidade confirmada

PneuFlow Ã© uma plataforma para lojas de pneus criarem uma vitrine digital, organizarem catÃ¡logo, captarem leads pelo WhatsApp e operarem com dono/vendedores. A landing pÃºblica apresenta o produto, enquanto o dashboard concentra catÃ¡logo, leads, vendedores e configuraÃ§Ãµes da loja.

## Stack principal

- Frontend: React 19, Vite 8, React Router DOM 7.
- Backend/API local: Express em `server.js` e endpoint Vercel em `api/index.js`.
- Banco/Auth/Storage: Supabase via `@supabase/supabase-js`.
- UI/efeitos: CSS prÃ³prio, lucide-react, gsap em componentes visuais.
- Imagens: otimizaÃ§Ã£o client-side para WebP e conversÃ£o HEIC/HEIF com import dinÃ¢mico de `heic2any`.
- Deploy: Vercel com rewrites em `vercel.json`.

## Comandos confirmados

- Desenvolvimento frontend: `npm run dev:frontend`
- Desenvolvimento backend: `npm run dev:backend`
- Desenvolvimento combinado: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview: `npm run preview`
- Build direto usado em validaÃ§Ãµes locais: `node .\node_modules\vite\bin\vite.js build`

## Estrutura geral confirmada

- `src/main.jsx`: monta React em `#root`.
- `src/App.jsx`: define rotas pÃºblicas, auth, dashboard e vitrine pÃºblica com `React.lazy`.
- `src/pages/LandingPage.jsx`: landing pÃºblica do SaaS.
- `src/pages/PrivacyPolicy.jsx`: pÃ¡gina pÃºblica de polÃ­tica de privacidade.
- `src/pages/Auth/`: login, cadastro e fluxos de senha/auth callback.
- `src/pages/Dashboard/`: dashboard, catÃ¡logo, leads, vendedores e configuraÃ§Ãµes.
- `src/pages/StoreFront/`: vitrine pÃºblica em `/store/:storeSlug`.
- `src/components/`: componentes visuais e interativos da landing.
- `src/lib/supabase.js`: cliente Supabase e persistÃªncia customizada de sessÃ£o.
- `src/services/storage.js`: camada de acesso a Supabase, auth, stores, membros, leads, pneus e edge functions.
- `src/utils/imageOptimizer.js`: validaÃ§Ã£o e conversÃ£o de imagens para WebP.
- `supabase/migrations/`: migrations SQL e RPCs.

## Pontos de entrada

- HTML: `index.html`, com root em `<div id="root"></div>` e script `/src/main.jsx`.
- React: `src/main.jsx`.
- Rotas: `src/App.jsx`.
- API Vercel: `api/index.js`, roteada por `vercel.json`.
- Backend local: `server.js`.

## Rotas principais confirmadas

- `/`: Landing page.
- `/privacidade`: PolÃ­tica de privacidade pÃºblica.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/set-password`: autenticaÃ§Ã£o.
- `/store/:storeSlug`: vitrine pÃºblica.
- `/dashboard`: dashboard autenticado.
- `/dashboard/catalog`: catÃ¡logo.
- `/dashboard/leads`: leads.
- `/dashboard/sellers`: vendedores.
- `/dashboard/settings`: configuraÃ§Ãµes.
- `/assinatura`: tela de assinatura/trial encerrado.

## Banco de dados e integraÃ§Ãµes

Supabase Ã© configurado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O cÃ³digo usa Auth, tabelas como `stores`, `store_members`, `pneus` e `leads`, RPCs e edge functions como `invite-seller` e `manage-seller-access`.

## VariÃ¡veis de ambiente esperadas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

NÃ£o copiar valores de `.env`, `.env.local` ou qualquer segredo para o cofre.

## DecisÃµes arquiteturais evidentes

- Rotas sÃ£o carregadas com `React.lazy` e `Suspense`.
- Supabase Auth usa storage customizado para alternar persistÃªncia entre `localStorage` e `sessionStorage`.
- Dono e vendedor sÃ£o resolvidos no `StoreContext` com fallback por `store_members`.
- Cadastro de lojista exige aceite frontend de Termos/Privacidade por modal local com rolagem interna; nÃ£o registra aceite no banco.
- Dashboard Home usa mÃ©tricas comerciais somente leitura via `storageService.getDashboardMetrics`, com `Promise.allSettled` e fallback para arrays vazios.
- Upload de imagem converte formatos suportados para WebP antes de enviar.
- Vitrine pÃºblica suporta referral de vendedor via `ref_code` e RPC pÃºblica de vendedor.
- Landing tem demo interativa mockada local, FAQ acessÃ­vel por botÃ£o, metadados sociais/SEO em `index.html` e CardSwap desativado no mobile.
- Trial comercial inicial usa campos em `stores`, helper `subscriptionAccess` e bloqueio central no `DashboardLayout`; gateway/webhook ainda nÃ£o estÃ£o integrados.
- `server.js` e `api/index.js` permanecem como backend mock/legado; o fluxo principal atual usa Supabase pelo frontend.

## Riscos ou dÃ­vidas confirmadas

- Alguns textos exibidos no terminal aparecem com mojibake; confirmar encoding antes de editar cÃ³pias visÃ­veis.
- `docs/legacy-migrations/20260604_multi_seller_phase2.txt` contÃ©m texto de prompt/tarefa, nÃ£o SQL executÃ¡vel.
- O schema remoto confirmado contÃ©m `store_referral_visits` e `registrar_visita_referral`, mas esses itens nÃ£o aparecem nas migrations locais atuais.
- `AGENTS.md` parece originado de template AIOX e menciona diretÃ³rios que nÃ£o sÃ£o o nÃºcleo do app PneuFlow; preservar regras, mas validar comandos conforme `package.json`.
