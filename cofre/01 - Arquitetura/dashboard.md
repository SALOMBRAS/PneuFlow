---
tipo: arquitetura
area: dashboard
camada: frontend-dashboard
status: ativo
tokens: medio
fonte:
  - src/App.jsx
  - src/pages/Dashboard/DashboardShell.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/components/MetricDetailsPanel.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/pages/Subscription.jsx
  - src/utils/subscriptionAccess.js
  - src/services/storage.js
  - supabase/migrations/20260618171439_remote_schema.sql
  - cofre/01 - Arquitetura/mapa-de-impacto-geral.md
  - cofre/01 - Arquitetura/checklists-regressao.md
atualizado: 2026-06-24
tags: []
---

> [!tldr]
> Dashboard e area autenticada com shell e paginas de home, catalogo, leads, vendedores e configuracoes.
> Home exibe cards de pneus, leads, faturamento, visualizacoes e taxa de conversao calculada por `(leads / visualizacoes) * 100`.

# Dashboard

## Arquivos principais

- `src/pages/Dashboard/DashboardShell.jsx`
- `src/pages/Dashboard/DashboardHome.jsx`
- `src/pages/Dashboard/Catalog.jsx`
- `src/pages/Dashboard/Leads.jsx`
- `src/pages/Dashboard/Sellers.jsx`
- `src/pages/Dashboard/StoreSettings.jsx`
- `src/pages/Dashboard/DashboardLayout.jsx`

## Rotas

As rotas filhas vivem sob `/dashboard` em `src/App.jsx`.

## Areas confirmadas

- Home e metricas comerciais.
- Catalogo de pneus com upload de ate 2 imagens por anuncio.
- Leads de WhatsApp com status de venda.
- Vendedores e convites/acesso.
- Configuracoes da loja.

## Layout e navegacao

`DashboardShell.jsx` renderiza `DashboardLayout` e mantem o `<Outlet />` das rotas filhas. `DashboardLayout.jsx` contem sidebar desktop/mobile, botao hamburguer, backdrop, lock de rolagem no menu mobile, link "Ver Minha Vitrine" e acao "Sair do Painel".
`DashboardLayout.jsx` tambem centraliza aviso de trial e bloqueio do painel quando `subscriptionAccess.hasStoreAccess` e falso.

## Trial e assinatura

- `DashboardLayout.jsx` chama `getSubscriptionAccess(store)`.
- Quando `hasStoreAccess` e falso, o dashboard redireciona para `/assinatura`.
- A regra de vencimento e inclusiva ate `23:59:59.999` do dia final, centralizada em `src/utils/subscriptionAccess.js`.
- A tela `/assinatura` mostra o CTA para Checkout Pro, mas nao ativa assinatura no banco.
- Detalhes: [[../03 - Decisões/trial-e-assinatura|Trial e assinatura]].

## Dashboard Home

`DashboardHome.jsx` usa `storageService.getDashboardCommercialMetrics(store.id)` para dados reais e somente leitura. A UI atual mantem cards pequenos no topo:

- Total de Pneus.
- Leads no WhatsApp.
- Faturamento.
- Visualizacoes.
- Taxa de conversao.

Ao clicar em um card, abre o componente `MetricDetailsPanel` com uma leitura premium da metrica selecionada. No desktop ele aparece inline abaixo da grade; no mobile ele usa um bottom sheet visual. Clicar novamente no mesmo card fecha o painel, clicar em outra metrica troca o conteudo e a tecla `Esc` fecha quando houver metrica ativa.

O painel usa apenas os dados ja carregados pelo dashboard:

- valor principal da metrica;
- resumo interpretativo;
- mini cards com dados relacionados;
- barra simples baseada em dado real disponivel;
- acoes rapidas para rotas ja existentes, como catalogo, leads, vendedores ou vitrine publica.

Essa UX e somente frontend. Nao altera consultas, banco, trial, assinatura, Supabase, Mercado Pago ou permissoes.

Blocos abaixo dos cards:

- Leads Recentes.
- Acoes Rapidas compacto abaixo de Leads Recentes.
- Pneus Mais Procurados.
- Ranking Comercial.

## Metricas confirmadas

`storageService.getDashboardCommercialMetrics` consulta `leads`, `pneus`, `store_members` e `store_referral_visits` filtrando pela loja atual. Usa `Promise.allSettled` e fallback para arrays vazios quando alguma query falha por RLS/permissao.

O calculo local em `DashboardHome.jsx` considera:

- leads totais;
- vendas confirmadas por `venda_confirmada === true`;
- faturamento por soma de `Number(produto_preco || 0)` em vendas confirmadas;
- pneus ativos por `status === 'ativo'`;
- estoque por `Number(estoque || 0)`;
- ranking por `seller_id`, com fallback por `ref_code` e grupo "Sem vendedor";
- visualizacoes totais e visualizacoes de hoje vindas de `store_referral_visits`;
- conversao geral por `(leads / visualizacoes) * 100`;
- conversao por vendedor por `(leads / visualizacoes) * 100`.

## Leads, venda e estoque

`Leads.jsx` mostra a quantidade desejada do comprador e permite informar a quantidade vendida antes de confirmar a venda.

A baixa de estoque nao acontece no frontend. `storageService.updateLeadSaleStatus` chama a RPC `atualizar_status_venda_lead` com `p_sold_quantity`; a migration local `20260624120000_stock_sale_quantity.sql` faz o decremento/restauracao atomica em `pneus.estoque`.

Regras:

- lead pendente pode ser confirmado com quantidade vendida;
- confirmar novamente a mesma venda nao deve baixar estoque duplicado;
- dono pode ajustar quantidade de venda confirmada e a RPC aplica apenas a diferenca;
- dono pode desmarcar venda confirmada e restaurar estoque;
- vendedor continua impedido de alterar venda ja confirmada.

Detalhes: [[../03 - Decisões/estoque-e-vendas|Estoque e vendas]].

## Nao mapeado ainda

As regras gerais e fluxos principais de `Catalog`, `Sellers`, `Leads` e `StoreSettings` foram consolidados em [[fluxos-principais]] e [[inventario-funcoes-componentes]].

## Vendedores

`Sellers.jsx` lista membros da loja, convite/criacao de vendedor, edicao de WhatsApp/referral, alteracao de senha e gestao de acesso. O dono pode cadastrar e alterar a senha do vendedor, mas a senha nao deve ser exibida nem copiada no painel. As acoes de copiar e-mail e link referral usam clipboard no navegador; botoes de copia precisam manter area de toque confortavel no mobile e nao devem alterar dados no Supabase.

## Link publico da loja

`DashboardHome.jsx` exibe `/store/:slug` no topo do dashboard. Donos podem editar o slug ali mesmo; `storageService.updateStoreSlug` normaliza, verifica duplicidade via `getStoreBySlug`, atualiza `stores.slug` pelo `store.id` e depois recarrega `StoreContext` com `refreshStore`. Vendedores apenas visualizam/copiam o link.

## Dica visual confirmada

`DashboardHome.jsx` ainda pode manter CSS legado de accordion em tarefas antigas. Nao remover esse CSS junto de mudancas funcionais sem teste visual do dashboard.
