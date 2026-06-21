---
tipo: decisao
area: vitrine-bloqueio-comercial
status: ativo
tokens: medio
decisao: "Manter vitrine publica visivel, mas bloquear CTAs comerciais quando a loja nao tem acesso comercial"
data: 2026-06-18
fonte:
  - src/pages/StoreFront/StoreHome.jsx
  - src/pages/StoreFront/StoreFront.css
  - src/pages/StoreFront/components/PublicStoreHeader.jsx
  - src/pages/StoreFront/components/VehicleSearchBox.jsx
  - src/pages/StoreFront/components/ProductCard.jsx
  - src/utils/subscriptionAccess.js
atualizado: 2026-06-21
tags: []
---

> [!tldr]
> Quando `getSubscriptionAccess(store).hasStoreAccess` e falso, a vitrine publica continua aberta.
> A loja nao gera lead nem abre WhatsApp; CTAs comerciais ficam desabilitados com aviso publico discreto.

# Vitrine: Bloqueio Comercial

## Regra de negocio

Quando trial/assinatura estiver vencido:

- Dashboard continua bloqueado.
- Dados da loja e catalogo continuam salvos.
- Vitrine publica continua acessivel.
- Catalogo, filtros e cards continuam visiveis.
- CTAs comerciais sao bloqueados.
- Visitante publico nao ve termos administrativos como trial, assinatura, pagamento ou painel.

Mensagem publica:

`Esta vitrine esta temporariamente inativa. Entre em contato com a loja ou aguarde a reativacao.`

## Implementacao confirmada

`StoreHome.jsx` calcula:

- `subscriptionAccess = getSubscriptionAccess(store)`
- `commercialContactEnabled = subscriptionAccess.hasStoreAccess`

Quando `commercialContactEnabled` e falso:

- `handleInterest` retorna sem abrir modal.
- `handleConfirmLead` retorna sem criar lead.
- `handleGeneralWhatsapp` retorna sem abrir WhatsApp.
- A vitrine mostra `.store-inactive-notice`.

## CTAs bloqueados

- WhatsApp do topo em `PublicStoreHeader.jsx`.
- "Falar no WhatsApp" no hero em `VehicleSearchBox.jsx`.
- "Comprar no WhatsApp" no produto em destaque.
- Quickbar de WhatsApp.
- "Falar no WhatsApp" em cada `ProductCard.jsx`.
- "Me interessou" no modal de detalhe.
- "Continuar para o WhatsApp" no modal de lead/interesse.
- WhatsApp da secao de contato rapido.
- WhatsApp do footer.
- Botao flutuante de WhatsApp.

## CSS

`StoreFront.css` define:

- `.commercial-disabled`
- `.store-inactive-notice`

Os botoes recebem `disabled` e `aria-disabled` quando o contato comercial esta bloqueado.

## Regressao recomendada

- Loja com trial ativo: vitrine abre e CTAs funcionam.
- Loja com trial vencido ontem: vitrine abre, aviso aparece, CTAs nao abrem WhatsApp e lead nao e criado.
- Loja com `subscription_status = active`: vitrine e CTAs funcionam.
- Acesso publico nao deve exibir detalhes internos de assinatura.
