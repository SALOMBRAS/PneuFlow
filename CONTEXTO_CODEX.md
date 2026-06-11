# CONTEXTO CODEX - PneuFlow

Data de referencia: 2026-06-09

Este arquivo registra o estado atual do projeto PneuFlow para continuidade em outro chat. Ele consolida o contexto anterior e as etapas recentes aplicadas.

## 1. Estado Geral do Projeto

- Projeto: PneuFlow.
- Stack: Vite, React, Supabase e Vercel.
- Frontend: React com `react-router-dom`, CSS global e componentes por area.
- Backend/BaaS: Supabase Auth, Postgres, Storage, RLS e RPCs.
- Deploy previsto: Vercel.

### Estrutura principal

- Landing page publica em `src/pages/LandingPage.jsx`.
- Autenticacao/cadastro em `src/pages/Auth`.
- Dashboard protegido em `src/pages/Dashboard`.
- Catalogo de pneus no dashboard em `src/pages/Dashboard/Catalog.jsx`.
- Gestao de vendedores em `src/pages/Dashboard/Sellers.jsx`.
- Leads em `src/pages/Dashboard/Leads.jsx`.
- Configuracoes da loja em `src/pages/Dashboard/StoreSettings.jsx`.
- Vitrine publica em `src/pages/StoreFront/StoreHome.jsx`.
- Componentes da vitrine em `src/pages/StoreFront/components`.
- Contexto global da loja/sessao em `src/contexts/StoreContext.jsx`.

### Funcionalidades principais atuais

- Landing page revisada em PT-BR com SEO basico e acessibilidade simples.
- Dashboard para dono da loja e vendedores.
- Catalogo de pneus com cadastro, edicao, exclusao conforme permissao atual e upload de imagens.
- Vitrine publica em `/store/:storeSlug`.
- Links de vendedor por referral no formato principal `/store/:storeSlug?ref=:ref_code`.
- Alias aceito na vitrine: `?vendedor=:ref_code`.
- WhatsApp individual por vendedor usando `store_members.whatsapp`.
- Fallback para WhatsApp principal da loja quando nao houver vendedor valido.
- Upload de imagens de pneus convertido para WebP antes de enviar ao Supabase Storage.

## 2. Supabase

### Tabelas principais usadas

- `stores`
  - Loja do usuario.
  - Campos usados no frontend incluem `id`, `owner_id`, `slug`, `name`/`nome`, `whatsapp`, `foto_capa`, `logo`, `tipo_vitrine`, endereco/cidade/estado e horario.
- `pneus`
  - Anuncios/produtos do catalogo.
  - Campo que vincula anuncio a loja: `loja_id`.
  - Campos importantes: `marca`, `modelo`, `medida`, `aro`, `preco`, `estoque`, `status`, `tipo_veiculo`, `compatibilidade`, `descricao`, `foto_principal_url`, `fotos`, `created_by`, `updated_by`.
- `store_members`
  - Representa donos/membros/vendedores da loja.
  - Campos importantes: `id`, `store_id`, `user_id`, `nome`, `email`, `role`, `status`, `ref_code`, `whatsapp`.
- `leads`
  - Leads de WhatsApp/vitrine.
  - Campos usados/esperados incluem `loja_id`, `produto_id`, dados do produto, cliente, `ref_code`, `seller_id` quando aplicavel e `attribution_source`.

### Storage

- Bucket usado para fotos dos pneus: `pneus-fotos`.
- Upload atual envia apenas arquivos finais `.webp` gerados no frontend.
- As imagens ja existentes nao foram convertidas em massa.
- As imagens de feedback externas do Supabase foram apenas corrigidas de `.png` para `.webp` quando os arquivos antigos foram removidos.

### Variaveis de ambiente

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Nao usar service role key no frontend.

### RLS e policies importantes

- `store_members` tem RLS habilitado pelas migrations multi-seller.
- `pneus` tem RLS habilitado.
- Foi criada policy para permitir que membros ativos da loja vejam todos os pneus/anuncios da propria loja:
  - role em `('owner', 'seller')`;
  - `store_members.user_id = auth.uid()`;
  - `store_members.status = 'active'`;
  - `store_members.store_id = pneus.loja_id`.
- A vitrine publica nao consulta `store_members` diretamente para resolver vendedor por referral; usa RPC publica controlada.

## 3. Migrations e RPCs

### `supabase/migrations/20260604_multi_seller_phase1.sql`

