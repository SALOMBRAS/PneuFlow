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
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Auth usa Supabase com storage customizado para lembrar sessão.
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

`src/contexts/StoreContext.jsx` mantém:

- `session`
- `user`
- `store`
- `member`
- `role`
- `loading`
- `error`
- flags `isOwner` e `isSeller`

## Resolução da loja

1. Tenta buscar loja por dono (`getStoreByOwner`).
2. Se não encontrar, tenta buscar loja por membro (`getStoreByMember`).
3. Para membro, valida `store_members.status === 'active'`.

## Cadastro e aceite

`src/pages/Auth/Register.jsx` mantém `acceptedPolicies` em estado local e bloqueia o cadastro se o usuário não confirmar o aceite. O aceite abre `TermsAcceptanceModal`, que usa `role="dialog"`, `aria-modal`, overlay escuro, rolagem interna e botão "Li e aceito" liberado somente após rolar até o fim.

Esse aceite é apenas frontend: não altera Supabase Auth, não cria coluna no banco e não registra versão de termos.

## Observações

- `StoreContext` não possui mais logs de debug amplos de sessão/loja; restam apenas `console.error` para erro de carregamento.
- `storage.js` mantém logs de erro/diagnóstico em falhas de RPC, dashboard metrics e upload, sem copiar segredos.
