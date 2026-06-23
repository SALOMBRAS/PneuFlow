---
tipo: arquitetura
area: auth-store-context
camada: frontend-auth
status: ativo
tokens: medio
fonte:
  - src/lib/supabase.js
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - src/pages/Auth/Register.jsx
  - src/components/TermsAcceptanceModal.jsx
atualizado: 2026-06-23
tags: []
---

> [!tldr]
> Auth usa Supabase com storage customizado para lembrar sessÃ£o.
> `StoreContext` resolve loja atual como dono ou membro ativo.

# Auth e Contexto da Loja

## Supabase Auth

`src/lib/supabase.js` cria cliente Supabase com:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `persistSession: true`
- `autoRefreshToken: true`
- storage customizado que alterna entre `localStorage` e `sessionStorage` conforme `pneuflow_remember_session`.

## StoreContext

`src/contexts/StoreContext.jsx` mantÃ©m:

- `session`
- `user`
- `store`
- `member`
- `role`
- `loading`
- `error`
- flags `isOwner` e `isSeller`

## ResoluÃ§Ã£o da loja

1. Tenta buscar loja por dono (`getStoreByOwner`).
2. Se nÃ£o encontrar, tenta buscar loja por membro (`getStoreByMember`).
3. Para membro, valida `store_members.status === 'active'`.

## Cadastro e aceite

`src/pages/Auth/Register.jsx` mantÃ©m `acceptedPolicies` em estado local e bloqueia o cadastro se o usuÃ¡rio nÃ£o confirmar o aceite. O aceite abre `TermsAcceptanceModal`, que usa `role="dialog"`, `aria-modal`, overlay escuro, rolagem interna e botÃ£o "Li e aceito" liberado somente apÃ³s rolar atÃ© o fim.

Esse aceite Ã© apenas frontend: nÃ£o altera Supabase Auth, nÃ£o cria coluna no banco e nÃ£o registra versÃ£o de termos.

## ObservaÃ§Ãµes

- `StoreContext` nÃ£o possui mais logs de debug amplos de sessÃ£o/loja; restam apenas `console.error` para erro de carregamento.
- `storage.js` mantÃ©m logs de erro/diagnÃ³stico em falhas de RPC, dashboard metrics e upload, sem copiar segredos.
## Provisionamento de loja no cadastro

O cadastro cria primeiro o usuario no Supabase Auth e guarda `full_name`, `store_name` e `phone_number` em `user_metadata`. Apos confirmacao/login, o frontend chama `storageService.completeRegistration()`, que usa a RPC `ensure_store_provisioned` para criar de forma idempotente `profiles`, `stores` e o vinculo `store_members` de dono. A RPC retorna a loja existente quando o usuario ja possui `store_members.status = active`, sem criar loja propria para vendedores. `StoreContext` tambem tenta esse provisionamento como fallback quando um usuario autenticado sem convite ainda nao possui loja ou permissao carregada.
