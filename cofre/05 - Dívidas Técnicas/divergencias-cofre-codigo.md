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
  - src/services/storage.js
  - cofre/02 - Banco de Dados/schema-remoto-confirmado.md
atualizado: 2026-06-15
prioridade: media
esforco: medio
situacao: divergencias documentadas; nenhuma correcao aplicada nesta auditoria
tags: []
---

> [!tldr]
> Existem divergências/documentações legadas que podem confundir manutenção futura.
> Não são bloqueios imediatos, mas devem ser tratados antes de mexer em banco, dashboard ou backend legado.

# Divergências Entre Cofre, Código e Histórico

## 1. `AGENTS.md` cita template AIOX

`AGENTS.md` contém blocos de um projeto/template AIOX com diretórios como `.aiox-core`, `packages`, `tests` e comandos que não representam o app PneuFlow atual.

O mesmo arquivo também contém a seção correta do Cofre de Contexto.

Risco:

- Um agente pode tentar seguir comandos/diretórios inexistentes.

Recomendação futura:

- Ajustar `AGENTS.md` para refletir PneuFlow, mantendo a seção do Cofre.

## 2. Backend mock legado convive com Supabase real

Arquivos:

- `server.js`
- `api/index.js`

Eles implementam uma API mock com `database.json` e entidades `users`, `stores`, `tires`, `compatibility`, `leads`. O fluxo principal atual do frontend usa Supabase via `src/services/storage.js`.

Risco:

- Confundir manutenção e documentação por haver dois modelos de dados (`tires` legado vs `pneus` real).

Recomendação futura:

- Manter documentado como legado/fallback ou remover em uma tarefa própria se o projeto ficar 100% Supabase.

## 3. Migration com conteúdo não SQL

Arquivo confirmado:

- `supabase/migrations/20260604_multi_seller_phase2.sql`

O arquivo contém texto de prompt/tarefa em português, não SQL executável.

Risco:

- Rodar migrations locais completas pode falhar ou aplicar um histórico incompleto.

Recomendação futura:

- Separar instrução humana de migration SQL real antes de usar Supabase CLI/migrations em ambiente novo.

## 4. Schema remoto tem itens ausentes nas migrations locais

Confirmado no schema remoto informado pelo usuário:

- tabela `store_referral_visits`;
- RPC `registrar_visita_referral`.

Usos no código:

- `storageService.registerReferralVisit`;
- `storageService.getDashboardCommercialMetrics`.

Risco:

- Ambiente novo criado apenas pelas migrations locais pode não ter métricas de visualizações/referral.

Recomendação futura:

- Criar migration dedicada somente após validar o banco remoto e a assinatura real.

## 5. Estilos antigos de accordion permanecem em `DashboardHome.jsx`

`DashboardHome.jsx` voltou para UI de cards pequenos com painel/bottom sheet, mas o bloco `<style>` ainda contém classes antigas de accordion (`dashboard-accordion-*`, `dashboard-section-grid`, etc.).

Risco:

- Baixo no runtime, mas aumenta ruído e chance de conflito visual futuro.

Recomendação futura:

- Remover CSS morto em tarefa isolada, com teste visual do dashboard.

## 6. `CONTEXTO_CODEX.md` está parcialmente antigo

O arquivo é útil como histórico, mas cita `VITE_SUPABASE_ANON_KEY` em vez de `VITE_SUPABASE_PUBLISHABLE_KEY` usado em `src/lib/supabase.js`.

Risco:

- Configuração errada por copiar variável antiga.

Recomendação futura:

- Atualizar ou arquivar `CONTEXTO_CODEX.md`.
