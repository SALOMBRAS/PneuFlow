# AGENTS.md - Synkra AIOX (Codex CLI)

Este arquivo define as instrucoes do projeto para o Codex CLI.

<!-- AIOX-MANAGED-START: core -->
## Core Rules

1. Siga a Constitution em `.aiox-core/constitution.md`
2. Priorize `CLI First -> Observability Second -> UI Third`
3. Trabalhe por stories em `docs/stories/`
4. Nao invente requisitos fora dos artefatos existentes
<!-- AIOX-MANAGED-END: core -->

<!-- AIOX-MANAGED-START: quality -->
## Quality Gates

- Rode `npm run lint`
- Rode `npm run typecheck`
- Rode `npm test`
- Atualize checklist e file list da story antes de concluir
<!-- AIOX-MANAGED-END: quality -->

<!-- AIOX-MANAGED-START: codebase -->
## Project Map

- Core framework: `.aiox-core/`
- CLI entrypoints: `bin/`
- Shared packages: `packages/`
- Tests: `tests/`
- Docs: `docs/`
<!-- AIOX-MANAGED-END: codebase -->

<!-- AIOX-MANAGED-START: commands -->
## Common Commands

- `npm run sync:ide`
- `npm run sync:ide:check`
- `npm run sync:skills:codex`
- `npm run sync:skills:codex:global` (opcional; neste repo o padrao e local-first)
- `npm run validate:structure`
- `npm run validate:agents`
<!-- AIOX-MANAGED-END: commands -->

<!-- AIOX-MANAGED-START: shortcuts -->
## Agent Shortcuts

Preferencia de ativacao no Codex CLI:
1. Use `/skills` e selecione `aiox-<agent-id>` vindo de `.codex/skills` (ex.: `aiox-architect`)
2. Se preferir, use os atalhos abaixo (`@architect`, `/architect`, etc.)

Interprete os atalhos abaixo carregando o arquivo correspondente em `.aiox-core/development/agents/` (fallback: `.codex/agents/`), renderize o greeting via `generate-greeting.js` e assuma a persona ate `*exit`:

- `@architect`, `/architect`, `/architect.md` -> `.aiox-core/development/agents/architect.md`
- `@dev`, `/dev`, `/dev.md` -> `.aiox-core/development/agents/dev.md`
- `@qa`, `/qa`, `/qa.md` -> `.aiox-core/development/agents/qa.md`
- `@pm`, `/pm`, `/pm.md` -> `.aiox-core/development/agents/pm.md`
- `@po`, `/po`, `/po.md` -> `.aiox-core/development/agents/po.md`
- `@sm`, `/sm`, `/sm.md` -> `.aiox-core/development/agents/sm.md`
- `@analyst`, `/analyst`, `/analyst.md` -> `.aiox-core/development/agents/analyst.md`
- `@devops`, `/devops`, `/devops.md` -> `.aiox-core/development/agents/devops.md`
- `@data-engineer`, `/data-engineer`, `/data-engineer.md` -> `.aiox-core/development/agents/data-engineer.md`
- `@ux-design-expert`, `/ux-design-expert`, `/ux-design-expert.md` -> `.aiox-core/development/agents/ux-design-expert.md`
- `@squad-creator`, `/squad-creator`, `/squad-creator.md` -> `.aiox-core/development/agents/squad-creator.md`
- `@aiox-master`, `/aiox-master`, `/aiox-master.md` -> `.aiox-core/development/agents/aiox-master.md`
<!-- AIOX-MANAGED-END: shortcuts -->

## Política do projeto e carregamento de contexto

As seções gerenciadas pelo AIOX descrevem recursos e fluxos disponíveis, mas não obrigam sua execução preventiva em todas as tarefas.

### Tarefas pequenas

Para alterações de texto, CSS, botão, formulário isolado, componente específico ou bug simples:

- começar pelo `AGENTS.md`;
- abrir somente os arquivos diretamente envolvidos;
- abrir dependências imediatas apenas quando necessário;
- não abrir preventivamente o Cofre, `.aiox-core/`, stories, agents, skills, migrations antigas, relatórios ou documentação geral.

### Uso do AIOX e stories

Consultar `.aiox-core/`, `docs/stories/` e recursos AIOX somente quando:

- o usuário solicitar o fluxo AIOX;
- uma story específica estiver sendo executada;
- um agente AIOX for explicitamente ativado;
- a tarefa depender diretamente desses recursos.

Não criar, procurar ou atualizar uma story automaticamente para tarefas comuns.

### Agents e skills

Não ativar agents, personas ou skills automaticamente.

Consultar `.aiox-core/development/agents/`, `.codex/agents/` ou `.codex/skills/` somente quando:

- o usuário solicitar um agente específico;
- a especialidade for realmente necessária;
- o recurso for acionado explicitamente.

### Quality Gates condicionais

Executar apenas verificações proporcionais à alteração e somente quando os scripts existirem no `package.json`.

- Texto ou documentação: `git diff --check`.
- CSS ou componente isolado: build ou validação diretamente relacionada, quando necessário.
- Alteração funcional: build e testes da área modificada.
- Alteração estrutural: validações mais amplas.

Não executar automaticamente lint, typecheck e toda a suíte de testes para tarefas pequenas.

### Cofre de Contexto

O Cofre é uma fonte sob demanda, não contexto obrigatório.

Não abrir nem atualizar o Cofre para:

- texto;
- ortografia;
- CSS;
- espaçamento;
- responsividade isolada;
- ícone;
- botão;
- ajuste visual;
- refatoração interna sem mudança de comportamento;
- bug pequeno.

Consultar o Cofre somente para:

- nova funcionalidade;
- mudança estrutural;
- autenticação;
- autorização;
- Supabase;
- banco;
- migration;
- RLS;
- RPC;
- storage;
- pagamentos;
- arquitetura compartilhada;
- fluxo permanente entre várias telas.

Para tarefas amplas:

1. Ler `cofre/00 - Contexto/_INDICE.md`;
2. Escolher somente a nota diretamente relacionada;
3. Abrir outras notas apenas quando houver dependência comprovada.

Não ler o Cofre inteiro.

Atualizar o Cofre somente quando houver mudança permanente relevante para trabalhos futuros.

### Arquivos de leitura excepcional

Não abrir preventivamente:

```text
.aiox-core/
.codex/
.claude/
docs/archive/
node_modules/
dist/
backups/
package-lock.json
supabase/migrations/20260618171439_remote_schema.sql
cofre/01 - Arquitetura/mapa-de-impacto-geral.md
cofre/01 - Arquitetura/dependencias-compartilhadas.md
cofre/10 - Meta/protocolo-cofre-contexto.md
```

Esses arquivos continuam disponíveis quando a tarefa exigir diretamente.

Kit MCP

Consultar docs/KIT-MCP-INSTALLATION.md somente para manutenção do Kit MCP, atualização de packs, agents, commands, skills ou MCP.

Não abrir esse documento em tarefas comuns.

Git

Não fazer commit, push, merge ou deploy sem autorização explícita.