- Cria/estrutura `store_members`.
- Adiciona campos de autoria em `pneus`: `created_by`, `updated_by`.
- Cria indexes de membros por loja/usuario/email.
- Ativa RLS em `store_members` e `pneus`.
- Define policies iniciais para owner/seller.
- Inclui estrutura inicial de leads/vendedores conforme fase multi-seller.

### `supabase/migrations/20260604_multi_seller_phase2.sql`

- Complementa a estrutura multi-seller.
- Documento SQL com orientacoes/estrutura da fase 2.

### `supabase/migrations/20260604_get_leads_com_vendedor.sql`

- Cria RPC para listar leads com dados de vendedor.
- Usa `store_members` para relacionar leads/referral.

### `supabase/migrations/20260604_lead_conversion_tracking.sql`

- Adiciona rastreamento/conversao de leads.
- Cria funcoes para registrar conversao e consultar leads com vendedor.

### `supabase/migrations/20260607_sellers_can_view_store_tires.sql`

- Migration anterior para permitir visualizacao de pneus por vendedores.
- Depois foi substituida/ajustada pela migration de 2026-06-09.

### `supabase/migrations/20260609_seller_whatsapp.sql`

- Adiciona `whatsapp text` em `public.store_members`.
- Cria RPC `get_referral_seller(p_store_id uuid, p_ref_code text)`.
- Essa RPC retorna mais campos, incluindo `store_id`, `user_id`, `seller_id`, `email`; posteriormente foi criada uma RPC publica mais restrita.

### `supabase/migrations/20260609_public_referral_seller.sql`

- Cria RPC segura `get_public_referral_seller(p_store_id uuid, p_ref_code text)`.
- Retorna apenas: `id`, `nome`, `ref_code`, `whatsapp`, `status`.
- Filtra por:
  - mesmo `store_id`;
  - `ref_code` informado;
  - `role = 'seller'`;
  - `status = 'active'`;
  - WhatsApp preenchido/valido minimamente.
- Concede `EXECUTE` para `anon` e `authenticated`.
- Evita liberar a tabela `store_members` publicamente.

### `supabase/migrations/20260609_active_members_can_view_store_tires.sql`

- Remove policies antigas de SELECT em `pneus` relacionadas a vendedores.
- Cria policy `"Active members can see all tires in their store"`.
- Permite SELECT em todos os pneus da propria loja para membros ativos owner/seller.
- Nao libera leitura entre lojas nem para vendedor inativo.

## 4. Alteracoes Feitas Recentemente

### Imagens e WebP

- Criado helper reutilizavel `src/utils/imageOptimizer.js`.
- Formatos aceitos no upload de pneus:
  - PNG;
  - JPG;
  - JPEG;
  - WEBP;
  - HEIC;
  - HEIF.
- Todos sao convertidos para WebP antes do upload.
- Parametros padrao:
  - formato final `image/webp`;
  - qualidade `0.8`;
  - largura maxima `1200px`;
  - altura maxima `1200px`;
  - proporcao preservada.
- `heic2any` instalado e usado apenas com importacao dinamica:
  - `const heic2any = (await import('heic2any')).default;`
- Isso evita que `heic2any` entre no bundle inicial.
- `IMAGE_UPLOAD_ACCEPT` inclui MIME types e extensoes HEIC/HEIF.
- `src/services/storage.js` envia ao bucket `pneus-fotos` apenas o arquivo final `.webp`.

### Feedback images

- `src/data/feedbackImages.js` foi corrigido para apontar para `feedback1.webp`, `feedback2.webp`, `feedback3.webp`, `feedback4.webp`.
- O problema era que os PNGs tinham sido removidos do Supabase Storage, mas o frontend ainda apontava para `.png`.

### WhatsApp individual por vendedor

- Nao foi criada tabela `sellers`.
- A estrutura existente `public.store_members` foi usada.
- Campo `whatsapp` adicionado em `store_members`.
- Dashboard de vendedores permite cadastrar/listar/editar WhatsApp do vendedor.
- `src/services/storage.js` salva, atualiza e retorna `whatsapp`.
- `src/pages/StoreFront/StoreHome.jsx` le `ref` e tambem aceita `vendedor`.
- A vitrine usa `get_public_referral_seller` para resolver vendedor publico por `store_id + ref_code`.
- Se vendedor valido:
  - status ativo;
  - pertence a loja;
  - possui WhatsApp valido;
  - todos os botoes de WhatsApp usam o WhatsApp do vendedor.
