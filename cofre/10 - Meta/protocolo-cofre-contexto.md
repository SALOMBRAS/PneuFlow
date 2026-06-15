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
> Protocolo operacional do Cofre de Contexto para reduzir leitura repetida de código.
> A ordem padrão é índice, TL;DR, nota, fontes e só depois busca pontual no código.

# Protocolo do Cofre de Contexto

## Objetivo

Reduzir consumo de tokens em tarefas futuras do Codex por meio de notas densas, verificáveis e atualizadas sobre contexto, arquitetura, banco, decisões, aprendizados e dívidas técnicas.

## Ordem obrigatória antes de análise ampla

1. Ler `cofre/00 - Contexto/_INDICE.md`.
2. Consultar primeiro notas com `status: ativo`.
3. Seguir a escada de custo: índice -> TL;DR -> nota inteira -> arquivos em `fonte:` -> busca pontual no código.
4. Ler código apenas quando a nota for inexistente, insuficiente ou desatualizada.
5. Não começar tarefas com `grep`, `rg` ou busca global, salvo pedido explícito de varredura.
6. Quando o código for consultado por desatualização ou lacuna, corrigir a nota correspondente.
7. Não copiar segredos, tokens, senhas, chaves, URLs privadas sensíveis ou valores de `.env`.

## Escada de custo

1. `_INDICE.md`
2. Callout `> [!tldr]`
3. Nota inteira
4. Arquivos listados em `fonte:`
5. Busca pontual em código relacionado
6. Busca mais ampla somente se o usuário pedir ou se as etapas anteriores forem insuficientes

## Status das notas

- `ativo`: confiável para uso imediato.
- `rascunho`: útil, mas incompleto ou pendente de confirmação.
- `desatualizado`: não usar sem confirmar no código.
- `arquivado`: histórico.

## Política de leitura de código

- Comece por notas do cofre.
- Leia somente arquivos diretamente relacionados à tarefa.
- Evite busca global indiscriminada.
- Prefira pontos de entrada, configs e módulos de fronteira.
- Não transcreva grandes blocos de código para notas.
- Registre contratos, decisões, caminhos e conclusões.
- Priorize densidade maior que completude: a nota deve economizar leitura, não substituir o repositório.

## Frontmatter obrigatório

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

`fonte:` deve apontar para arquivos existentes ou ser uma lista vazia (`fonte: []`). Não apontar para diretórios como se fossem arquivos.

## Campos adicionais por tipo

- `tipo: arquitetura` deve incluir `camada:`.
- `tipo: decisao` deve incluir `decisao:` e `data:`.
- `tipo: divida` deve incluir `prioridade:`, `esforco:` e `situacao:`.

## TL;DR

Logo após o frontmatter, iniciar com:

```markdown
> [!tldr]
> Resumo conclusivo de no máximo três linhas.
```

O TL;DR deve ser conclusivo, com no máximo três linhas. Evite teaser ou frase genérica.

## Atualização das notas

Atualizar nota quando:

- uma regra de negócio for confirmada no código;
- uma rota, tabela, RPC ou integração mudar;
- uma dívida técnica for descoberta;
- uma decisão arquitetural for tomada;
- uma nota estiver incompleta para responder tarefa recorrente;
- uma nota for consultada e o código provar que ela estava desatualizada.

Sempre atualizar o campo `atualizado:` ao alterar uma nota.

## Estrutura completa das pastas

```text
cofre/
00 - Contexto/
01 - Arquitetura/
02 - Banco de Dados/
03 - Decisões/
04 - Aprendizados/2026/
05 - Dívidas Técnicas/
09 - Templates/
10 - Meta/
```

## Convenção de nomes

- Arquivos em minúsculas, com palavras separadas por hífen.
- Evitar acentos no nome do arquivo quando possível.
- Uma nota por assunto estável.
- Não criar notas duplicadas sobre o mesmo tema.

## Wiki-links

- Use wiki-links para ligar notas relacionadas.
- Não use extensão `.md` nos wiki-links.
- Prefira alias quando o caminho for longo: `[[../01 - Arquitetura/landing-page|Landing page]]`.
- Quando houver duplicação, mantenha a informação na nota mais apropriada e use wiki-link nas demais.

## Bases do Obsidian

- Arquivos `.base` devem ser YAML válido.
- Use `filters`, `properties` e `views`.
- Filtros podem ser strings ou objetos `and`, `or`, `not`.
- Bases servem para painel/consulta; não devem conter contexto narrativo.

## Notas EXEMPLO

- Notas marcadas como `EXEMPLO` não são fonte de verdade do projeto.
- Devem ter `status: rascunho`, `status: arquivado` ou deixar explícito que são modelo.
- Nunca inferir arquitetura ou decisão a partir de exemplos.

## Decisões e ADRs

- Não inventar decisões ou arquitetura.
- Registrar decisão somente quando confirmada por código, conversa ou documento.
- Manter o ADR inicial ou primeira nota de decisão como referência histórica.
- Se uma decisão mudar, criar nova nota ou marcar a anterior como `desatualizado`, sem apagar histórico.

## Git

- Não fazer commit ou push apenas por atualizar o cofre, salvo pedido explícito.
- Se houver mudanças de código e de cofre na mesma tarefa, reportar separadamente.
- Antes de commit solicitado pelo usuário, revisar se o cofre não contém segredos.

## Segredos

- Não copiar valores de `.env`, tokens, senhas, service role keys, database password, connection string ou chaves privadas.
- Variáveis de ambiente podem ser listadas por nome, sem valor.

## Precedência

As regras originais do `AGENTS.md` permanecem válidas. Em caso de conflito, obedecer `AGENTS.md` e instruções explícitas do usuário.
