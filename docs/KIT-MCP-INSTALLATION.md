# Kit MCP Installation - PneuFlow

## Origem

- Repositorio: https://github.com/luanpdd/kit-mcp
- Pacote npm usado: `@luanpdd/kit-mcp`
- Versao identificada: `1.39.0`
- Data da instalacao: 2026-06-22
- Branch de instalacao: `chore/install-kit-mcp`

## Packs instalados

- `core`
- `supabase`
- `ui`
- `legacy`
- `observability`

Nao instalado inicialmente:

- `cost-workflow`

## Comandos usados

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes --package=@luanpdd/kit-mcp -- kit-mcp --help
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes --package=@luanpdd/kit-mcp -- kit-mcp pack list
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes --package=@luanpdd/kit-mcp -- kit-mcp sync install codex --project-root "<preview>" --packs core,supabase,ui,legacy,observability --dry-run
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes --package=@luanpdd/kit-mcp -- kit-mcp sync install codex --project-root "<preview>" --packs core,supabase,ui,legacy,observability
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes --package=@luanpdd/kit-mcp -- kit-mcp install dry-run codex
```

## Diretorios e arquivos criados

- `.mcp.json`
- `.codex/.kit-mcp-packs.json`
- `.codex/skills/`
- `docs/kit-mcp-candidates/AGENTS.kit-mcp.md`
- `docs/KIT-MCP-INSTALLATION.md`
- `backups/kit-mcp-before-install/` local e ignorado pelo Git

## Conflitos e preservacao

- `AGENTS.md` ja existia e foi preservado.
- A versao sugerida pelo kit foi salva em `docs/kit-mcp-candidates/AGENTS.kit-mcp.md`.
- `.codex/` ja existia com agentes AIOX; nenhum arquivo existente foi substituido.
- Os 99 arquivos gerados pelo kit em `.codex` eram novos e foram copiados.
- `.mcp.json` nao existia e foi criado.

## Codex e MCP

Como o `npx` desta maquina pode falhar no PATH, `.mcp.json` usa `node` com `npm-cli.js`.

Pode ser necessario reiniciar o Codex para carregar o novo MCP e as novas skills locais.

## Como atualizar

1. Criar branch separada.
2. Executar `kit-mcp pack list` e `kit-mcp pack info <pack>`.
3. Testar primeiro em worktree preview.
4. Copiar apenas arquivos novos ou claramente seguros.
5. Preservar sempre arquivos personalizados existentes.

## Como acrescentar outro pack

Exemplo para acrescentar `cost-workflow` no futuro:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes --package=@luanpdd/kit-mcp -- kit-mcp sync install codex --packs core,supabase,ui,legacy,observability,cost-workflow
```

Antes de aplicar, repetir o fluxo em worktree preview.

## Como remover

- Remover entradas do `.mcp.json` relacionadas a `kit-mcp`.
- Remover arquivos gerados em `.codex/skills/` somente depois de comparar com backups e confirmar que nao sao customizacoes locais.
- Manter `docs/kit-mcp-candidates/` como historico se houver conflitos.

## Regras de seguranca

- Nunca sobrescrever arquivos personalizados automaticamente.
- Nunca incluir tokens, senhas, chaves, service role ou dados pessoais.
- Nunca copiar arquivos `.env`.
- Nunca remover regras existentes do `AGENTS.md` sem revisao manual.

## Observacoes sobre versionamento

- `.codex/` continua ignorado pelo `.gitignore`; portanto as skills adicionadas ficam locais nesta maquina.
- Para versionar agentes/skills no GitHub, seria necessario alterar `.gitignore`, mas isso nao foi feito nesta etapa.
