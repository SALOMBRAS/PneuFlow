---
tipo: divida
area: migrations
status: rascunho
tokens: baixo
fonte: []
atualizado: 2026-06-15
prioridade: media
esforco: baixo
situacao: hipotese ainda nao confirmada; divergencia remota documentada em nota separada
tags: []
---

> [!tldr]
> Ha uma hipotese de conteudo nao SQL em alguma migration, mas o arquivo exato ainda nao foi confirmado.
> Nao tratar como fato ate localizar e verificar o arquivo especifico.

# Hipotese de Migration com Conteudo Nao SQL

## Hipotese pendente

Durante leitura anterior, apareceu no output um bloco de texto de tarefa em portugues junto de conteudo relacionado a migrations.
Ainda nao foi confirmado se esse texto esta dentro de um arquivo `.sql` ou se foi apenas mistura de saida/terminal.

## Impacto possivel

- Pode quebrar execucao de migrations se a hipotese for confirmada dentro de arquivo `.sql`.
- Pode confundir futuras leituras de contexto.

## Proximo passo recomendado

Localizar o arquivo exato antes de agir. Se confirmado, separar instrucoes humanas de SQL antes de aplicar migrations em qualquer ambiente.

## Observacao da auditoria 2026-06-15

Durante a sincronizacao do cofre, foi confirmada uma divergencia diferente: o schema remoto informado contem `store_referral_visits` e `registrar_visita_referral`, mas esses itens nao aparecem nas migrations locais atuais. Essa divergencia foi registrada em [[../02 - Banco de Dados/schema-remoto-confirmado|Schema remoto confirmado]].
