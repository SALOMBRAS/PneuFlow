# Story 02 — Checkout Pro mensal manual

## Status

Ready for Dev

## Story

Como proprietário de uma loja, quero pagar manualmente R$ 39,00 pelo plano PRO a cada mês via Mercado Pago Checkout Pro para manter minha loja ativa sem renovação automática.

## Acceptance Criteria

- [ ] Checkout é autenticado e deriva a loja do proprietário.
- [ ] Pedido, webhook e ativação são idempotentes e não dependem do retorno do navegador.
- [ ] Apenas backend privilegiado atualiza os campos financeiros da loja.
- [ ] Pagamento aprovado estende o acesso por 30 dias; pagamento antecipado soma ao período vigente.
- [ ] O frontend reconcilia status confirmado e bloqueia assinatura vencida.
- [ ] Testes locais passam; migration e credenciais externas permanecem em ponto de controle manual.

## Tasks / Subtasks

- [x] Criar migration segura de checkout manual e RPC transacional.
- [x] Implementar endpoints autenticados de preferência/status e webhook assinado.
- [x] Atualizar telas de assinatura, retorno e regra de acesso.
- [x] Cobrir fluxo com testes automatizados e documentar sandbox/Cofre.
- [x] Executar validações locais e registrar ações manuais externas.

## Dev Agent Record

### File List

- `.env.example`
- `api/mercadopago/_lib/config.js`
- `api/mercadopago/_lib/constants.js`
- `api/mercadopago/_lib/http.js`
- `api/mercadopago/_lib/mercado-pago.js`
- `api/mercadopago/_lib/orders.js`
- `api/mercadopago/_lib/period.js`
- `api/mercadopago/_lib/supabase.js`
- `api/mercadopago/_lib/webhook-signature.js`
- `api/mercadopago/create-preference.js`
- `api/mercadopago/payment-status.js`
- `api/mercadopago/webhook.js`
- `docs/PAYMENTS-SANDBOX.md`
- `package.json`
- `src/lib/paymentPolling.js`
- `src/pages/Subscription.jsx`
- `src/pages/SubscriptionReturn.jsx`
- `src/utils/subscriptionAccess.js`
- `supabase/migrations/20260714213000_manual_monthly_checkout.sql`
- `tests/payments/handlers.test.js`
- `vercel.json`

### Completion Notes

- Implementação local concluída para Preview/sandbox; migration não foi aplicada remotamente.
- `npm test`, lint específico dos arquivos de pagamento e `npm run build` passaram.
- O lint global permanece bloqueado por erros pré-existentes fora deste escopo.
- Preview, credenciais, webhook externo e compra sandbox dependem do ponto de controle manual documentado.
