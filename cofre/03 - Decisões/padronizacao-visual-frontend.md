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
atualizado: 2026-06-22
tags: []
---

> [!tldr]
> A landing page virou referencia visual global: dark premium, amber/orange, Inter/Outfit, cards escuros e bordas sutis.
> A nova rodada reforcou a aparencia de SaaS premium em landing, dashboard, catalogo, vendedores, configuracoes, assinatura e vitrine publica, sem alterar banco, Supabase, Mercado Pago, trial ou regras de Auth.

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
- `--shadow-premium-glow`
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

## Primitivas visuais reutilizaveis

`src/index.css` agora tambem centraliza classes de apoio para telas novas e ajustes finos:

- `.pf-card`
- `.pf-panel`
- `.pf-card-premium`
- `.pf-gradient-border`
- `.pf-section-header`
- `.pf-kicker`
- `.pf-badge`
- `.pf-badge-soft`
- `.pf-button-primary`
- `.pf-button-secondary`
- `.pf-button-whatsapp`
- `.pf-input`
- `.pf-empty-state`
- `.pf-glow`

Essas classes devem ser preferidas antes de criar novos estilos locais. A ideia e manter os cards, botoes, badges, inputs, estados vazios e headers com a mesma linguagem visual.

## Evolucao UX/UI 2026-06-22

### Landing page

- Hero ficou mais direto para conversao: vender mais pneus com vitrine online integrada ao WhatsApp.
- Navegacao aponta para beneficios, funcionamento, preco e FAQ.
- Foram adicionadas secoes de beneficios, como funciona e preco.
- O card de preco usa superficie premium e CTA claro para teste gratis.
- Efeitos premium ficaram limitados a cards principais e CTAs, evitando excesso de neon ou animacao.

### Cadastro e termos

- Cadastro em desktop foi dividido visualmente em dois blocos: informacoes pessoais e dados da loja.
- Mobile continua com experiencia de card unico para nao alongar demais a tela.
- Modal de termos teve o botao de fechar reposicionado dentro do enquadro.

### Dashboard principal

- Cards de metricas e detalhes seguem visual premium com hover suave, borda sutil e foco visivel.
- Listas internas, ranking comercial e acoes rapidas foram compactadas para evitar vazamento visual.
- Estados vazios seguem o padrao de superficie escura com chamada clara.

### Catalogo de pneus

- A tela ganhou cabecalho com kicker e resumo visual de pneus cadastrados, anuncios ativos e estoque total.
- Filtros e cards de pneus foram marcados com classes especificas para acabamento premium.
- Estado vazio agora orienta o lojista a cadastrar o primeiro pneu e publicar a vitrine.
- Acoes dos cards continuam as mesmas, com cuidado para nao vazar no mobile.

### Vendedores

- A aba ganhou cabecalho de equipe comercial, resumo de vendedores, ativos e pendentes.
- A tabela recebeu acabamento visual de painel comercial.
- A coluna de senha foi removida; o dono pode cadastrar e alterar senha, mas nao pode visualizar senha do vendedor.

### Configuracoes da vitrine

- A tela ganhou kicker de vitrine publica e preview visual da loja.
- O preview mostra logo, nome, descricao, cidade/UF e status do WhatsApp configurado usando os dados ja carregados na tela.
- Nenhum salvamento, campo ou regra de banco foi alterado.

### Assinatura e retorno

- A pagina de assinatura recebeu copy mais clara sobre plano PRO, reativacao e valor mensal.
- O retorno de assinatura usa card premium e explica que a tela visual nao ativa assinatura sozinha.
- Nao houve webhook nem ativacao automatica nesta etapa.

### Vitrine publica

- Busca por medida foi retirada da parte alta no mobile para reduzir a distancia ate o catalogo.
- Busca por veiculo e marca foram movidas para um modal de busca aberto por CTA proximo ao topo.
- Catalogo, filtros, cards e CTAs comerciais continuam respeitando a regra central de acesso comercial.

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
- Evitar efeitos premium em todos os cards; usar glow/gradiente apenas onde ajuda conversao.
- Nao duplicar logica de assinatura/trial em componentes visuais.
- Manter mensagens publicas da vitrine sem detalhes administrativos.
- Validar mobile 340/360/390/412 e desktop 1366/1440.

## Pendencias visuais futuras

- Revisar a tela de leads com o mesmo nivel de acabamento do catalogo e vendedores.
- Fazer uma passada final de consistencia de copy acentuada em arquivos antigos que ainda contem texto com encoding quebrado.
- Validar capturas em desktop e mobile apos login real para conferir densidade de tabelas com dados grandes.
