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
  - src/index.css
atualizado: 2026-06-23
tags: []
---

> [!tldr]
> Landing e a pagina publica de conversao do PneuFlow.
> Possui hero, demo interativa mockada, beneficios, como funciona, preco, prova social, FAQ acessivel e CTA final.

# Landing Page

## Arquivos

- `src/pages/LandingPage.jsx`
- `src/pages/LandingPage.css`
- `src/components/InteractiveDemo/`
- `src/components/FeedbackCarousel.jsx`
- `src/components/FeedbackCarousel.css`
- `src/components/CardSwap/`

## Secoes confirmadas

- Hero com titulo dinamico no desktop e frase estatica no mobile.
- Demonstracao interativa mockada, com abas Vitrine, Catalogo, Leads e Dashboard.
- Beneficios do produto.
- Como funciona em tres passos.
- Preco do plano PRO.
- Prova social com marquee de depoimentos.
- FAQ com botoes acessiveis, `aria-expanded` e `aria-controls`.
- CTA final.

## Demo interativa

`src/components/InteractiveDemo/InteractiveDemo.jsx` nao usa Supabase nem dados reais. A aba Vitrine usa pneus mockados locais, filtros por aro e condicao, cards visuais e botao que apenas dispara toast local de interesse enviado.

As abas Catalogo, Leads e Dashboard tambem sao simulacoes locais para explicar valor do produto sem criar rotas, banco ou persistencia.

O header aponta para beneficios, como funciona, preco e FAQ. Dentro da propria demo, manter apenas CTA de cadastro; nao usar botao "Ver demonstracao" apontando para a secao em que o usuario ja esta.

Em 2026-06-23 a antiga secao de problemas foi removida para reduzir ruido visual, encurtar a pagina e acelerar a chegada do usuario nas secoes comerciais principais.

## SEO, performance e acessibilidade

`index.html` contem `title`, `description`, canonical, Open Graph, Twitter Card, `theme-color`, `robots` e imagem social. `CardSwapHero.jsx` define `width`, `height`, `loading`, `decoding` e `fetchPriority` na primeira imagem para reduzir risco de layout shift.

O CardSwap e carregado com `React.lazy` e nao renderiza no mobile; no mobile o titulo nao roda typewriter para reduzir custo visual e evitar corte.

## Decisoes confirmadas

- Mobile prioriza performance: sem CardSwap e sem typewriter no titulo.
- Background da landing foi centralizado no wrapper principal para evitar cortes secos entre secoes.
- A landing nao cria dados reais e nao chama Supabase para a demo interativa.
- CTAs principais usam "Criar minha vitrine gratis"; link de login fica no header e link de politica no footer.
- A identidade visual da landing e a referencia global do produto: dark premium, amber/orange, cards escuros, bordas sutis, Inter/Outfit. Detalhes em [[../03 - Decisões/padronizacao-visual-frontend|Padronizacao visual do frontend]].
