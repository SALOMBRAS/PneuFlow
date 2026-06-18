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
> A pÃ¡gina pÃºblica `/privacidade` existe e nÃ£o hÃ¡ persistÃªncia do aceite no banco.

# Cadastro e Privacidade

## Rota pÃºblica

`src/App.jsx` define `/privacidade` apontando para `src/pages/PrivacyPolicy.jsx`.

O footer da landing aponta para essa rota por link "PolÃ­tica de Privacidade".

## PÃ¡gina de privacidade

`PrivacyPolicy.jsx` Ã© pÃ¡gina pÃºblica estÃ¡tica. O texto diferencia:

- PneuFlow como controlador para dados da conta da loja.
- Loja como controladora e PneuFlow como operador para dados do cliente final tratados em nome da loja.
- WhatsApp transacional separado de marketing.
- Fornecedores citados: Vercel, Supabase e WhatsApp/Meta quando aplicÃ¡vel.

## Aceite no cadastro

`Register.jsx` mantÃ©m:

- `acceptedPolicies`
- `termsModalOpen`
- validaÃ§Ã£o que bloqueia envio com mensagem amigÃ¡vel se o aceite nÃ£o foi confirmado.

O usuÃ¡rio nÃ£o Ã© redirecionado durante o cadastro; o modal abre sobre o formulÃ¡rio e preserva campos preenchidos.

## Modal

`TermsAcceptanceModal.jsx`:

- usa `role="dialog"` e `aria-modal="true"`;
- tem overlay escuro;
- tem conteÃºdo resumido com rolagem interna;
- habilita "Li e aceito" somente apÃ³s rolar atÃ© o final;
- fecha sem aceitar mantendo `acceptedPolicies` falso;
- ao aceitar, fecha e marca o estado visual "Termos aceitos".

## Limites confirmados

- NÃ£o altera Supabase Auth.
- NÃ£o cria tabela ou coluna de aceite.
- NÃ£o registra `terms_accepted_at`, versÃ£o de polÃ­tica ou user agent.
- NÃ£o cria checkbox obrigatÃ³rio de marketing.
