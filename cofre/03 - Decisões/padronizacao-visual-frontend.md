---
tipo: decisao
area: padronizacao-visual-frontend
status: ativo
tokens: baixo
decisao: "Usar a identidade da landing como sistema visual global do frontend"
data: 2026-06-21
fonte:
  - src/index.css
  - src/pages/LandingPage.css
  - src/pages/StoreFront/StoreFront.css
  - index.html
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> A landing page virou referencia visual global: dark premium, amber/orange, Inter/Outfit, cards escuros e bordas sutis.
> A primeira etapa foi feita via CSS/tokens, sem alterar logica do produto.

# Padronizacao Visual do Frontend

## Identidade base

- Estilo: dark premium, tecnologico, SaaS moderno.
- Fundo: `#070a0f`, `#05070c`, `#090d14` com radiais amber/orange.
- Superficies: cards escuros com transparencia sutil e blur.
- Destaque: `#f59e0b`, `#f97316`, hover `#d97706`.
- Texto: `#f8fafc`, `#9ca3af`, `#6b7280`.
- Fontes: `Inter` para UI e `Outfit` para titulos.

## Tokens globais

`src/index.css` centraliza aliases novos:

- `--color-bg`
- `--color-surface`
- `--color-surface-soft`
- `--color-primary`
- `--color-primary-hover`
- `--color-accent`
- `--color-border`
- `--color-text`
- `--color-text-muted`
- `--radius-card`
- `--radius-button`
- `--shadow-card`
- `--font-sans`

Tambem preserva aliases legados:

- `--bg-dark`
- `--bg-card`
- `--bg-input`
- `--primary`
- `--primary-hover`
- `--border`
- `--text-primary`
- `--text-secondary`

## Componentes afetados visualmente

- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-whatsapp`, `.btn-danger`
- `.card`
- `.form-input`
- `.modal-overlay` e `.modal-content`
- `.badge`
- Dashboard/sidebar/header mobile/tabelas/estados vazios por classes globais
- Auth cards com `.auth-beam-card`
- Vitrine publica por tokens locais em `StoreFront.css`

## Revisao fina de dashboard e vitrine

Em 2026-06-21 foi feita uma revisao fina apenas visual:

- `src/index.css` reforca fonte consistente em cards, badges, botoes e superficies do dashboard.
- `DashboardHome.jsx` compacta listas internas, ranking comercial e acoes rapidas para evitar badges ou botoes escapando dos cards.
- `StoreFront.css` contem a capa do hero dentro do frame e evita recorte lateral no produto em destaque.
- Tabelas largas de leads e vendedores continuam com rolagem horizontal interna, sem criar rolagem horizontal na pagina.
- Os cards laterais do dashboard usam itens compactos com rank separado, nome truncavel e badge suave; no mobile, badges podem quebrar para baixo sem vazar.

## Vitrine publica

`src/pages/StoreFront/StoreFront.css` agora herda tokens globais da landing por aliases `--store-*`.

## Cuidados

- Nao criar novas fontes sem motivo.
- Preferir tokens globais antes de CSS local novo.
- Revisar visual tela por tela em tarefa posterior.
- Validar mobile 340/360/390/412 e desktop 1366/1440.
