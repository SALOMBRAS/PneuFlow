# Pausa do Projeto - PneuFlow

## Data e estado geral

- Data da pausa: 18/06/2026.
- Estado geral: baseline de migrations criada a partir do schema remoto atual e migration do teste gratuito de 7 dias aplicada no Supabase.
- Estado final do GitHub: commit principal enviado para `origin/main`; documento de pausa sera enviado em commit separado.
- Integracao com AbacatePay: ainda nao implementada.

## Repositorio GitHub

- URL: https://github.com/SALOMBRAS/PneuFlow.git
- Branch: `main`
- Ultimo commit antes desta pausa: `d5a0846 docs: reforca protocolo do cofre no agente`
- Commit principal desta pausa: `cf35fde feat: add 7-day trial and Supabase migration baseline`
- Push do commit principal: concluido em `origin/main`.
- Commit final de documentacao da pausa: a atualizar apos este arquivo ser salvo.
- Remote configurado: `origin` apontando para `https://github.com/SALOMBRAS/PneuFlow.git`

## Supabase

- Nome do projeto: `PneuFLow`
- Project ref: `umwtskvfjgqsrpdgunmk`
- Regiao: `us-east-1`
- Estado do link: projeto vinculado pela Supabase CLI.
- Comando especial usado no lugar do npx quebrado:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes supabase -- COMANDO
```

## Baseline de migrations

- Motivo da baseline: o historico remoto de migrations estava ausente e as migrations locais antigas estavam parcialmente refletidas no banco remoto.
- Fonte da verdade adotada: schema remoto atual do Supabase.
- Timestamp da baseline: `20260618171439`
- Arquivo ativo da baseline: `supabase/migrations/20260618171439_remote_schema.sql`
- Confirmacao Local/Remote: `20260618171439` aparece em Local e Remote.
- Migrations antigas arquivadas em: `docs/legacy-migrations/pre-baseline/`
- Migration invalida arquivada em: `docs/legacy-migrations/20260604_multi_seller_phase2.txt`
- Backup estrutural ignorado pelo Git:
  - `backups/supabase/schema_before_baseline.sql`
  - `backups/supabase/schema_after_trial.sql`
  - `backups/supabase/migration_history_absent.txt`
- A pasta `backups/supabase/` esta no `.gitignore`.

## Teste gratuito de 7 dias

- Arquivos criados/alterados no frontend:
  - `src/utils/subscriptionAccess.js`
  - `src/pages/Subscription.jsx`
  - `src/pages/Dashboard/DashboardLayout.jsx`
  - `src/App.jsx`
  - `src/services/storage.js`
- Migration aplicada: `supabase/migrations/20260618172000_store_subscription_trial.sql`
- Campos adicionados em `public.stores`:
  - `subscription_status`
  - `trial_started_at`
  - `trial_ends_at`
  - `subscription_started_at`
  - `current_period_end`
  - `payment_provider`
  - `payment_subscription_id`
- Estados possiveis: `trialing`, `active`, `past_due`, `canceled`, `blocked`.
- Regra de acesso inicial:
  - acesso liberado quando `subscription_status = active`;
  - ou quando `subscription_status = trialing` e `trial_ends_at` ainda nao venceu.
- Rotas protegidas bloqueadas quando o teste vence: areas do dashboard do lojista.
- Rota de assinatura: `/assinatura`.
- Aviso no dashboard: mostra dias restantes do teste e CTA de assinatura.
- Preco exibido: R$ 39,00/mes.
- Botao de assinatura: ainda nao cobra, nao ativa assinatura e esta preparado para checkout futuro.

## Validacoes realizadas

- `db push`: executado com sucesso para a migration `20260618172000_store_subscription_trial.sql`.
- `migration list` final esperado:
  - `20260618171439 | 20260618171439`
  - `20260618172000 | 20260618172000`
- Dump posterior criado: `backups/supabase/schema_after_trial.sql`.
- Validacao remota confirmou os sete campos em `public.stores`.
- Default de `subscription_status`: `'trialing'::text`.
- Default de `trial_started_at`: `now()`.
- Default de `trial_ends_at`: `now() + interval '7 days'`.
- Constraint criada: `stores_subscription_status_check`.
- Build passou com:

```powershell
node .\node_modules\vite\bin\vite.js build
```

- `git diff --check` passou sem erros; restaram apenas avisos de normalizacao LF/CRLF.

## O que ainda nao foi testado

- Conta nova recebendo sete dias.
- Aviso com tres dias restantes.
- Aviso com menos de 24 horas.
- Teste vencido.
- Assinatura `active` simulada.
- Comportamento mobile.
- Logout na tela `/assinatura`.

## Proximo passo recomendado

1. Identificar uma loja exclusivamente de teste.
2. Confirmar o ID antes de qualquer `UPDATE`.
3. Testar todos os estados do trial com SQL manual controlado.
4. Validar mobile e logout na tela `/assinatura`.
5. Somente depois integrar a AbacatePay.

## AbacatePay

- Gateway escolhido: AbacatePay.
- Plano pretendido: R$ 39,00 por mes.
- Teste gratuito sera controlado pelo PneuFlow.
- Nao adicionar outro trial no gateway.
- Integracao ainda pendente.
- Checkout deve ser criado por Edge Function.
- Confirmacao deve ocorrer por webhook.
- API key nunca deve ficar no frontend, GitHub ou variavel `VITE_`.
- Nao registrar o valor da chave neste arquivo.

## Seguranca

- Arquivos `.env` nao foram enviados.
- `backups/supabase/` esta no `.gitignore`.
- Nenhuma chave secreta foi adicionada.
- Service role nao esta no frontend.
- Nunca executar migrations antigas arquivadas novamente.

## Comandos para retomar

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes supabase -- migration list
node .\node_modules\vite\bin\vite.js build
git status --short
git log -1 --oneline
```

## Pendencias ordenadas

### Alta prioridade

- Testar o trial em uma loja exclusivamente de teste.
- Validar redirecionamento para `/assinatura` com teste vencido.
- Confirmar que uma loja `active` continua acessando o dashboard.

### Media prioridade

- Validar responsividade mobile do aviso de trial e da tela `/assinatura`.
- Documentar o plano de webhook e checkout da AbacatePay antes de implementar.

### Baixa prioridade

- Melhorar observabilidade dos estados de assinatura no painel.
- Criar checklist operacional para renovacao, atraso e cancelamento.
