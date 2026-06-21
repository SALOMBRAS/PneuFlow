---
tipo: decisao
area: seguranca
status: ativo
tokens: medio
decisao: "Aplicar hardening defensivo de baixo risco sem alterar banco ou regras de negocio"
data: 2026-06-21
fonte:
  - api/mercadopago/create-preference.js
  - api/index.js
  - src/lib/supabase.js
  - src/services/storage.js
  - src/pages/Auth/Login.jsx
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/Dashboard/DashboardHome.jsx
  - vercel.json
  - .env.example
atualizado: 2026-06-21
tags:
  - seguranca
  - hardening
  - auditoria
---

> [!tldr]
> A etapa de seguranca atual e defensiva e de baixo risco.
> Nao altera banco, migrations, RLS, Auth, webhook, trial ou ativacao de assinatura.
> As mudancas reduzem exposicao de dados, reforcam validacao e deixam logs menos sensiveis.

# Seguranca e hardening

## Escopo permitido nesta etapa

- Auditar segredos, rotas de API, Supabase, Mercado Pago, autenticacao, autorizacao, logs, validacao e dependencias.
- Aplicar apenas melhorias locais de baixo risco.
- Nao executar `supabase db push`.
- Nao executar migrations.
- Nao alterar Supabase remoto, Auth, schema ou RLS.
- Nao criar webhook.
- Nao ativar assinatura automaticamente.
- Nao alterar dados reais.

## Melhorias aplicadas

- Checkout Mercado Pago:
  - `MERCADO_PAGO_ACCESS_TOKEN` continua restrito ao backend.
  - O preco continua fixo no backend em R$ 39,00.
  - O corpo do `POST` agora rejeita JSON invalido.
  - `storeId`/`storeSlug` sao normalizados e o `external_reference` aceita apenas caracteres seguros.
  - `storeName` e limitado antes de entrar em metadata/descricao.
  - Logs rotineiros de configuracao ficam restritos ao ambiente local/desenvolvimento.

- Vitrine publica:
  - A consulta publica por slug usa uma lista menor de colunas.
  - Dados internos como `owner_id`, `payment_provider`, `payment_subscription_id`, `subscription_started_at` e `plan_due_date` nao sao mais buscados pela vitrine publica.
  - Campos minimos de acesso comercial ainda sao mantidos para `getSubscriptionAccess(store)`.

- Leads e metricas:
  - Erro ao registrar lead nao imprime mais o payload completo do lead no console.
  - Metricas de dashboard nao buscam mais `visitor_id`, `user_agent`, `path`, email ou whatsapp dos vendedores quando esses campos nao sao necessarios para os calculos.

- Backend legado/mock:
  - Respostas de auth/lojas removem `password` e `ownerPassword` antes de devolver JSON.
  - Logs de login/registro deixaram de imprimir e-mail, id de usuario e nome da loja.

- Frontend:
  - Credenciais demo da tela de login aparecem apenas em desenvolvimento local.
  - Aberturas de WhatsApp em nova aba usam `noopener,noreferrer`.

- Vercel:
  - Foram adicionados headers basicos: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`.
  - CSP nao foi ativada nesta etapa para evitar quebra inesperada de imagens, Supabase, Vite ou Mercado Pago.

- Ambiente:
  - `.env.example` passou a documentar tambem as variaveis do Mercado Pago sem valores reais.
  - `.env` e `.env.local` continuam fora do Git.

## Riscos ainda pendentes que exigem decisao

- O backend legado em `api/index.js` e `server.js` ainda possui endpoints amplos e mock local.
  - Recomendacao futura: confirmar se pode desativar/remover esse backend legado em producao ou proteger suas rotas.

- A tabela `stores` possui politica publica ampla para leitura.
  - A reducao de colunas no frontend ajuda, mas a correcao forte exige mudanca de banco, view publica ou RPC publica controlada.
  - Isso precisa de etapa separada com revisao de RLS/migrations.

- `store_members.senha_inicial` ainda existe e e exibida no fluxo de vendedores.
  - Isso foi preservado porque altera modelo de dados e fluxo operacional.
  - Recomendacao futura: remover armazenamento de senha inicial em texto claro e substituir por convite/reset seguro.

- RPCs publicas de vitrine/leads podem precisar de rate limit, CAPTCHA ou protecoes anti-abuso.
  - Nao foi alterado nesta etapa porque envolve regras de negocio e/ou infraestrutura.

- Logs de erros no frontend ainda podem mostrar mensagens tecnicas no console do navegador.
  - Nao foram removidos em massa para nao prejudicar diagnostico durante desenvolvimento.

- CSP deve ser planejada em etapa propria.
  - Sugerido levantar dominios necessarios de Supabase Storage, Mercado Pago, imagens externas e Vercel antes de ativar.

## Checklist antes de producao

- Revisar RLS do Supabase antes de expor novos fluxos publicos.
- Remover, desativar ou proteger o backend legado se ele nao for necessario em producao.
- Criar webhook seguro do Mercado Pago em etapa separada.
- Nao ativar assinatura pelo retorno visual de `/assinatura/retorno`.
- Configurar variaveis de ambiente na Vercel sem valores no repositorio.
- Garantir que `.env` e `.env.local` nunca sejam adicionados ao Git.
- Testar headers de seguranca em producao antes de ativar regras mais restritivas como CSP.
- Revisar permissoes publicas da vitrine e reduzir exposicao de campos internos.
- Revisar rate limit, CAPTCHA ou protecao anti-abuso para leads e visitas publicas.
- Revisar logs de producao para evitar dados pessoais, tokens, payloads completos ou respostas de provedores.
- Testar fluxo completo de trial ativo, trial vencido e assinatura ativa.

## Checklist de regressao depois desta etapa

- Login local continua funcionando.
- Dashboard continua carregando loja e metricas.
- Vitrine publica por `/store/:slug` continua abrindo.
- CTAs de WhatsApp continuam abrindo corretamente quando a loja tem acesso.
- Trial ativo/vencido continua obedecendo `getSubscriptionAccess(store)`.
- Botao de assinatura continua criando preferencia do Mercado Pago.
- Build passa sem novos erros.
