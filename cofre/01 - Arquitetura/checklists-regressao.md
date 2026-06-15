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
> Use estes checklists para validar mudanças sem testar o projeto inteiro toda vez.
> Se mexer em `storage.js`, rode o checklist da tela consumidora e um build.

# Checklists de Regressão

## Base obrigatória para qualquer mudança de UI

- Abrir em desktop e mobile.
- Conferir 340px, 360px, 390px, 412px quando a mudança for mobile.
- Confirmar ausência de scroll horizontal.
- Conferir foco/teclado em botões e modais alterados.
- Executar `npm run build` quando houver alteração de código-fonte.

## Landing page

- Hero renderiza sem H1 cortado no mobile.
- CTAs principais levam para `/register`.
- Header mostra login e CTA.
- Demo interativa troca abas e filtros sem Supabase.
- FAQ abre/fecha.
- Footer mantém link `/privacidade`.
- CardSwap não quebra mobile.

## Cadastro e privacidade

- Tentar cadastrar sem aceite mostra erro amigável.
- Abrir modal de termos não limpa campos preenchidos.
- Botão "Li e aceito" só habilita após rolar até o final.
- Fechar modal sem aceitar mantém aceite desmarcado.
- Aceitar marca estado visual e libera envio.
- `/privacidade` abre independente de login.

## Login/sessão

- Login inválido mostra erro.
- Login válido navega para `/dashboard`.
- "Lembrar-me" salva preferência e e-mail.
- Logout limpa sessão e volta para `/login`.

## Dashboard layout

- Sidebar desktop permanece visível durante scroll.
- Footer da sidebar mostra "Ver Minha Vitrine" e "Sair do Painel".
- Conteúdo principal não some.
- Menu mobile abre/fecha, trava fundo e não corta logout.
- Vendedor não acessa rotas de owner.

## Dashboard Home

- Cards principais: Total de Pneus, Leads no WhatsApp, Faturamento, Visualizações.
- Clique no card abre detalhe; clique no mesmo card fecha.
- Desktop usa painel abaixo dos cards.
- Mobile usa bottom sheet.
- Dados vazios mostram zero.
- Ranking comercial não quebra com seller/ref ausente.
- Ações rápidas aparecem abaixo de Leads Recentes.

## Catálogo

- Listar pneus da loja atual.
- Buscar por marca/modelo/medida.
- Filtrar por marca.
- Criar pneu com campos obrigatórios.
- Editar pneu.
- Owner exclui pneu.
- Seller visualiza anúncios da loja.
- Upload respeita limite de 2 fotos.
- Foto principal e remoção funcionam.

## Upload

- PNG/JPG/WEBP funcionam no upload de pneu.
- HEIC/HEIF converte ou mostra erro amigável.
- Arquivos inválidos mostram erro.
- Logo da loja aceita imagem abaixo de 2MB.
- Preview não estoura largura.

## Leads

- Lista carrega por loja.
- Busca por cliente, produto e vendedor.
- Paginação funciona.
- Confirmar venda muda status.
- Desfazer venda remove confirmação.
- Excluir lead pede confirmação e atualiza lista.
- Vendedor só vê o permitido por RLS/RPC.

## Vendedores

- Criar vendedor com nome, e-mail e senha válida.
- Ref code é exibido e pode ser editado.
- WhatsApp do vendedor salva normalizado.
- Link da vitrine com `?ref=` abre.
- Desativar, reativar e remover acesso funcionam.
- Vendedor removido/inativo não deve receber referral válido.

## Configurações

- Salvar nome da loja.
- Salvar WhatsApp válido.
- Salvar endereço/cidade/UF.
- Salvar tipo de vitrine.
- Upload de logo.
- Botão "Visualizar Vitrine" abre `/store/:slug`.

## Vitrine pública

- Abrir `/store/:slug` sem login.
- Abrir sem ref usa WhatsApp da loja.
- Abrir com `?ref=` válido usa WhatsApp do vendedor.
- Abrir com ref inválido usa WhatsApp da loja.
- Filtros por medida, marca, estoque e tipo funcionam.
- Busca por veículo aplica/limpa.
- Card destaque não corta botão/preço em mobile.
- Lead gerado aparece no dashboard.

## Supabase/RPC

- Não executar SQL sem comparar remoto/local.
- Validar assinatura de RPC antes de alterar payload.
- Se RLS falhar em métrica parcial, dashboard deve seguir funcionando.
- Nunca colocar service role no frontend.
