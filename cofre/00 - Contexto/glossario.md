---
tipo: contexto
area: glossario
status: ativo
tokens: baixo
fonte:
  - src/App.jsx
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - supabase/migrations/20260618171439_remote_schema.sql
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> GlossÃ¡rio dos termos usados no domÃ­nio PneuFlow.
> Use antes de renomear telas, tabelas ou conceitos.

# GlossÃ¡rio

- **PneuFlow**: nome oficial do produto/site.
- **Loja / Store**: entidade da loja do cliente, ligada ao dono por `owner_id`.
- **Dono / Owner**: usuÃ¡rio responsÃ¡vel pela loja; pode gerenciar loja e membros.
- **Vendedor / Seller**: membro ativo da loja em `store_members`, com role `seller`.
- **store_members**: tabela de membros da loja; contÃ©m role, status, ref_code, whatsapp e dados do vendedor.
- **Pneu / Produto / AnÃºncio**: item do catÃ¡logo armazenado em `pneus`.
- **CatÃ¡logo**: Ã¡rea do dashboard para gerenciar pneus.
- **Vitrine pÃºblica**: pÃ¡gina `/store/:storeSlug` visÃ­vel ao cliente final.
- **Lead**: interessado/pedido gerado pela vitrine/WhatsApp e armazenado em `leads`.
- **Referral / IndicaÃ§Ã£o**: atribuiÃ§Ã£o por link de vendedor com `ref_code`.
- **ref_code**: cÃ³digo pÃºblico do vendedor usado em links de indicaÃ§Ã£o.
- **store_referral_visits**: tabela remota de visitas por referral usada para visualizaÃ§Ãµes e conversÃ£o por vendedor.
- **WhatsApp por vendedor**: lÃ³gica que resolve o nÃºmero do vendedor ativo para links com referÃªncia.
- **MÃ©tricas comerciais**: leitura agregada de leads, vendas confirmadas, faturamento, pneus, estoque, visitas e ranking no Dashboard Home.
- **Aceite de Termos/Privacidade**: confirmaÃ§Ã£o frontend obrigatÃ³ria no cadastro, feita por modal local sem persistÃªncia em banco.
- **RPC**: funÃ§Ã£o SQL chamada pelo frontend via Supabase.
- **Edge Function**: funÃ§Ã£o Supabase invocada por `supabase.functions.invoke`.
- **WebP**: formato final usado na otimizaÃ§Ã£o de imagens de pneus.
- **HEIC/HEIF**: formatos aceitos e convertidos via `heic2any`.
