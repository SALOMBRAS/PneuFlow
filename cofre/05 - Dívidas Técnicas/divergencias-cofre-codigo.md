---
tipo: divida
area: divergencias-cofre-codigo
status: ativo
tokens: medio
fonte:
  - AGENTS.md
  - server.js
  - api/index.js
  - src/pages/Dashboard/DashboardHome.jsx
  - supabase/migrations/20260604_multi_seller_phase2.sql
  - supabase/migrations/20260615_store_referral_visits_visitor_tracking.sql
  - src/services/storage.js
  - cofre/02 - Banco de Dados/schema-remoto-confirmado.md
atualizado: 2026-06-15
prioridade: media
esforco: medio
situacao: divergencias documentadas; migration nova criada para visitor tracking, mas a confirmacao remota ainda precisa ser aplicada manualmente no Supabase
tags: []
---

> [!tldr]
> Existem divergencias/documentacoes legadas que podem confundir manutencao futura.
> Nao sao bloqueios imediatos, mas devem ser tratados antes de mexer em banco, dashboard ou backend legado.

# Divergencias Entre Cofre, Codigo e Historico

## 1. `AGENTS.md` cita template AIOX

`AGENTS.md` contem blocos de um projeto/template AIOX com diretorios como `.aiox-core`, `packages`, `tests` e comandos que nao representam o app PneuFlow atual.

O mesmo arquivo tambem contem a secao correta do Cofre de Contexto.

Risco:

- Um agente pode tentar seguir comandos/diretorios inexistentes.

Recomendacao futura:

- Ajustar `AGENTS.md` para refletir PneuFlow, mantendo a secao do Cofre.

## 2. Backend mock legado convive com Supabase real

Arquivos:

- `server.js`
- `api/index.js`

Eles implementam uma API mock com `database.json` e entidades `users`, `stores`, `tires`, `compatibility`, `leads`. O fluxo principal atual do frontend usa Supabase via `src/services/storage.js`.

Risco:

- Confundir manutencao e documentacao por haver dois modelos de dados (`tires` legado vs `pneus` real).

Recomendacao futura:

- Manter documentado como legado/fallback ou remover em uma tarefa propria se o projeto ficar 100% Supabase.

## 3. Migration com conteudo nao SQL

Arquivo confirmado:

- `supabase/migrations/20260604_multi_seller_phase2.sql`

O arquivo contem texto de prompt/tarefa em portugues, nao SQL executavel.

Risco:

- Rodar migrations locais completas pode falhar ou aplicar um historico incompleto.

Recomendacao futura:

- Separar instrucao humana de migration SQL real antes de usar Supabase CLI/migrations em ambiente novo.

## 4. Visitor tracking local novo ainda depende de aplicacao manual no remoto

Arquivos:

- `supabase/migrations/20260615_store_referral_visits_visitor_tracking.sql`
- `src/services/storage.js`
- `src/pages/StoreFront/StoreHome.jsx`

A base local agora tem migration nova para `visitor_id`, `user_agent` e a RPC `registrar_visita_referral` com dedupe de 24 horas.

Risco:

- Se o banco remoto nao receber essa migration, a vitrine pode tentar gravar com assinatura nova antes do schema estar pronto.

Recomendacao futura:

- Aplicar a migration nova no Supabase SQL Editor e validar a assinatura da RPC no banco remoto.

## 5. Estilos antigos de accordion permanecem em `DashboardHome.jsx`

`DashboardHome.jsx` voltou para UI de cards pequenos com painel/bottom sheet, mas o bloco `<style>` ainda contem classes antigas de accordion (`dashboard-accordion-*`, `dashboard-section-grid`, etc.).

Risco:

- Baixo no runtime, mas aumenta ruido e chance de conflito visual futuro.

Recomendacao futura:

- Remover CSS morto em tarefa isolada, com teste visual do dashboard.

## 6. `CONTEXTO_CODEX.md` esta parcialmente antigo

O arquivo e util como historico, mas cita `VITE_SUPABASE_ANON_KEY` em vez de `VITE_SUPABASE_PUBLISHABLE_KEY` usado em `src/lib/supabase.js`.

Risco:

- Configuracao errada por copiar variavel antiga.

Recomendacao futura:

- Atualizar ou arquivar `CONTEXTO_CODEX.md`.
