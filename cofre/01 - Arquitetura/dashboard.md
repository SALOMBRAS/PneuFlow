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
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/Dashboard/DashboardLayout.jsx
  - src/services/storage.js
  - supabase/migrations/20260615_store_referral_visits_visitor_tracking.sql
  - cofre/01 - Arquitetura/mapa-de-impacto-geral.md
  - cofre/01 - Arquitetura/checklists-regressao.md
atualizado: 2026-06-15
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

## Dashboard Home

`DashboardHome.jsx` usa `storageService.getDashboardCommercialMetrics(store.id)` para dados reais e somente leitura. A UI atual mantem cards pequenos no topo:

- Total de Pneus.
- Leads no WhatsApp.
- Faturamento.
- Visualizacoes.
- Taxa de conversao.

Ao clicar em um card, abre painel de detalhe no desktop ou bottom sheet no mobile; clicar novamente no mesmo card fecha.

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

## Nao mapeado ainda

As regras gerais e fluxos principais de `Catalog`, `Sellers`, `Leads` e `StoreSettings` foram consolidados em [[fluxos-principais]] e [[inventario-funcoes-componentes]].

## Dica visual confirmada

`DashboardHome.jsx` ainda pode manter CSS legado de accordion em tarefas antigas. Nao remover esse CSS junto de mudancas funcionais sem teste visual do dashboard.
