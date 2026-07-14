# Story: PneuFlow MVP Development

## Extensão Android com Capacitor — 2026-07-13

### Checklist de aceitação

- [x] Branch local `feat/capacitor-android-mvp` criada sem commit ou push
- [x] Baseline web validado antes da implementação
- [x] Capacitor 8 configurado com frontend único e bundle local em `dist`
- [x] Projeto Android criado em `android/` com `br.com.pneuflow.app`
- [x] API própria, URL pública, callbacks de autenticação e links externos centralizados
- [x] CORS restritivo validado localmente e em preview Vercel
- [x] Landing, login, sessão lembrada, dashboard, catálogo, leads, vendedores, configurações e vitrine executados no AVD
- [x] Botão voltar e vitrine interna validados no Android
- [x] WhatsApp validado como abertura externa sem envio de mensagem
- [x] APK debug gerado pelo Gradle Wrapper
- [x] Produção publicada e domínio canônico validado com CORS restritivo para web e Android
- [x] APK final reconstruído, reinstalado e validado no AVD sem falha fatal
- [ ] Cadastro e recuperação por e-mail dependem da confirmação do painel Supabase e de e-mail descartável autorizado
- [ ] Checkout em produção depende das variáveis do Mercado Pago; nenhuma preferência ou cobrança foi criada
- [ ] Lint global permanece bloqueado por 122 erros e 7 avisos preexistentes no baseline

### File list da extensão Android

- [NEW] `capacitor.config.json`, `.env.android`, `android/`, `src/lib/runtime.js`, `src/lib/externalLinks.js` e `server/cors.js`.
- [MODIFY] `package.json`, `package-lock.json`, `.env.example`, `eslint.config.js`, `src/App.jsx` e `src/services/storage.js`.
- [MODIFY] `src/pages/Subscription.jsx`, `src/pages/StoreFront/StoreHome.jsx` e páginas do dashboard relacionadas a links e vendedores.
- [MODIFY] `api/index.js`, `api/mercadopago/create-preference.js` e `server.js`.
- [MODIFY] `android/app/src/main/AndroidManifest.xml` e `android/.gitignore` para impedir backup e ignorar materiais de assinatura/serviços locais.

Este documento registra o desenvolvimento e a entrega do MVP para a plataforma SaaS **PneuFlow**.

## 📋 Checklist de Aceitação

- [x] Landing Page Institucional criada e funcional
- [x] Cadastro e Login de Lojistas implementado com simulação de sessão
- [x] Dashboard do lojista funcional com visualização de métricas e leads
- [x] Catálogo de Pneus CRUD completo no painel do lojista
- [x] Associação e cadastro de compatibilidade de veículos com pneus
- [x] Vitrine pública da loja com White-label dinâmico baseado nas cores da loja
- [x] Busca inteligente por veículo (Marca -> Modelo -> Ano -> Versão)
- [x] Redirecionamento e geração de lead qualificado para o WhatsApp
- [x] Interface moderna, limpa e responsiva (Mobile-First na vitrine)
- [x] Sem warnings ou erros de linting (`npm run lint` passa limpo)
- [x] Build de produção bem sucedido (`npm run build` passa limpo)

## 📁 Lista de Arquivos Modificados / Criados

Todos os arquivos abaixo foram implementados no escopo desta Story:

- [NEW] [storage.js](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/services/storage.js) - Serviço de persistência no LocalStorage com mock data inicial.
- [NEW] [index.css](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/index.css) - Folha de estilos globais e Design System premium (Outfit, Inter e paleta automotiva).
- [NEW] [App.css](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/App.css) - Limpeza da folha original de styles do Vite.
- [NEW] [App.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/App.jsx) - Configuração de todas as rotas da aplicação (react-router-dom).
- [NEW] [LandingPage.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/LandingPage.jsx) - Landing Page de conversão para venda do SaaS.
- [NEW] [Login.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/Auth/Login.jsx) - Tela de login do lojista.
- [NEW] [Register.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/Auth/Register.jsx) - Tela de cadastro da loja/proprietário.
- [NEW] [DashboardLayout.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/Dashboard/DashboardLayout.jsx) - Layout estrutural do dashboard com sidebar responsiva.
- [NEW] [DashboardHome.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/Dashboard/DashboardHome.jsx) - Dashboard inicial com métricas e leads recentes.
- [NEW] [Catalog.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/Dashboard/Catalog.jsx) - Catálogo com CRUD de pneus e gestão de compatibilidade de veículos.
- [NEW] [Leads.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/Dashboard/Leads.jsx) - Relatório e listagem de contatos qualificados.
- [NEW] [StoreSettings.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/Dashboard/StoreSettings.jsx) - Personalização de WhatsApp, endereço, horários e cor de destaque da marca.
- [NEW] [StoreHome.jsx](file:///c:/Projeto%20Salo/Projeto%2001/project-1/src/pages/StoreFront/StoreHome.jsx) - Vitrine pública da loja com white-label e buscador por veículo.
- [MODIFY] [index.html](file:///c:/Projeto%20Salo/Projeto%2001/project-1/index.html) - SEO Meta tags e título adaptados.
