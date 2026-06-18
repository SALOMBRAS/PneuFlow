---
tipo: meta
area: protocolo-cofre-contexto
status: ativo
tokens: medio
fonte:
  - AGENTS.md
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Protocolo operacional do Cofre de Contexto para reduzir leitura repetida de cÃ³digo.
> A ordem padrÃ£o Ã© Ã­ndice, TL;DR, nota, fontes e sÃ³ depois busca pontual no cÃ³digo.

# Protocolo do Cofre de Contexto

## Objetivo

Reduzir consumo de tokens em tarefas futuras do Codex por meio de notas densas, verificÃ¡veis e atualizadas sobre contexto, arquitetura, banco, decisÃµes, aprendizados e dÃ­vidas tÃ©cnicas.

## Ordem obrigatÃ³ria antes de anÃ¡lise ampla

1. Ler `cofre/00 - Contexto/_INDICE.md`.
2. Consultar primeiro notas com `status: ativo`.
3. Seguir a escada de custo: Ã­ndice -> TL;DR -> nota inteira -> arquivos em `fonte:` -> busca pontual no cÃ³digo.
4. Ler cÃ³digo apenas quando a nota for inexistente, insuficiente ou desatualizada.
5. NÃ£o comeÃ§ar tarefas com `grep`, `rg` ou busca global, salvo pedido explÃ­cito de varredura.
6. Quando o cÃ³digo for consultado por desatualizaÃ§Ã£o ou lacuna, corrigir a nota correspondente.
7. NÃ£o copiar segredos, tokens, senhas, chaves, URLs privadas sensÃ­veis ou valores de `.env`.

## Escada de custo

1. `_INDICE.md`
2. Callout `> [!tldr]`
3. Nota inteira
4. Arquivos listados em `fonte:`
5. Busca pontual em cÃ³digo relacionado
6. Busca mais ampla somente se o usuÃ¡rio pedir ou se as etapas anteriores forem insuficientes

## Status das notas

- `ativo`: confiÃ¡vel para uso imediato.
- `rascunho`: Ãºtil, mas incompleto ou pendente de confirmaÃ§Ã£o.
- `desatualizado`: nÃ£o usar sem confirmar no cÃ³digo.
- `arquivado`: histÃ³rico.

## PolÃ­tica de leitura de cÃ³digo

- Comece por notas do cofre.
- Leia somente arquivos diretamente relacionados Ã  tarefa.
- Evite busca global indiscriminada.
- Prefira pontos de entrada, configs e mÃ³dulos de fronteira.
- NÃ£o transcreva grandes blocos de cÃ³digo para notas.
- Registre contratos, decisÃµes, caminhos e conclusÃµes.
- Priorize densidade maior que completude: a nota deve economizar leitura, nÃ£o substituir o repositÃ³rio.

## Frontmatter obrigatÃ³rio

Toda nota Markdown deve ter frontmatter:

```yaml
---
tipo: contexto | arquitetura | banco | decisao | aprendizado | divida | template | meta
area: <slug-da-area>
status: ativo | rascunho | desatualizado | arquivado
tokens: baixo | medio | alto
fonte:
  - <caminho-do-arquivo>
atualizado: 2026-06-15
tags: []
---
```

`fonte:` deve apontar para arquivos existentes ou ser uma lista vazia (`fonte: []`). NÃ£o apontar para diretÃ³rios como se fossem arquivos.

## Campos adicionais por tipo

- `tipo: arquitetura` deve incluir `camada:`.
- `tipo: decisao` deve incluir `decisao:` e `data:`.
- `tipo: divida` deve incluir `prioridade:`, `esforco:` e `situacao:`.

## TL;DR

Logo apÃ³s o frontmatter, iniciar com:

```markdown
> [!tldr]
> Resumo conclusivo de no mÃ¡ximo trÃªs linhas.
```

O TL;DR deve ser conclusivo, com no mÃ¡ximo trÃªs linhas. Evite teaser ou frase genÃ©rica.

## AtualizaÃ§Ã£o das notas

Atualizar nota quando:

- uma regra de negÃ³cio for confirmada no cÃ³digo;
- uma rota, tabela, RPC ou integraÃ§Ã£o mudar;
- uma dÃ­vida tÃ©cnica for descoberta;
- uma decisÃ£o arquitetural for tomada;
- uma nota estiver incompleta para responder tarefa recorrente;
- uma nota for consultada e o cÃ³digo provar que ela estava desatualizada.

Sempre atualizar o campo `atualizado:` ao alterar uma nota.

## Estrutura completa das pastas

```text
cofre/
00 - Contexto/
01 - Arquitetura/
02 - Banco de Dados/
03 - DecisÃµes/
04 - Aprendizados/2026/
05 - DÃ­vidas TÃ©cnicas/
09 - Templates/
10 - Meta/
```

## ConvenÃ§Ã£o de nomes

- Arquivos em minÃºsculas, com palavras separadas por hÃ­fen.
- Evitar acentos no nome do arquivo quando possÃ­vel.
- Uma nota por assunto estÃ¡vel.
- NÃ£o criar notas duplicadas sobre o mesmo tema.

## Wiki-links

- Use wiki-links para ligar notas relacionadas.
- NÃ£o use extensÃ£o `.md` nos wiki-links.
- Prefira alias quando o caminho for longo: `[[../01 - Arquitetura/landing-page|Landing page]]`.
- Quando houver duplicaÃ§Ã£o, mantenha a informaÃ§Ã£o na nota mais apropriada e use wiki-link nas demais.

## Bases do Obsidian

- Arquivos `.base` devem ser YAML vÃ¡lido.
- Use `filters`, `properties` e `views`.
- Filtros podem ser strings ou objetos `and`, `or`, `not`.
- Bases servem para painel/consulta; nÃ£o devem conter contexto narrativo.

## Notas EXEMPLO

- Notas marcadas como `EXEMPLO` nÃ£o sÃ£o fonte de verdade do projeto.
- Devem ter `status: rascunho`, `status: arquivado` ou deixar explÃ­cito que sÃ£o modelo.
- Nunca inferir arquitetura ou decisÃ£o a partir de exemplos.

## DecisÃµes e ADRs

- NÃ£o inventar decisÃµes ou arquitetura.
- Registrar decisÃ£o somente quando confirmada por cÃ³digo, conversa ou documento.
- Manter o ADR inicial ou primeira nota de decisÃ£o como referÃªncia histÃ³rica.
- Se uma decisÃ£o mudar, criar nova nota ou marcar a anterior como `desatualizado`, sem apagar histÃ³rico.

## Git

- NÃ£o fazer commit ou push apenas por atualizar o cofre, salvo pedido explÃ­cito.
- Se houver mudanÃ§as de cÃ³digo e de cofre na mesma tarefa, reportar separadamente.
- Antes de commit solicitado pelo usuÃ¡rio, revisar se o cofre nÃ£o contÃ©m segredos.

## Segredos

- NÃ£o copiar valores de `.env`, tokens, senhas, service role keys, database password, connection string ou chaves privadas.
- VariÃ¡veis de ambiente podem ser listadas por nome, sem valor.

## PrecedÃªncia

As regras originais do `AGENTS.md` permanecem vÃ¡lidas. Em caso de conflito, obedecer `AGENTS.md` e instruÃ§Ãµes explÃ­citas do usuÃ¡rio.
