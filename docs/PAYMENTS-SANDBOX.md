# Checkout Pro mensal manual — sandbox

O PneuFlow cobra R$ 39,00 por um período manual de 30 dias. Não há recorrência automática, `preapproval`, cartão salvo, cobrança de produção ou ativação pelo retorno do navegador.

## Execução local

Use `vercel dev` para testar as Vercel Functions. `npm run dev` continua útil para a interface, mas o Express local não monta as rotas de Mercado Pago.

Defina apenas em um arquivo local ignorado pelo Git, com credenciais de teste:

```text
PAYMENTS_ENABLED=true
MERCADO_PAGO_MODE=test
MERCADO_PAGO_ACCESS_TOKEN=<token-de-teste>
MERCADO_PAGO_WEBHOOK_SECRET=<segredo-de-teste>
SUPABASE_URL=<url-do-projeto>
SUPABASE_PUBLISHABLE_KEY=<chave-publicavel>
SUPABASE_SERVICE_ROLE_KEY=<service-role>
APP_URL=http://localhost:3000
```

Nunca use prefixo `VITE_` para tokens Mercado Pago, segredo de webhook ou service role. Não cole valores de credenciais nesta documentação.

## Ponto de controle obrigatório — Supabase

Migration pendente: `supabase/migrations/20260714213000_manual_monthly_checkout.sql`.

Ela cria `payment_orders` e `payment_webhook_events`, restringe mudanças financeiras em `stores` e instala a RPC idempotente `apply_manual_payment_approval`.

Não execute `supabase db push` sem autorização explícita. Em sandbox, aplique primeiro em um projeto/branch de teste e valide:

1. Um proprietário não consegue alterar `subscription_status` pela API autenticada.
2. Atualizações comuns de perfil e vitrine da loja continuam funcionando.
3. Um pedido aprovado atualiza `current_period_end` em 30 dias.
4. Um segundo webhook do mesmo pagamento não estende novamente o período.

## Preview e webhook

No ambiente **Preview** da Vercel, configure `PAYMENTS_ENABLED=true` e `MERCADO_PAGO_MODE=test`, além das quatro credenciais de servidor acima. Não configure `PAYMENTS_ENABLED=true` em Production.

Após criar o Preview, registre no Mercado Pago, em modo teste, a URL:

```text
https://<preview>/api/mercadopago/webhook
```

Selecione eventos de pagamentos e salve o segredo gerado exclusivamente como `MERCADO_PAGO_WEBHOOK_SECRET` em Preview. Depois redeploye o Preview.

## Compra simulada

Use uma janela anônima, um usuário PneuFlow de teste e uma conta compradora de teste distinta da vendedora. O retorno só mostra confirmação em andamento; a liberação acontece depois que o webhook assinado consulta o pagamento no Mercado Pago e aplica a RPC.

## Produção futura

O código mantém produção bloqueada até que `PAYMENTS_PRODUCTION_ALLOWED=true` seja configurado deliberadamente, junto com `MERCADO_PAGO_MODE=production`. Esta tarefa não autoriza essa configuração.
