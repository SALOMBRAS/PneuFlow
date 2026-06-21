---
tipo: divida
area: migrations
status: ativo
tokens: baixo
fonte:
  - docs/legacy-migrations/20260604_multi_seller_phase2.txt
atualizado: 2026-06-21
prioridade: media
esforco: baixo
situacao: arquivo nao SQL segue arquivado; divergencia de store_referral_visits foi resolvida pela baseline ativa
tags: []
---

> [!tldr]
> `20260604_multi_seller_phase2.txt` contem texto de tarefa/prompt, nao SQL executavel.
> Nao rodar migrations locais completas sem tratar esse arquivo.

# Hipotese de Migration com Conteudo Nao SQL

## Arquivo confirmado

`docs/legacy-migrations/20260604_multi_seller_phase2.txt` contem texto de tarefa em portugues pedindo alteracoes na tela de Leads, nao comandos SQL.

## Impacto possivel

- Pode quebrar execucao de migrations se a hipotese for confirmada dentro de arquivo `.sql`.
- Pode confundir futuras leituras de contexto.

## Proximo passo recomendado

Separar instrucoes humanas de SQL real antes de aplicar migrations em qualquer ambiente novo.

## Observacao da auditoria 2026-06-21

O alerta sobre `store_referral_visits` e `registrar_visita_referral` nao aparecerem nas migrations locais deixou de ser atual depois da baseline `supabase/migrations/20260618171439_remote_schema.sql`. A pendencia restante desta nota e apenas manter `docs/legacy-migrations/20260604_multi_seller_phase2.txt` fora do fluxo de SQL executavel.
