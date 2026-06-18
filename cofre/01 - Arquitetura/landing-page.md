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
> Landing Ã© a pÃ¡gina pÃºblica de conversÃ£o do PneuFlow.
> Possui hero, demo interativa mockada, problemas, prova social, FAQ acessÃ­vel e CTA final.

# Landing Page

## Arquivos

- `src/pages/LandingPage.jsx`
- `src/pages/LandingPage.css`
- `src/components/InteractiveDemo/`
- `src/components/FeedbackCarousel.jsx`
- `src/components/FeedbackCarousel.css`
- `src/components/CardSwap/`

## SeÃ§Ãµes confirmadas

- Hero com tÃ­tulo dinÃ¢mico no desktop e frase estÃ¡tica no mobile.
- DemonstraÃ§Ã£o interativa mockada, com abas Vitrine, CatÃ¡logo, Leads e Dashboard.
- Problemas das lojas de pneus.
- Prova social com marquee de depoimentos.
- FAQ com botÃµes acessÃ­veis, `aria-expanded` e `aria-controls`.
- CTA final.

## Demo interativa

`src/components/InteractiveDemo/InteractiveDemo.jsx` nÃ£o usa Supabase nem dados reais. A aba Vitrine usa pneus mockados locais, filtros por aro e condiÃ§Ã£o, cards visuais e botÃ£o que apenas dispara toast local de interesse enviado.

As abas CatÃ¡logo, Leads e Dashboard tambÃ©m sÃ£o simulaÃ§Ãµes locais para explicar valor do produto sem criar rotas, banco ou persistÃªncia.

## SEO, performance e acessibilidade

`index.html` contÃ©m `title`, `description`, canonical, Open Graph, Twitter Card, `theme-color`, `robots` e imagem social. `CardSwapHero.jsx` define `width`, `height`, `loading`, `decoding` e `fetchPriority` na primeira imagem para reduzir risco de layout shift.

O CardSwap Ã© carregado com `React.lazy` e nÃ£o renderiza no mobile; no mobile o tÃ­tulo nÃ£o roda typewriter para reduzir custo visual e evitar corte.

## DecisÃµes confirmadas

- Mobile prioriza performance: sem CardSwap e sem typewriter no tÃ­tulo.
- Background da landing foi centralizado no wrapper principal para evitar cortes secos entre seÃ§Ãµes.
- A landing nÃ£o cria dados reais e nÃ£o chama Supabase para a demo interativa.
- CTAs principais usam "Criar minha vitrine grÃ¡tis"; link de login fica no header e link de polÃ­tica no footer.