- Se invalido/inativo/sem WhatsApp/sem ref:
  - usa WhatsApp principal da loja.
- Leads gerados com vendedor valido recebem `ref_code` e `attribution_source: 'referral'`.

### Catalogo para vendedores

- O catalogo do dashboard lista pneus por `loja_id`.
- Foi criada policy RLS para vendedor ativo visualizar todos os anuncios da propria loja.
- Objetivo resolvido: vendedor ativo consegue ver anuncios antigos, do dono e de outros vendedores da mesma loja, evitando duplicidade.
- Regras de edicao/exclusao perigosas nao foram ampliadas nesta etapa.

### Recarregamento/remount ao trocar de aba

- Causa encontrada em `src/contexts/StoreContext.jsx`.
- `onAuthStateChange` em `TOKEN_REFRESHED`/`SIGNED_IN` chamava `loadStoreData`, que setava `loading=true`.
- `DashboardLayout` desmontava a tela para mostrar "Carregando painel...", causando perda de dados digitados em formularios.
- Correcao:
  - `loadStoreData` agora aceita carregamento silencioso;
  - `TOKEN_REFRESHED` atualiza/revalida sem loading global;
  - erro temporario em refresh silencioso nao limpa `store`, `role` e `member`;
  - `SIGNED_OUT` continua limpando estado normalmente.

### Vitrine publica e card de destaque

- Ajustes visuais conservadores foram feitos em `src/pages/StoreFront/StoreFront.css`.
- O visual do card de destaque foi restaurado apos tentativas que criaram painel preto indesejado.
- Ajustes mantidos atualmente:
  - botao `Comprar no WhatsApp` do destaque ficou mais compacto;
  - bloco de badges/preco/botao foi levemente recuado para dentro do card;
  - foi criada camada transparente de degrade em `.store-hero__cover::after`;
  - a imagem original permanece intacta;
  - o degrade comeca em `#0f1116`/`rgba(15, 17, 22, 0.9)` na parte inferior e some em direcao ao topo;
  - `pointer-events: none`;
  - conteudo do card fica acima da camada (`.store-hero__floating-panel` com z-index maior).
- Descricao do destaque:
  - seletor `.hero-product-copy`;
  - limite visual de 6 linhas no desktop;
  - limite visual de 5 linhas no mobile;
  - usa `-webkit-line-clamp`;
  - descricao completa continua preservada nos dados/detalhes.
- Lista de compatibilidade nos cards:
  - seletor `.product-compatibility span`;
  - limite visual de 2 linhas no desktop;
  - limite visual de 1 linha no mobile;
  - lista completa continua preservada nos detalhes do anuncio.

### SEO, acessibilidade e performance visual

- `index.html` ajustado com title, description, OG tags, locale, canonical e favicon.
- Textos publicos revisados em PT-BR.
- Headings decorativos da landing ajustados.
- `aria-label` adicionado em botoes publicos sem nome claro.
- Imagens publicas receberam `loading`, `decoding`, `width`/`height` onde seguro.
- CLS reduzido em imagens/cards sem mexer em regras de negocio.

## 5. Arquivos Alterados Recentemente

- `index.html`
- `src/pages/LandingPage.jsx`
- `src/components/FeedbackCarousel.jsx`
- `src/data/feedbackImages.js`
- `src/utils/imageOptimizer.js`
- `src/services/storage.js`
- `src/contexts/StoreContext.jsx`
- `src/pages/Dashboard/Catalog.jsx`
- `src/pages/Dashboard/Sellers.jsx`
- `src/pages/Dashboard/StoreSettings.jsx`
- `src/pages/StoreFront/StoreHome.jsx`
- `src/pages/StoreFront/StoreFront.css`
- `src/pages/StoreFront/components/ProductCard.jsx`
- `src/pages/StoreFront/components/PublicStoreHeader.jsx`
- `src/pages/StoreFront/components/StoreFilters.jsx`
- `src/pages/StoreFront/components/VehicleSearchBox.jsx`
- `supabase/migrations/20260609_seller_whatsapp.sql`
- `supabase/migrations/20260609_public_referral_seller.sql`
- `supabase/migrations/20260609_active_members_can_view_store_tires.sql`

Observacao: ha migrations antigas de 2026-06-04 e 2026-06-07 no projeto que fazem parte da base multi-seller/leads.

## 6. Problemas Resolvidos

