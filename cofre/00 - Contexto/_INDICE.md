---
tipo: contexto
area: indice
status: ativo
tokens: baixo
fonte:
  - AGENTS.md
  - README.md
  - package.json
  - vite.config.js
  - vercel.json
  - index.html
  - src/main.jsx
  - src/App.jsx
  - src/pages/PrivacyPolicy.jsx
  - src/lib/supabase.js
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - src/utils/imageOptimizer.js
  - cofre/02 - Banco de Dados/migrations-rpcs.md
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Cofre inicial do PneuFlow para reduzir leitura repetida do repositorio.
> Comece por esta nota, depois abra apenas notas ativas da area relacionada.

# Indice do Cofre

## Contexto essencial

- [[visao-geral]]: finalidade, stack, comandos, modulos e integracoes confirmadas.
- [[glossario]]: termos de dominio e nomes tecnicos recorrentes.

## Arquitetura

- [[../01 - Arquitetura/frontend-rotas-react|Frontend e rotas React]]
- [[../01 - Arquitetura/auth-store-context|Auth e contexto da loja]]
- [[../01 - Arquitetura/dashboard|Dashboard]]
- [[../01 - Arquitetura/vitrine-publica|Vitrine publica]]
- [[../01 - Arquitetura/landing-page|Landing page]]
- [[../01 - Arquitetura/cadastro-privacidade|Cadastro e privacidade]]
- [[../01 - Arquitetura/upload-imagens|Upload e otimizacao de imagens]]
- [[../01 - Arquitetura/dependencias-compartilhadas|Dependencias compartilhadas]]

## Banco de dados e integracoes

- [[../02 - Banco de Dados/supabase|Supabase]]
- [[../02 - Banco de Dados/migrations-rpcs|Migrations e RPCs]]
- [[../02 - Banco de Dados/schema-remoto-confirmado|Schema remoto confirmado]]

## Dividas tecnicas em rascunho

- [[../05 - Dívidas Técnicas/migrations-com-conteudo-nao-sql|Hipotese de migration com conteudo nao SQL]]

## Protocolo

- [[../10 - Meta/protocolo-cofre-contexto|Protocolo completo do Cofre de Contexto]]

## Como usar

1. Leia esta nota.
2. Abra apenas a nota ativa da area da tarefa.
3. Leia codigo somente se a nota estiver ausente, insuficiente ou desatualizada.
4. Ao ler codigo para complementar contexto, atualize a nota correspondente.
