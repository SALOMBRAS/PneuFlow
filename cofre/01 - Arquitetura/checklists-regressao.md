---
tipo: arquitetura
area: checklists-regressao
camada: qualidade
status: ativo
tokens: medio
fonte:
  - src/App.jsx
  - src/pages/LandingPage.jsx
  - src/pages/Auth/Register.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/Leads.jsx
  - src/pages/Dashboard/Sellers.jsx
  - src/pages/Dashboard/StoreSettings.jsx
  - src/pages/StoreFront/StoreHome.jsx
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Use estes checklists para validar mudancas sem testar o projeto inteiro toda vez.
> Se mexer em `storage.js`, rode o checklist da tela consumidora e um build.

# Checklists de Regressao

## Base obrigatoria para qualquer mudanca de UI

- Abrir em desktop e mobile.
- Conferir 340px, 360px, 390px, 412px quando a mudanca for mobile.
- Confirmar ausencia de scroll horizontal.
- Conferir foco/teclado em botoes e modais alterados.
- Executar `npm run build` quando houver alteracao de codigo-fonte.

## Landing page

- Hero renderiza sem H1 cortado no mobile.
- CTAs principais levam para `/register`.
- Header mostra login e CTA.
- Demo interativa troca abas e filtros sem Supabase.
- FAQ abre/fecha.
- Footer mantem link `/privacidade`.
- CardSwap nao quebra mobile.

## Cadastro e privacidade

- Tentar cadastrar sem aceite mostra erro amigavel.
- Abrir modal de termos nao limpa campos preenchidos.
- Botao "Li e aceito" so habilita apos rolar ate o final.
- Fechar modal sem aceitar mantem aceite desmarcado.
- Aceitar marca estado visual e libera envio.
- `/privacidade` abre independente de login.

## Login/sessao

- Login invalido mostra erro.
- Login valido navega para `/dashboard`.
- "Lembrar-me" salva preferencia e e-mail.
- Logout limpa sessao e volta para `/login`.

## Dashboard layout

- Sidebar desktop permanece visivel durante scroll.
- Footer da sidebar mostra "Ver Minha Vitrine" e "Sair do Painel".
- Conteudo principal nao some.
- Menu mobile abre/fecha, trava fundo e nao corta logout.
- Vendedor nao acessa rotas de owner.

## Dashboard Home

- Cards principais: Total de Pneus, Leads no WhatsApp, Faturamento, Visualizacoes e Taxa de conversao.
- Clique no card abre detalhe; clique no mesmo card fecha.
- Desktop usa painel abaixo dos cards.
- Mobile usa bottom sheet.
- Dados vazios mostram zero.
- Ranking comercial nao quebra com seller/ref ausente.
- Acoes rapidas aparecem abaixo de Leads Recentes.
- Visualizacoes totais e de hoje batem com `store_referral_visits`.
- Conversao usa `(leads / visualizacoes) * 100`, nao vendas/visualizacoes.

## Catalogo

- Listar pneus da loja atual.
- Buscar por marca/modelo/medida.
- Filtrar por marca.
- Criar pneu com campos obrigatorios.
- Editar pneu.
- Owner exclui pneu.
- Seller visualiza anuncios da loja.
- Upload respeita limite de 2 fotos.
- Foto principal e remocao funcionam.

## Upload

- PNG/JPG/WEBP funcionam no upload de pneu.
- HEIC/HEIF converte ou mostra erro amigavel.
- Arquivos invalidos mostram erro.
- Logo da loja aceita imagem abaixo de 2MB.
- Preview nao estoura largura.

## Leads

- Lista carrega por loja.
- Busca por cliente, produto e vendedor.
- Paginacao funciona.
- Confirmar venda muda status.
- Desfazer venda remove confirmacao.
- Excluir lead pede confirmacao e atualiza lista.
- Vendedor so ve o permitido por RLS/RPC.

## Vendedores

- Criar vendedor com nome, e-mail e senha valida.
- Ref code e exibido e pode ser editado.
- WhatsApp do vendedor salva normalizado.
- Link da vitrine com `?ref=` abre.
- Desativar, reativar e remover acesso funcionam.
- Vendedor removido/inativo nao deve receber referral valido.

## Configuracoes

- Salvar nome da loja.
- Salvar WhatsApp valido.
- Salvar endereco/cidade/UF.
- Salvar tipo de vitrine.
- Upload de logo.
- Botao "Visualizar Vitrine" abre `/store/:slug`.

## Vitrine publica

- Abrir `/store/:slug` sem login.
- Abrir sem ref usa WhatsApp da loja.
- Abrir com `?ref=` valido usa WhatsApp do vendedor.
- Abrir com ref invalido usa WhatsApp da loja.
- Recarregar a vitrine no mesmo dia nao deve gerar nova visualizacao.
- Abrir no dia seguinte deve gerar nova visualizacao.
- Filtros por medida, marca, estoque e tipo funcionam.
- Busca por veiculo aplica/limpa.
- Card destaque nao corta botao/preco em mobile.
- Lead gerado aparece no dashboard.

## Supabase/RPC

- Nao executar SQL sem comparar remoto/local.
- Validar assinatura de RPC antes de alterar payload.
- Se RLS falhar em metrica parcial, dashboard deve seguir funcionando.
- Nunca colocar service role no frontend.