- Imagens de feedback quebradas apos troca de PNG para WebP.
- Upload de imagens pesadas de pneus convertido para WebP antes do Storage.
- Suporte a fotos HEIC/HEIF de iPhone com conversao para WebP.
- `heic2any` removido do bundle inicial via import dinamico.
- WhatsApp de vendedor individual usando `store_members.whatsapp`.
- Vitrine com `?ref=` e alias `?vendedor=`.
- Resolucao segura de vendedor publico via RPC `get_public_referral_seller`.
- WhatsApp que antes caia no numero geral da loja agora usa o vendedor valido quando o link tem referral.
- Vendedor ativo agora pode visualizar todos os anuncios/pneus da propria loja.
- App deixou de desmontar/recarregar visualmente ao trocar/minimizar aba por refresh de token.
- Card de destaque da vitrine recebeu ajuste visual sem painel preto.
- Overlay/degrade transparente sobre a imagem do destaque.
- Descricao longa do destaque limitada visualmente para estabilizar layout.
- Lista longa de carros compativeis nos cards limitada visualmente para estabilizar cards.

## 7. Estado Atual da Vitrine Publica

- URL local usada nos testes: `http://localhost:5173/store/minha-loja`.
- Card de destaque:
  - imagem original intacta;
  - camada de degrade sobreposta via CSS;
  - texto, badges, preco e botao acima do overlay;
  - botao compacto;
  - bloco direito recuado com margem segura;
  - sem painel preto novo.
- Cards de produtos:
  - compatibilidade limitada visualmente;
  - detalhes continuam mostrando informacao completa.

## 8. Pendencias e Proximos Passos

- Testar tudo em producao na Vercel.
- Validar WhatsApp por vendedor em producao com URLs reais:
  - `/store/:slug`;
  - `/store/:slug?ref=:ref_code`;
  - `/store/:slug?vendedor=:ref_code`.
- Validar WebP em producao e permissoes do bucket `pneus-fotos`.
- Validar catalogo como dono e como vendedor ativo.
- Validar que vendedor inativo nao acessa catalogo/recursos protegidos.
- Validar responsividade da vitrine nos breakpoints:
  - 390px;
  - 412px;
  - 768px;
  - 1024px;
  - 1366px;
  - 1440px;
  - 1536px;
  - 1920px.
- Possivel melhoria futura: autosave de rascunho nos formularios principais do dashboard.
- Possivel melhoria futura: reduzir chunks/bundle; o build direto do Vite ainda mostra aviso de chunks maiores que 500 kB.
- Possivel limpeza futura: confirmar inutilizacao antes de remover `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` e `public/icons.svg`.

## 9. Comandos Uteis

Rodar Vite diretamente:

```powershell
node .\node_modules\vite\bin\vite.js
```

Build de validacao usado nesta rodada:

```powershell
node .\node_modules\vite\bin\vite.js build
```

Deploy Vercel:

```powershell
vercel --prod
```

Observacao importante: neste ambiente local, `npm run build` falhou por problema local do npm global (`npm-cli.js` ausente). O build confiavel usado foi o comando direto do Vite acima.

## 10. Regras Importantes Para Proximas Alteracoes

- Nao alterar Supabase Auth sem necessidade.
- Nao alterar login/cadastro sem autorizacao.
- Nao alterar banco/RLS sem mapear impacto.
- Nao usar service role key no frontend.
- Nao expor chaves sensiveis.
- Nao quebrar links antigos da loja.
- Manter `/store/:storeSlug` funcionando sem referral.
- Manter `?ref=` funcionando como formato principal.
- Manter `?vendedor=` como alias.
- Nao mexer em edge functions sem autorizacao.
- Nao converter imagens ja existentes em massa sem autorizacao.
- Nao alterar URLs antigas ja salvas sem necessidade.
- Nao mexer em `React.lazy` ou code splitting sem autorizacao.
- Sempre rodar `node .\node_modules\vite\bin\vite.js build` depois das alteracoes.
- Antes de alterar algo critico, explicar causa, arquivos afetados e plano.

## 11. Onde o Projeto Parou

- A ultima alteracao aplicada foi visual na vitrine publica:
  - limite de linhas para `.product-compatibility span` nos cards de produtos;
  - 2 linhas no desktop;
  - 1 linha no mobile.
- Build direto do Vite passou apos a alteracao.
- O projeto esta pronto para nova rodada de testes visuais e funcionais, principalmente em producao/Vercel.
