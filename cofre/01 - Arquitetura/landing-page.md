---
tipo: arquitetura
area: landing-page
camada: frontend-publico
status: ativo
tokens: baixo
fonte:
  - src/pages/LandingPage.jsx
  - src/pages/LandingPage.css
  - index.html
  - src/components/CardSwap/CardSwapHero.jsx
  - src/components/InteractiveDemo/InteractiveDemo.jsx
  - src/components/InteractiveDemo/InteractiveDemo.css
  - src/components/FeedbackCarousel.jsx
  - src/components/FeedbackCarousel.css
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Landing é a página pública de conversão do PneuFlow.
> Possui hero, demo interativa mockada, problemas, prova social, FAQ acessível e CTA final.

# Landing Page

## Arquivos

- `src/pages/LandingPage.jsx`
- `src/pages/LandingPage.css`
- `src/components/InteractiveDemo/`
- `src/components/FeedbackCarousel.jsx`
- `src/components/FeedbackCarousel.css`
- `src/components/CardSwap/`

## Seções confirmadas

- Hero com título dinâmico no desktop e frase estática no mobile.
- Demonstração interativa mockada, com abas Vitrine, Catálogo, Leads e Dashboard.
- Problemas das lojas de pneus.
- Prova social com marquee de depoimentos.
- FAQ com botões acessíveis, `aria-expanded` e `aria-controls`.
- CTA final.

## Demo interativa

`src/components/InteractiveDemo/InteractiveDemo.jsx` não usa Supabase nem dados reais. A aba Vitrine usa pneus mockados locais, filtros por aro e condição, cards visuais e botão que apenas dispara toast local de interesse enviado.

As abas Catálogo, Leads e Dashboard também são simulações locais para explicar valor do produto sem criar rotas, banco ou persistência.

## SEO, performance e acessibilidade

`index.html` contém `title`, `description`, canonical, Open Graph, Twitter Card, `theme-color`, `robots` e imagem social. `CardSwapHero.jsx` define `width`, `height`, `loading`, `decoding` e `fetchPriority` na primeira imagem para reduzir risco de layout shift.

O CardSwap é carregado com `React.lazy` e não renderiza no mobile; no mobile o título não roda typewriter para reduzir custo visual e evitar corte.

## Decisões confirmadas

- Mobile prioriza performance: sem CardSwap e sem typewriter no título.
- Background da landing foi centralizado no wrapper principal para evitar cortes secos entre seções.
- A landing não cria dados reais e não chama Supabase para a demo interativa.
- CTAs principais usam "Criar minha vitrine grátis"; link de login fica no header e link de política no footer.
