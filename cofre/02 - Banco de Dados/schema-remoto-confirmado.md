---
tipo: banco
area: schema-remoto-confirmado
status: ativo
tokens: medio
fonte:
  - src/services/storage.js
  - cofre/02 - Banco de Dados/supabase.md
  - cofre/02 - Banco de Dados/migrations-rpcs.md
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> O schema remoto confirmado tem `store_referral_visits` e `registrar_visita_referral`.
> Esses itens sÃ£o usados pelo cÃ³digo, mas nÃ£o aparecem nas migrations locais atuais.

# Schema Remoto Confirmado

## Origem da confirmaÃ§Ã£o

Esta nota registra o schema remoto informado manualmente pelo usuÃ¡rio durante auditoria anterior do Supabase. NÃ£o foi executado SQL nesta atualizaÃ§Ã£o do cofre.

## Tabelas relevantes confirmadas

- `stores`
- `profiles`
- `store_members`
- `pneus`
- `leads`
- `store_referral_visits`

## Campos relevantes

`leads`:

- `id`
- `loja_id`
- `produto_id`
- `seller_id`
- `store_id`
- `pneu_id`
- `ref_code`
- `attribution_source`
- `nome_cliente`
- `produto_nome`
- `produto_medida`
- `produto_preco`
- `origem`
- `created_at`
- `venda_confirmada`
- `venda_confirmada_em`
- `venda_confirmada_por`

`store_referral_visits`:

- `id`
- `store_id`
- `seller_id`
- `ref_code`
- `path`
- `created_at`

`store_members`:

- `id`
- `store_id`
- `user_id`
- `email`
- `nome`
- `role`
- `status`
- `ref_code`
- `whatsapp`

`pneus`:

- `id`
- `loja_id`
- `marca`
- `modelo`
- `medida`
- `preco`
- `estoque`
- `descricao`
- `status`
- `foto_principal_url`
- `fotos`
- `tipo_veiculo`
- `created_by`
- `updated_by`

## RPCs relevantes confirmadas

- `registrar_lead`
- `registrar_visita_referral`
- `get_leads_com_vendedor`
- `get_public_referral_seller`
- `get_referral_seller`
- `atualizar_status_venda_lead`
- `is_store_owner`
- `is_store_member`
- `is_active_store_member`
- `is_valid_referral`

## DivergÃªncias locais importantes

- `store_referral_visits` Ã© usada em `storageService.getDashboardMetrics` e `storageService.registerReferralVisit`.
- `registrar_visita_referral` Ã© chamada por `storageService.registerReferralVisit`.
- Nenhum arquivo SQL local em `supabase/migrations/` define `store_referral_visits` ou `registrar_visita_referral`.
- Antes de alterar banco/migrations, tratar essa diferenÃ§a entre repositÃ³rio e remoto explicitamente.

## Uso atual no frontend

- Dashboard: consulta `store_referral_visits` para visualizaÃ§Ãµes e conversÃ£o por vendedor.
- Vitrine pÃºblica: chama `registrar_visita_referral` quando existe referral vÃ¡lido.
- Leads: `registrar_lead` recebe `seller_id`, `ref_code` e `attribution_source` no fluxo atual.
