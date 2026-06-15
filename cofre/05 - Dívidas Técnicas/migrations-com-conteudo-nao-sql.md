---
tipo: divida
area: migrations
status: ativo
tokens: baixo
fonte:
  - supabase/migrations/20260604_multi_seller_phase2.sql
atualizado: 2026-06-15
prioridade: media
esforco: baixo
situacao: confirmado em 20260604_multi_seller_phase2.sql; nenhuma correcao aplicada
tags: []
---

> [!tldr]
> `20260604_multi_seller_phase2.sql` contem texto de tarefa/prompt, nao SQL executavel.
> Nao rodar migrations locais completas sem tratar esse arquivo.

# Hipotese de Migration com Conteudo Nao SQL

## Arquivo confirmado

`supabase/migrations/20260604_multi_seller_phase2.sql` contem texto de tarefa em portugues pedindo alteracoes na tela de Leads, nao comandos SQL.

## Impacto possivel

- Pode quebrar execucao de migrations se a hipotese for confirmada dentro de arquivo `.sql`.
- Pode confundir futuras leituras de contexto.

## Proximo passo recomendado

Separar instrucoes humanas de SQL real antes de aplicar migrations em qualquer ambiente novo.

## Observacao da auditoria 2026-06-15

Durante a sincronizacao do cofre, foi confirmada uma divergencia diferente: o schema remoto informado contem `store_referral_visits` e `registrar_visita_referral`, mas esses itens nao aparecem nas migrations locais atuais. Essa divergencia foi registrada em [[../02 - Banco de Dados/schema-remoto-confirmado|Schema remoto confirmado]].
