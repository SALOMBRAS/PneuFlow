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
  - cofre/01 - Arquitetura/mapa-de-impacto-geral.md
  - cofre/01 - Arquitetura/mapa-rotas-telas.md
  - cofre/01 - Arquitetura/fluxos-principais.md
  - cofre/01 - Arquitetura/inventario-funcoes-componentes.md
  - cofre/01 - Arquitetura/checklists-regressao.md
  - cofre/02 - Banco de Dados/migrations-rpcs.md
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Cofre sincronizado do PneuFlow para reduzir leitura repetida do repositÃ³rio.
> Comece por mapas gerais, depois abra apenas notas ativas da Ã¡rea relacionada.

# Indice do Cofre

## Contexto essencial

- [[visao-geral]]: finalidade, stack, comandos, modulos e integracoes confirmadas.
- [[glossario]]: termos de dominio e nomes tecnicos recorrentes.

## Arquitetura

- [[../01 - Arquitetura/mapa-de-impacto-geral|Mapa de impacto geral]]
- [[../01 - Arquitetura/dependencias-compartilhadas|DependÃªncias compartilhadas]]
- [[../01 - Arquitetura/mapa-rotas-telas|Mapa de rotas e telas]]
- [[../01 - Arquitetura/fluxos-principais|Fluxos principais]]
- [[../01 - Arquitetura/inventario-funcoes-componentes|InventÃ¡rio de funÃ§Ãµes e componentes]]
- [[../01 - Arquitetura/checklists-regressao|Checklists de regressÃ£o]]
- [[../01 - Arquitetura/frontend-rotas-react|Frontend e rotas React]]
- [[../01 - Arquitetura/auth-store-context|Auth e contexto da loja]]
- [[../01 - Arquitetura/dashboard|Dashboard]]
- [[../01 - Arquitetura/vitrine-publica|Vitrine publica]]
- [[../01 - Arquitetura/landing-page|Landing page]]
- [[../01 - Arquitetura/cadastro-privacidade|Cadastro e privacidade]]
- [[../01 - Arquitetura/upload-imagens|Upload e otimizacao de imagens]]

## Banco de dados e integracoes

- [[../02 - Banco de Dados/supabase|Supabase]]
- [[../02 - Banco de Dados/migrations-rpcs|Migrations e RPCs]]
- [[../02 - Banco de Dados/schema-remoto-confirmado|Schema remoto confirmado]]

## Decisoes

- [[../03 - Decisões/mercado-pago-checkout-pro-etapa-1|Mercado Pago Checkout Pro - etapa 1]]

## Dividas tecnicas em rascunho

- [[../05 - DÃ­vidas TÃ©cnicas/migrations-com-conteudo-nao-sql|Hipotese de migration com conteudo nao SQL]]
- [[../05 - DÃ­vidas TÃ©cnicas/divergencias-cofre-codigo|Divergencias entre cofre, codigo e historico]]

## Protocolo

- [[../10 - Meta/protocolo-cofre-contexto|Protocolo completo do Cofre de Contexto]]

## Como usar

1. Leia esta nota.
2. Abra [[../01 - Arquitetura/mapa-de-impacto-geral|Mapa de impacto geral]] e [[../01 - Arquitetura/dependencias-compartilhadas|Dependencias compartilhadas]].
3. Abra apenas a nota ativa da area da tarefa.
4. Leia codigo somente se a nota estiver ausente, insuficiente ou desatualizada.
5. Ao ler codigo para complementar contexto, atualize a nota correspondente.
