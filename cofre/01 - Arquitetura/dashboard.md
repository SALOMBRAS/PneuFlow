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
  - cofre/01 - Arquitetura/mapa-de-impacto-geral.md
  - cofre/01 - Arquitetura/checklists-regressao.md
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Dashboard é área autenticada com shell e páginas de home, catálogo, leads, vendedores e configurações.
> Home exibe métricas comerciais somente leitura, ranking, leads recentes, pneus procurados e ações rápidas.

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

## Áreas confirmadas

- Home/métricas comerciais.
- Catálogo de pneus com upload de até 2 imagens por anúncio.
- Leads de WhatsApp com status de venda.
- Vendedores e convites/acesso.
- Configurações da loja.

## Layout e navegação

`DashboardShell.jsx` renderiza `DashboardLayout` e mantém o `<Outlet />` das rotas filhas. `DashboardLayout.jsx` contém sidebar desktop/mobile, botão hambúrguer, backdrop, lock de rolagem no menu mobile, link "Ver Minha Vitrine" e ação "Sair do Painel".

## Dashboard Home

`DashboardHome.jsx` usa `storageService.getDashboardMetrics(store.id)` para dados reais e somente leitura. A UI atual mantém cards pequenos no topo:

- Total de Pneus.
- Leads no WhatsApp.
- Faturamento.
- Visualizações.

Ao clicar em um card, abre painel de detalhe no desktop ou bottom sheet no mobile; clicar novamente no mesmo card fecha. Vendas confirmadas e taxa de conversão ficam nos detalhes, não como cards principais.

Blocos abaixo dos cards:

- Leads Recentes.
- Ações Rápidas compacto abaixo de Leads Recentes.
- Pneus Mais Procurados.
- Ranking Comercial.

## Métricas confirmadas

`storageService.getDashboardMetrics` consulta `leads`, `pneus`, `store_members` e `store_referral_visits` filtrando pela loja atual. Usa `Promise.allSettled` e fallback para arrays vazios quando alguma query falha por RLS/permissão.

O cálculo local em `DashboardHome.jsx` considera:

- leads totais;
- vendas confirmadas por `venda_confirmada === true`;
- faturamento por soma de `Number(produto_preco || 0)` em vendas confirmadas;
- pneus ativos por `status === 'ativo'`;
- estoque por `Number(estoque || 0)`;
- ranking por `seller_id`, com fallback por `ref_code` e grupo "Sem vendedor";
- conversão por vendedor: vendas confirmadas / visitas.

## Não mapeado ainda

As regras gerais e fluxos principais de `Catalog`, `Sellers`, `Leads` e `StoreSettings` foram consolidados em [[fluxos-principais]] e [[inventario-funcoes-componentes]].

## Dívida visual confirmada

`DashboardHome.jsx` ainda contém classes CSS antigas de accordion dentro do bloco `<style>`, mesmo com a UI atual em cards pequenos + painel/bottom sheet. Isso não deve ser removido junto de tarefas funcionais; tratar em limpeza visual isolada.
