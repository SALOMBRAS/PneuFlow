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

## Cofre de Contexto

Regras anteriores preservadas:

- Antes de realizar análise ampla do código, ler `cofre/00 - Contexto/_INDICE.md`.
- Consultar primeiro as notas com `status: ativo`.
- Ler o código apenas quando a nota for inexistente, insuficiente ou desatualizada.
- Quando precisar ler o código para complementar contexto, atualizar a nota correspondente.
- Seguir o protocolo completo disponível em `cofre/10 - Meta/protocolo-cofre-contexto.md`.
- As regras originais do `AGENTS.md` permanecem válidas e prevalecem em caso de conflito.

Antes de modificar qualquer funcionalidade, fluxo, tela, serviço, hook, contexto, rota, banco de dados, Supabase, upload, dashboard, vitrine, landing page ou configuração, consulte primeiro o Cofre de Contexto.

Leitura obrigatória antes de abrir código-fonte:

- `cofre/00 - Contexto/_INDICE.md`
- `cofre/01 - Arquitetura/mapa-de-impacto-geral.md`
- `cofre/01 - Arquitetura/dependencias-compartilhadas.md`
- `cofre/10 - Meta/protocolo-cofre-contexto.md`

Depois consulte também a nota específica da área afetada, quando existir. Exemplos:

- autenticação;
- cadastro;
- login;
- dashboard;
- configurações da loja;
- uploads;
- vitrine pública;
- landing page;
- Supabase;
- migrations;
- RPCs;
- catálogo;
- métricas;
- SEO;
- compartilhamento.

Fluxo obrigatório para qualquer tarefa:

1. Ler o `AGENTS.md`.
2. Ler o `_INDICE.md`.
3. Ler o `mapa-de-impacto-geral.md`.
4. Ler `dependencias-compartilhadas.md`.
5. Ler a nota específica da área afetada.
6. Só depois abrir os arquivos de código necessários.
7. Alterar somente o necessário.
8. Validar o impacto usando os checklists de regressão do cofre.
9. Atualizar o cofre se houver descoberta, mudança ou correção de contexto.
10. Relatar no final quais notas foram consultadas, quais arquivos foram alterados e quais testes/regressões são recomendados.

O cofre deve ser atualizado ao final da tarefa quando acontecer qualquer uma destas situações:

- novo fluxo identificado;
- rota criada, alterada ou removida;
- tela criada, alterada ou removida;
- componente compartilhado alterado;
- service, hook, helper ou contexto alterado;
- mudança em autenticação;
- mudança em dashboard;
- mudança em vitrine pública;
- mudança em landing page;
- mudança em upload de imagens;
- mudança em catálogo, produtos ou pneus;
- mudança em Supabase;
- mudança em tabela, coluna, bucket, policy, RPC ou migration;
- mudança em SEO ou compartilhamento;
- descoberta de dependência indireta;
- descoberta de divergência entre cofre e código;
- alteração que exija novo teste de regressão.

Ao atualizar o cofre:

- preserve notas válidas;
- não duplique conteúdo;
- use wiki-links quando fizer sentido;
- mantenha frontmatter válido;
- mantenha TL;DR logo após o frontmatter;
- registre apenas fatos confirmados;
- use `status: rascunho` para hipóteses ou pendências;
- não use números de linha como referência principal;
- prefira caminhos de arquivos, nomes de funções, componentes, hooks, services, rotas, tabelas, buckets e RPCs.

O agente nunca deve assumir que o cofre está completo. Se o cofre estiver incompleto, desatualizado ou contraditório, deve consultar o código necessário, confirmar a informação e atualizar o cofre ao final.

Não faça commit nem push sem autorização explícita.

## Kit MCP

O kit-mcp foi integrado de forma local-first e nao destrutiva. Consulte `docs/KIT-MCP-INSTALLATION.md` antes de atualizar packs, MCP, agents, commands ou skills. A versao de `AGENTS.md` sugerida pelo kit foi preservada separadamente em `docs/kit-mcp-candidates/AGENTS.kit-mcp.md`; nao substitua este arquivo sem revisao manual.
