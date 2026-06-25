---
tipo: decisao
area: estoque-e-vendas
status: ativo
tokens: medio
decisao: "Separar quantidade desejada do visitante e quantidade vendida confirmada pelo lojista"
data: 2026-06-24
fonte:
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/StoreFront/components/ProductCard.jsx
  - src/pages/StoreFront/components/QuantitySelector.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/services/storage.js
  - supabase/migrations/20260624120000_stock_sale_quantity.sql
atualizado: 2026-06-24
tags: []
---

> [!tldr]
> A vitrine coleta quantidade desejada, mas nao reduz estoque ao criar lead.
> A baixa de estoque fica na RPC `atualizar_status_venda_lead`, de forma atomica, quando a venda e confirmada no painel.

# Estoque e vendas

## Regra de negocio

- Quantidade escolhida na vitrine e `desired_quantity`: intencao do comprador.
- Quantidade confirmada no painel e `sold_quantity`: quantidade efetivamente vendida.
- Criar lead ou abrir WhatsApp nao reduz estoque.
- Estoque so reduz quando o lojista/vendedor confirma a venda no painel.
- A mesma venda nao deve reduzir estoque duas vezes.
- Se uma venda ja confirmada tiver quantidade alterada pelo dono, a RPC ajusta apenas a diferenca.
- Se o dono desmarcar uma venda confirmada, a RPC restaura o estoque da quantidade vendida.

## Campos adicionados pela migration local

Migration criada, mas nao aplicada remotamente nesta etapa:

- `supabase/migrations/20260624120000_stock_sale_quantity.sql`

Campos em `public.leads`:

- `desired_quantity integer not null default 1`
- `sold_quantity integer`

Constraints:

- `desired_quantity >= 1`
- `sold_quantity is null or sold_quantity >= 1`

## RPCs alteradas pela migration local

- `registrar_lead(..., p_desired_quantity integer default 1)` valida estoque disponivel e salva a quantidade desejada, sem decrementar estoque.
- `atualizar_status_venda_lead(p_lead_id, p_venda_confirmada, p_sold_quantity)` confirma/desmarca venda e ajusta `pneus.estoque` de forma atomica.
- `get_leads_com_vendedor(p_store_id)` passa a retornar `desired_quantity` e `sold_quantity`.

## Frontend

Vitrine publica:

- `QuantitySelector.jsx` controla minimo 1 e maximo igual ao estoque disponivel.
- `ProductCard.jsx` mostra disponibilidade, seletor de quantidade e bloqueia CTA quando `estoque <= 0`.
- `StoreHome.jsx` envia `desired_quantity` no lead e inclui a quantidade na mensagem do WhatsApp.
- Pneu sem estoque fica visivel, mas com CTA comercial do produto bloqueado.

Dashboard:

- `Leads.jsx` mostra `Qtd. desejada`.
- `Leads.jsx` permite informar `Qtd. vendida` antes de confirmar venda.
- Dono pode atualizar quantidade vendida de lead ja confirmado; a RPC ajusta apenas a diferenca.
- Vendedor nao pode alterar venda ja confirmada, preservando a regra anterior.

## Pendencia obrigatoria

Para funcionar 100% contra o Supabase real, a migration local `20260624120000_stock_sale_quantity.sql` precisa ser revisada e aplicada no ambiente remoto em uma etapa autorizada.

Sem aplicar essa migration, chamadas novas com `p_desired_quantity` e `p_sold_quantity` podem falhar no Supabase remoto atual.

## Regressao recomendada

- Criar lead com quantidade 1 e quantidade maior que 1.
- Confirmar que criar lead nao altera `pneus.estoque`.
- Confirmar venda com quantidade vendida e validar baixa de estoque.
- Confirmar novamente a mesma venda e validar que nao baixa duplicado.
- Alterar quantidade vendida de venda confirmada como dono e validar ajuste por diferenca.
- Desmarcar venda confirmada como dono e validar restauracao do estoque.
- Testar estoque insuficiente.
- Validar vitrine com `estoque = 0` sem abrir WhatsApp nem criar lead.
