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
  - src/pages/StoreFront/components/VehicleSearchBox.jsx
  - src/components/InteractiveDemo/InteractiveDemo.jsx
  - supabase/functions/invite-seller/index.ts
  - supabase/functions/manage-seller-access/index.ts
  - supabase/migrations/20260604_multi_seller_phase1.sql
  - supabase/migrations/20260604_multi_seller_phase2.sql
  - supabase/migrations/20260612_delete_lead_rpc.sql
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> PneuFlow é um app React/Vite para landing, autenticação, dashboard, catálogo de pneus, leads e vitrine pública.
> Supabase é usado para Auth, dados, storage, RPCs e edge functions; Vercel serve SPA e API.

# Visão Geral

## Finalidade confirmada

PneuFlow é uma plataforma para lojas de pneus criarem uma vitrine digital, organizarem catálogo, captarem leads pelo WhatsApp e operarem com dono/vendedores. A landing pública apresenta o produto, enquanto o dashboard concentra catálogo, leads, vendedores e configurações da loja.

## Stack principal

- Frontend: React 19, Vite 8, React Router DOM 7.
- Backend/API local: Express em `server.js` e endpoint Vercel em `api/index.js`.
- Banco/Auth/Storage: Supabase via `@supabase/supabase-js`.
- UI/efeitos: CSS próprio, lucide-react, gsap em componentes visuais.
- Imagens: otimização client-side para WebP e conversão HEIC/HEIF com import dinâmico de `heic2any`.
- Deploy: Vercel com rewrites em `vercel.json`.

## Comandos confirmados

- Desenvolvimento frontend: `npm run dev:frontend`
- Desenvolvimento backend: `npm run dev:backend`
- Desenvolvimento combinado: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview: `npm run preview`
- Build direto usado em validações locais: `node .\node_modules\vite\bin\vite.js build`

## Estrutura geral confirmada

- `src/main.jsx`: monta React em `#root`.
- `src/App.jsx`: define rotas públicas, auth, dashboard e vitrine pública com `React.lazy`.
- `src/pages/LandingPage.jsx`: landing pública do SaaS.
- `src/pages/PrivacyPolicy.jsx`: página pública de política de privacidade.
- `src/pages/Auth/`: login, cadastro e fluxos de senha/auth callback.
- `src/pages/Dashboard/`: dashboard, catálogo, leads, vendedores e configurações.
- `src/pages/StoreFront/`: vitrine pública em `/store/:storeSlug`.
- `src/components/`: componentes visuais e interativos da landing.
- `src/lib/supabase.js`: cliente Supabase e persistência customizada de sessão.
- `src/services/storage.js`: camada de acesso a Supabase, auth, stores, membros, leads, pneus e edge functions.
- `src/utils/imageOptimizer.js`: validação e conversão de imagens para WebP.
- `supabase/migrations/`: migrations SQL e RPCs.

## Pontos de entrada

- HTML: `index.html`, com root em `<div id="root"></div>` e script `/src/main.jsx`.
- React: `src/main.jsx`.
- Rotas: `src/App.jsx`.
- API Vercel: `api/index.js`, roteada por `vercel.json`.
- Backend local: `server.js`.

## Rotas principais confirmadas

- `/`: Landing page.
- `/privacidade`: Política de privacidade pública.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/set-password`: autenticação.
- `/store/:storeSlug`: vitrine pública.
- `/dashboard`: dashboard autenticado.
- `/dashboard/catalog`: catálogo.
- `/dashboard/leads`: leads.
- `/dashboard/sellers`: vendedores.
- `/dashboard/settings`: configurações.

## Banco de dados e integrações

Supabase é configurado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O código usa Auth, tabelas como `stores`, `store_members`, `pneus` e `leads`, RPCs e edge functions como `invite-seller` e `manage-seller-access`.

## Variáveis de ambiente esperadas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Não copiar valores de `.env`, `.env.local` ou qualquer segredo para o cofre.

## Decisões arquiteturais evidentes

- Rotas são carregadas com `React.lazy` e `Suspense`.
- Supabase Auth usa storage customizado para alternar persistência entre `localStorage` e `sessionStorage`.
- Dono e vendedor são resolvidos no `StoreContext` com fallback por `store_members`.
- Cadastro de lojista exige aceite frontend de Termos/Privacidade por modal local com rolagem interna; não registra aceite no banco.
- Dashboard Home usa métricas comerciais somente leitura via `storageService.getDashboardMetrics`, com `Promise.allSettled` e fallback para arrays vazios.
- Upload de imagem converte formatos suportados para WebP antes de enviar.
- Vitrine pública suporta referral de vendedor via `ref_code` e RPC pública de vendedor.
- Landing tem demo interativa mockada local, FAQ acessível por botão, metadados sociais/SEO em `index.html` e CardSwap desativado no mobile.
- `server.js` e `api/index.js` permanecem como backend mock/legado; o fluxo principal atual usa Supabase pelo frontend.

## Riscos ou dívidas confirmadas

- Alguns textos exibidos no terminal aparecem com mojibake; confirmar encoding antes de editar cópias visíveis.
- `supabase/migrations/20260604_multi_seller_phase2.sql` contém texto de prompt/tarefa, não SQL executável.
- O schema remoto confirmado contém `store_referral_visits` e `registrar_visita_referral`, mas esses itens não aparecem nas migrations locais atuais.
- `AGENTS.md` parece originado de template AIOX e menciona diretórios que não são o núcleo do app PneuFlow; preservar regras, mas validar comandos conforme `package.json`.
