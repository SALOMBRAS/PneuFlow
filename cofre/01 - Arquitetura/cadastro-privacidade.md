---
tipo: arquitetura
area: cadastro-privacidade
camada: frontend-auth
status: ativo
tokens: baixo
fonte:
  - src/App.jsx
  - src/pages/Auth/Register.jsx
  - src/components/TermsAcceptanceModal.jsx
  - src/pages/PrivacyPolicy.jsx
  - src/pages/LandingPage.jsx
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Cadastro exige aceite frontend de Termos/Privacidade por modal local.
> A página pública `/privacidade` existe e não há persistência do aceite no banco.

# Cadastro e Privacidade

## Rota pública

`src/App.jsx` define `/privacidade` apontando para `src/pages/PrivacyPolicy.jsx`.

O footer da landing aponta para essa rota por link "Política de Privacidade".

## Página de privacidade

`PrivacyPolicy.jsx` é página pública estática. O texto diferencia:

- PneuFlow como controlador para dados da conta da loja.
- Loja como controladora e PneuFlow como operador para dados do cliente final tratados em nome da loja.
- WhatsApp transacional separado de marketing.
- Fornecedores citados: Vercel, Supabase e WhatsApp/Meta quando aplicável.

## Aceite no cadastro

`Register.jsx` mantém:

- `acceptedPolicies`
- `termsModalOpen`
- validação que bloqueia envio com mensagem amigável se o aceite não foi confirmado.

O usuário não é redirecionado durante o cadastro; o modal abre sobre o formulário e preserva campos preenchidos.

## Modal

`TermsAcceptanceModal.jsx`:

- usa `role="dialog"` e `aria-modal="true"`;
- tem overlay escuro;
- tem conteúdo resumido com rolagem interna;
- habilita "Li e aceito" somente após rolar até o final;
- fecha sem aceitar mantendo `acceptedPolicies` falso;
- ao aceitar, fecha e marca o estado visual "Termos aceitos".

## Limites confirmados

- Não altera Supabase Auth.
- Não cria tabela ou coluna de aceite.
- Não registra `terms_accepted_at`, versão de política ou user agent.
- Não cria checkbox obrigatório de marketing.
