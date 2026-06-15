---
tipo: contexto
area: glossario
status: ativo
tokens: baixo
fonte:
  - src/App.jsx
  - src/contexts/StoreContext.jsx
  - src/services/storage.js
  - supabase/migrations/20260604_multi_seller_phase1.sql
  - supabase/migrations/20260609_public_referral_seller.sql
  - supabase/migrations/20260609_seller_whatsapp.sql
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Glossário dos termos usados no domínio PneuFlow.
> Use antes de renomear telas, tabelas ou conceitos.

# Glossário

- **PneuFlow**: nome oficial do produto/site.
- **Loja / Store**: entidade da loja do cliente, ligada ao dono por `owner_id`.
- **Dono / Owner**: usuário responsável pela loja; pode gerenciar loja e membros.
- **Vendedor / Seller**: membro ativo da loja em `store_members`, com role `seller`.
- **store_members**: tabela de membros da loja; contém role, status, ref_code, whatsapp e dados do vendedor.
- **Pneu / Produto / Anúncio**: item do catálogo armazenado em `pneus`.
- **Catálogo**: área do dashboard para gerenciar pneus.
- **Vitrine pública**: página `/store/:storeSlug` visível ao cliente final.
- **Lead**: interessado/pedido gerado pela vitrine/WhatsApp e armazenado em `leads`.
- **Referral / Indicação**: atribuição por link de vendedor com `ref_code`.
- **ref_code**: código público do vendedor usado em links de indicação.
- **store_referral_visits**: tabela remota de visitas por referral usada para visualizações e conversão por vendedor.
- **WhatsApp por vendedor**: lógica que resolve o número do vendedor ativo para links com referência.
- **Métricas comerciais**: leitura agregada de leads, vendas confirmadas, faturamento, pneus, estoque, visitas e ranking no Dashboard Home.
- **Aceite de Termos/Privacidade**: confirmação frontend obrigatória no cadastro, feita por modal local sem persistência em banco.
- **RPC**: função SQL chamada pelo frontend via Supabase.
- **Edge Function**: função Supabase invocada por `supabase.functions.invoke`.
- **WebP**: formato final usado na otimização de imagens de pneus.
- **HEIC/HEIF**: formatos aceitos e convertidos via `heic2any`.
