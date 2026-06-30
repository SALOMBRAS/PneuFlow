# Auditoria Completa do PneuFlow

Data: 25/06/2026  
Escopo: auditoria de produto, UX, performance, SEO, acessibilidade, seguranca, Supabase, assinatura, observabilidade e prontidao para lancamento.  
Repositorio local auditado: `C:\Users\iepin\Downloads\Projeto Salo\Projeto 01\project-1`  
Branch local no momento da auditoria: `fix/signup-store-provisioning`  
Commit atual: `55f7b13 Merge remote-tracking branch 'origin/main' into fix/signup-store-provisioning`

> [!tldr]
> O PneuFlow ja tem base forte de produto: landing, vitrine publica, dashboard, vendedores, leads, trial e assinatura inicial. Ainda nao esta pronto para cobrar clientes em producao com seguranca: falta fechar gateway/webhook, endurecer regras no banco/RPCs, validar onboarding/cadastro em producao e corrigir pontos de exposicao publica no Supabase.

## 1. Escopo e limites desta auditoria

Esta auditoria foi feita em modo leitura e planejamento. A unica alteracao aplicada foi a criacao deste arquivo de relatorio.

Nao foram alterados:

- codigo-fonte da aplicacao;
- Supabase remoto;
- migrations;
- RLS/policies;
- Auth;
- Edge Functions;
- Vercel;
- AbacatePay;
- Git remoto;
- banco de dados;
- dados reais.

Fontes consultadas:

- `AGENTS.md`;
- Cofre de Contexto em repositório privado externo (`PneuFlow-Cofre`);
- arquivos de frontend em `src/`;
- migrations em `supabase/migrations/`;
- Edge Functions em `supabase/functions/`;
- API serverless em `api/`;
- `index.html`;
- `package.json`;
- medições Lighthouse em `https://pneuflow.vercel.app`.

Observacao operacional: o Lighthouse no Windows gerou erro `EPERM` ao limpar pasta temporaria do Chrome, mas os resultados JSON foram gerados e lidos.

## 2. Resumo executivo

O projeto esta em um ponto bom para evoluir para beta controlado, mas ainda tem riscos importantes antes de abrir cobranca real.

O que ja esta bem encaminhado:

- identidade visual e proposta do produto estao claras;
- landing ja comunica dor, demonstracao, prova social e trial;
- dashboard tem metricas, catalogo, leads, vendedores e configuracoes;
- vitrine publica tem fluxo de busca, produto, interesse e referral;
- existe base de trial de 7 dias no frontend e migration;
- cadastro/provisionamento de loja recebeu correcao recente;
- baseline de migrations foi organizada;
- build e deploy ja foram trabalhados anteriormente;
- Lighthouse desktop esta aceitavel.

O que ainda impede uma operacao comercial tranquila:

- cobranca ainda esta inconsistente: o produto fala em AbacatePay, mas o codigo atual usa Mercado Pago;
- nao ha webhook finalizado para ativar/cancelar assinatura com seguranca;
- parte do bloqueio de trial/assinatura ainda depende do frontend;
- RPCs publicas ainda podem aceitar operacoes que deveriam validar status comercial no banco;
- policies/grants publicos do Supabase estao largos demais para uma operacao em producao;
- convite de vendedor permite fluxo perigoso de senha inicial;
- cadastro/provisionamento precisa de teste ponta a ponta em producao;
- SEO ainda aponta canonical/OG para dominio antigo;
- acessibilidade dos modais/drawers da vitrine precisa melhorar.

## 3. Medicoes de performance

URL medida: `https://pneuflow.vercel.app`

| Perfil | Performance | Acessibilidade | Boas praticas | SEO | FCP | LCP | CLS | TBT | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Desktop Lighthouse | 85 | 98 | 100 | 100 | 0,8 s | 1,2 s | 0,015 | 210 ms | 2,4 s |
| Mobile Lighthouse | 63 | 98 | 100 | 100 | 2,2 s | 3,2 s | 0,014 | 1.810 ms | 3,1 s |

Leitura:

- O desktop esta bom.
- Mobile ainda tem gargalo forte de main thread, indicado pelo TBT de 1.810 ms.
- CLS esta bom, o que indica que os ajustes anteriores de hero/animacao ajudaram.
- A pontuacao SEO do Lighthouse esta boa, mas existem problemas manuais de canonical/OG e dominio.

Limitacao: foi feita uma medicao mobile e uma desktop. Para decisao final de performance, rodar 3 medicoes e usar a mediana.

## 4. Estado atual por area

| Area | Estado | Observacao |
|---|---|---|
| Landing page | Boa base, precisa polimento | Visual forte, mas copy comercial ainda tem conflito de plano/free/pro. |
| Conversao | Media | CTAs existem, mas a promessa comercial ainda mistura trial, free e PRO. |
| Cadastro/onboarding | Risco medio/alto | Houve correcao recente de provisionamento; precisa teste real ponta a ponta. |
| Dashboard | Funcional | Metricas e gestao existem, mas algumas formulas/copies confundem. |
| Catalogo | Funcional | Fluxo principal existe; depende de validar migration de estoque em producao. |
| Leads | Funcional com riscos | Lead/venda/estoque evoluiram, mas regras comerciais devem ir para RPC/backend. |
| Vendedores | Funcional com risco de seguranca | Convite/senha inicial precisam ser redesenhados. |
| Vitrine publica | Forte para MVP | Precisa melhorar acessibilidade, anti-abuso e regras de trial no banco. |
| Assinatura | Parcial | Tela e migration existem; gateway/webhook ainda nao estao prontos. |
| Supabase/RLS | Precisa hardening | Public grants e leitura publica ampla devem ser reduzidos. |
| SEO | Parcial | Tags existem, mas apontam para dominio antigo e ha mojibake em meta. |
| Performance | Boa no desktop, media no mobile | TBT mobile alto; chunks grandes e bibliotecas pesadas. |
| Observabilidade | Fraca | Falta monitoramento de erro, funil e eventos de negocio. |
| Legal/comercial | Parcial | Politica existe, mas termos, cancelamento e regras de trial precisam fechamento. |

## 5. P0 - Bloqueios antes de cobrar clientes reais

### P0.1 - Gateway e assinatura ainda nao estao prontos para cobranca real

Evidencias:

- `src/pages/Subscription.jsx` chama `/api/mercadopago/create-preference`;
- `api/mercadopago/create-preference.js` usa Mercado Pago;
- a estrategia comercial atual mencionada no projeto e nas pausas fala em AbacatePay;
- nao ha webhook final que atualize `subscription_status` com validacao do provedor;
- `src/utils/subscriptionAccess.js` libera status `active` sem exigir validacao forte de `current_period_end`.

Impacto:

- cliente pode pagar e nao ter ativacao correta;
- conta pode ficar ativa por status alterado indevidamente;
- cancelamento, atraso, estorno e vencimento nao ficam confiaveis;
- suporte manual vira gargalo.

Acao recomendada:

1. Decidir oficialmente entre AbacatePay e Mercado Pago.
2. Implementar checkout somente via backend/Edge Function.
3. Confirmar pagamento exclusivamente por webhook assinado.
4. Atualizar `subscription_status`, `current_period_end` e provider IDs apenas no backend.
5. Bloquear ativacao manual pelo frontend.

### P0.2 - Regras comerciais de trial precisam ser reforcadas no banco/RPC

Evidencias:

- `src/pages/StoreFront/StoreHome.jsx` bloqueia contato comercial no frontend;
- RPC `registrar_lead` continua executavel por `anon`;
- migration `20260624120000_stock_sale_quantity.sql` tambem concede execute para `anon` e `authenticated`;
- a validacao de assinatura/trial nao esta centralizada dentro da RPC de lead.

Impacto:

- esconder botao no frontend nao impede chamada direta na RPC;
- loja expirada ainda pode receber lead por chamada manual;
- metricas e dados comerciais podem ser poluidos.

Acao recomendada:

1. Validar `subscription_status`, `trial_ends_at` e `current_period_end` dentro de `registrar_lead`.
2. Retornar erro controlado para loja expirada.
3. Manter a vitrine publica visivel se essa for a decisao comercial, mas bloquear conversao no backend.

### P0.3 - Cadastro/provisionamento de loja precisa de teste real antes de lancamento

Evidencias:

- branch atual e `fix/signup-store-provisioning`;
- existe migration recente `20260623143000_signup_store_provisioning.sql`;
- houve historico de usuarios cadastrados sem loja/sem provisionamento correto.

Impacto:

- usuario novo pode pagar/entrar e nao ter loja criada;
- dashboard pode cair em estados vazios ou bloqueados indevidamente;
- suporte inicial fica manual.

Acao recomendada:

1. Criar conta nova em ambiente real.
2. Confirmar `profiles`, `stores` e `store_members`.
3. Confirmar login apos verificacao de e-mail.
4. Confirmar trial de 7 dias na loja criada.
5. Confirmar dashboard, catalogo, vendedores e vitrine publica.

### P0.4 - Convite de vendedor tem risco de seguranca com senha inicial

Evidencias:

- `supabase/functions/invite-seller/index.ts` usa service role;
- para e-mail existente, chama `admin.updateUserById(... password ...)`;
- grava `senha_inicial` em `store_members`;
- `src/services/storage.js` seleciona `senha_inicial`.

Impacto:

- dono de loja pode redefinir senha de usuario existente ao convidar e-mail;
- senha temporaria pode ficar exposta em tabela/cliente;
- risco grave se usuario ja for dono ou membro de outra loja.

Acao recomendada:

1. Remover senha definida pelo lojista.
2. Trocar para convite por e-mail/reset seguro.
3. Nunca armazenar senha inicial em texto claro.
4. Bloquear vinculo automatico de usuario ja existente sem aceite do proprio usuario.

## 6. P1 - Melhorias importantes antes de campanha publica

| Area | Problema | Impacto | Recomendacao |
|---|---|---|---|
| Supabase | `stores` tem policy publica ampla e `GRANT ALL` para `anon` | Exposicao de campos internos da loja | Criar view/RPC publica com colunas minimas e restringir tabela real. |
| Supabase | Grants amplos para `anon`: `TRUNCATE`, `TRIGGER`, `MAINTAIN`, `REFERENCES` aparecem na baseline | Superficie de risco desnecessaria | Revogar privilegios nao usados e manter minimo operacional. |
| Leads | `registrar_visita_referral` permite poluir metricas com parametros publicos | Metricas podem ser manipuladas | Validar par loja/vendedor/referral no banco e considerar rate limit. |
| Vendedores | Vendedor inativo pode continuar aparecendo em autorizacoes se RPC nao checar status em todos os pontos | Acesso indevido a leads | Garantir `status = 'active'` em todas as RPCs de vendedor. |
| Storage | Buckets/policies de storage nao estao versionados nas migrations | Risco de drift entre ambientes | Criar migration/documentacao de buckets e policies. |
| Dashboard | Conversao usa formulas diferentes em lugares distintos | Perda de confianca no painel | Separar "Conversao da vitrine" e "Taxa de venda". |
| Landing | Copy mistura Plano PRO, Plano Free e teste gratis | Fuga de conversao e duvida comercial | Padronizar uma narrativa: "teste gratis do PRO por 7 dias". |
| SEO | `index.html` tem canonical/OG em `https://pneuflow.com.br/` | Compartilhamento e indexacao desalinhados | Atualizar para dominio oficial atual ou configurar dominio definitivo. |
| SEO | Meta description/OG ainda contem mojibake em HTML | Aparencia ruim no Google/redes | Corrigir encoding das metas. |
| Acessibilidade | Modais/drawers da vitrine nao usam dialog completo | Dificulta teclado/leitor de tela | Criar modal/drawer acessivel reutilizavel. |
| Performance | Mobile TBT alto | Sensacao de lentidao em celulares | Reduzir JS inicial, adiar libs pesadas e auditar bundles. |
| Observabilidade | Falta Sentry/analytics/eventos | Bugs e funil invisiveis | Implementar monitoramento de erro e eventos de conversao. |

## 7. P2 - Acabamento e evolucao

| Area | Problema | Sugestao |
|---|---|---|
| Acessibilidade | Tabs da demo usam ARIA de tabs sem teclado por setas | Implementar padrao tabs completo ou remover roles de tabs. |
| Landing mobile | CTA do header some em telas pequenas | Manter CTA compacto "Criar gratis" no header mobile. |
| Dashboard | Tooltip do plano depende de hover | Transformar em botao acessivel com foco/blur/Esc. |
| Copy | Alguns textos recentes estao sem acento ou com encoding antigo | Revisao de microcopy visivel e aria-labels. |
| Manutencao | `package.json` ainda usa nome `temp-vite` | Renomear para `pneuflow`. |
| Manutencao | Existem arquivos vazios duplicados em `src/components/FeedbackCarousel/` | Remover pasta duplicada vazia em tarefa separada. |
| Rotas | Catch-all redireciona para landing | Criar pagina 404 simples. |
| Legal | Falta clareza publica sobre termos, cancelamento e trial | Criar Termos de Uso e pagina de cancelamento/suporte. |
| Produto | Onboarding pos-cadastro pode ser mais guiado | Checklist: cadastrar pneu, personalizar vitrine, copiar link, convidar vendedor. |

## 8. Auditoria da landing page

Pontos fortes:

- proposta principal e clara;
- visual escuro/laranja esta coerente;
- hero tem CTA direto;
- demo interativa ajuda a explicar o produto;
- prova social melhora confianca;
- trial de 7 dias reduz barreira de entrada.

Problemas encontrados:

1. A comunicacao comercial ainda nao esta totalmente consistente.
   - A landing mostra Plano PRO e R$39/mês.
   - Em outro trecho aparece Plano Free.
   - A estrategia atual parece ser teste gratis por 7 dias e depois plano pago.

2. SEO tecnico precisa alinhar dominio.
   - Canonical e OG apontam para `https://pneuflow.com.br/`.
   - Deploy atual usado para teste e `https://pneuflow.vercel.app`.

3. Mobile performance ainda sofre com JavaScript.
   - Lighthouse mobile: performance 63 e TBT 1.810 ms.

4. CTA persistente mobile pode melhorar.
   - Header mobile tende a perder o CTA principal.

Recomendacao:

- Antes de campanha, transformar toda a landing em uma narrativa unica:
  1. "Teste gratis por 7 dias";
  2. "Plano PRO por R$39/mês depois do teste";
  3. "Sem compromisso";
  4. "Dados continuam salvos";
  5. "Assinatura pelo gateway oficial".

## 9. Auditoria de onboarding

Fluxo ideal esperado:

1. Usuario cria conta.
2. Confirma e-mail.
3. Loja e perfil sao provisionados.
4. Trial de 7 dias inicia automaticamente.
5. Usuario cai no dashboard com checklist.
6. Cadastra primeiro pneu.
7. Copia link da vitrine.
8. Recebe primeiro lead.

Riscos atuais:

- provisionamento corrigido recentemente ainda precisa teste real;
- dashboard pode mostrar informacao tecnica demais antes do usuario ter feito o primeiro passo;
- nao ha checklist centralizado de ativacao;
- falhas de provisionamento precisam mensagem clara e recuperacao automatica.

Sugestao de checklist de ativacao:

- Personalizar nome e WhatsApp da loja;
- Cadastrar primeiro pneu;
- Ver minha vitrine;
- Copiar link da vitrine;
- Convidar vendedor;
- Testar botao "Tenho interesse".

## 10. Auditoria do dashboard

Pontos fortes:

- metricas principais existem;
- links de vitrine e vendedores existem;
- leads recentes e produtos procurados ajudam operacao;
- aviso de trial aparece no layout.

Problemas:

- formulas de conversao precisam padronizacao;
- tooltip do plano nao e totalmente acessivel;
- textos de metricas e detalhes ainda precisam polimento;
- trial e assinatura estao muito expostos no frontend sem reforco de backend;
- vendedor/senha inicial e o maior risco operacional.

Recomendacao:

- Criar definicoes oficiais:
  - Lead: clique/interesse registrado.
  - Conversao da vitrine: leads / visualizacoes.
  - Taxa de venda: vendas confirmadas / leads.
  - Faturamento: soma de vendas confirmadas.

## 11. Auditoria da vitrine publica

Pontos fortes:

- visual e fluxo fazem sentido para loja de pneus;
- busca/filtros e produto ajudam conversao;
- referral e vendedor estao contemplados;
- botao de interesse gera lead.

Problemas:

- modais/drawers precisam acessibilidade de dialog;
- `registrar_lead` deve validar assinatura/trial no banco;
- visita/referral pode ser poluida se chamada diretamente;
- catalogo publico pode ser raspado em massa se policy permanecer por `status = ativo` global.

Recomendacao:

- Manter vitrine publica como diferencial, mas proteger operacoes comerciais por RPCs com regras fortes.

## 12. Auditoria Supabase e banco

Achados principais:

1. Leitura publica ampla em `stores`.
   - Policy `Public can view stores USING (true)`.
   - `GRANT ALL` para `anon`.
   - A tabela contem campos internos como `owner_id`, telefone/endereco/plano e campos de assinatura.

2. Grants amplos demais.
   - Baseline mostra grants como `TRUNCATE`, `TRIGGER`, `MAINTAIN`, `REFERENCES` para `anon` em tabelas sensiveis.

3. RPCs publicas precisam regras comerciais.
   - `registrar_lead` e `registrar_visita_referral` sao publicas.
   - Devem validar loja, vendedor, status comercial e assinatura no banco.

4. Storage nao esta totalmente versionado.
   - App usa buckets `pneus-fotos` e `stores`.
   - Migrations nao deixam claro bucket/policies de `storage.objects`.

5. Migration de estoque precisa confirmacao operacional.
   - Existe `20260624120000_stock_sale_quantity.sql`.
   - Confirmar no Supabase remoto se ja foi aplicada antes de depender dela em producao.

Recomendacao de hardening:

- revisar grants;
- criar views/RPCs publicas de leitura minima;
- mover regras comerciais para RPCs;
- versionar storage;
- auditar todas as policies por persona: anon, dono, vendedor ativo, vendedor inativo.

## 13. Auditoria de assinatura e billing

Estado atual:

- Migration do trial adiciona campos como `subscription_status`, `trial_started_at`, `trial_ends_at`, `current_period_end` e provider IDs.
- Frontend calcula acesso em `src/utils/subscriptionAccess.js`.
- Tela `/assinatura` existe.
- API de checkout atual usa Mercado Pago.

Problemas:

- gateway oficial ainda nao esta decidido no codigo;
- historico do projeto indica AbacatePay como proximo gateway;
- nao ha webhook de confirmacao final;
- `active` libera acesso sem validacao robusta de periodo;
- botao de assinatura nao deve ser considerado fluxo completo.

Checklist antes de cobrar:

- escolher gateway definitivo;
- criar Edge Function/API backend para checkout;
- criar webhook validado;
- atualizar status somente via backend;
- verificar `current_period_end`;
- tratar `past_due`, `canceled`, `blocked`;
- registrar logs de billing;
- criar tela de sucesso/falha/retorno;
- testar cancelamento, atraso e pagamento duplicado.

## 14. Auditoria de performance

Achados:

- Mobile Lighthouse: performance 63, TBT 1.810 ms.
- Desktop Lighthouse: performance 85.
- Build conhecido tem chunks grandes, incluindo `heic2any` acima de 1 MB bruto e bundle principal significativo.
- O uso de GSAP, efeitos visuais, componentes animados e upload/conversao de imagem exige lazy loading cuidadoso.

Riscos:

- celulares medianos podem sentir travamento inicial;
- campanhas pagas para mobile podem perder conversao;
- funis com vitrine publica precisam ser leves.

Recomendacoes:

1. Rodar `npm run build` com analise visual de chunks.
2. Garantir que `heic2any` carregue apenas na tela de upload.
3. Manter CardSwap/TextType/MagicBento fora do mobile quando nao essenciais.
4. Reduzir JS da landing acima da dobra.
5. Auditar imagens de hero/prova social para `width`, `height`, `loading`, `decoding`.
6. Considerar preconnect/preload apenas para o que for realmente critico.

## 15. Auditoria de SEO

Pontos bons:

- `index.html` possui title, description, OG, Twitter Card e canonical.
- Lighthouse SEO marcou 100 na medicao.

Problemas manuais:

- canonical e OG URL apontam para `https://pneuflow.com.br/`;
- deploy atual auditado e `https://pneuflow.vercel.app`;
- ha mojibake em metas do `index.html`, por exemplo `catÃ¡logo`;
- falta validar sitemap/robots em ambiente final;
- catch-all redireciona para landing em vez de 404.

Recomendacao:

- Definir dominio oficial final.
- Atualizar canonical, OG e Twitter.
- Corrigir encoding.
- Criar `robots.txt` e `sitemap.xml` alinhados.
- Criar pagina 404.
- Adicionar schema.org simples para SoftwareApplication/LocalBusiness quando fizer sentido.

## 16. Auditoria de acessibilidade

Achados P1:

- modais/drawers da vitrine nao estao completos como `role="dialog"`;
- faltam `aria-modal`, foco inicial, trap de foco, retorno de foco e `Esc`;
- tooltip do plano no dashboard depende de hover;
- tabs da demo usam ARIA sem padrao completo de teclado.

Recomendacoes:

- criar componente modal/drawer acessivel reutilizavel;
- trocar tooltips clicaveis por botao real;
- ajustar tablist ou remover roles ARIA se nao for implementar teclado completo;
- rodar testes com teclado em mobile/desktop;
- validar contraste dos estados de erro/sucesso/desabilitado.

## 17. Auditoria de observabilidade

Estado atual:

- ha muitos `console.error` e `console.warn`;
- nao foi encontrado Sentry/PostHog/Plausible/analytics estruturado;
- nao ha funil instrumentado de cadastro, loja criada, primeiro pneu, primeiro lead, assinatura.

Impacto:

- falhas em producao podem depender de relato do cliente;
- campanhas ficam sem leitura de funil;
- erros de Supabase/Edge Function podem passar despercebidos.

Recomendacao:

- Sentry ou similar para erros frontend/backend;
- eventos de funil:
  - visitou landing;
  - clicou CTA;
  - iniciou cadastro;
  - confirmou e-mail;
  - loja criada;
  - primeiro pneu cadastrado;
  - primeiro link copiado;
  - primeiro lead recebido;
  - clicou assinatura;
  - pagamento aprovado/recusado;
- dashboard interno simples de saude.

## 18. Auditoria legal e comercial

Necessario antes de vender:

- Termos de Uso;
- Politica de Privacidade revisada;
- politica de cancelamento;
- regra clara do teste gratis;
- informacao de preco apos trial;
- canal de suporte;
- tratamento de dados de leads/clientes;
- aviso sobre WhatsApp e responsabilidade da loja;
- se houver pagamento, dados de empresa/responsavel fiscal.

Risco:

- cobrar sem termos claros pode gerar conflito com clientes e meios de pagamento.

## 19. Matriz de prioridades

| Prioridade | Item | Por que agora |
|---|---|---|
| P0 | Fechar gateway/webhook/status de assinatura | Sem isso nao da para cobrar com seguranca. |
| P0 | Mover validacao de trial/assinatura para RPCs | Frontend sozinho nao protege operacao. |
| P0 | Corrigir convite de vendedor/senha inicial | Risco de seguranca com usuario existente e senha em claro. |
| P0 | Validar cadastro/provisionamento ponta a ponta | Sem loja criada o produto quebra no primeiro uso. |
| P1 | Reduzir exposicao publica de `stores` e grants `anon` | Hardening basico antes de trafego real. |
| P1 | Corrigir SEO canonical/OG/encoding | Evita aparencia amadora em compartilhamento e busca. |
| P1 | Padronizar copy de trial/PRO/free | Aumenta conversao e reduz suporte. |
| P1 | Melhorar acessibilidade de modais da vitrine | Impacta funil do cliente final. |
| P1 | Observabilidade de erro/funil | Ajuda a operar beta sem cegueira. |
| P2 | CTA mobile sticky | Otimizacao de conversao. |
| P2 | 404, sitemap e robots | Acabamento SEO. |
| P2 | Remover duplicacoes/nomes temporarios | Manutencao. |

## 20. Roadmap recomendado

### Fase 1 - Estabilizacao antes de cobrar

1. Testar cadastro novo em producao.
2. Confirmar migration de estoque no Supabase remoto.
3. Corrigir convite de vendedor e remover senha inicial.
4. Mover validacao de trial/assinatura para RPCs.
5. Escolher gateway definitivo e remover conflito Mercado Pago/AbacatePay.
6. Implementar webhook de assinatura.
7. Revisar grants e leitura publica de `stores`.

### Fase 2 - Beta controlado

1. Ativar observabilidade.
2. Corrigir copy de trial/PRO/free.
3. Corrigir SEO/OG/canonical.
4. Criar termos/cancelamento/suporte.
5. Criar checklist de onboarding.
6. Testar 5 lojas reais com acompanhamento manual.

### Fase 3 - Campanha publica

1. Otimizar performance mobile.
2. Rodar 3 Lighthouse mobile e desktop e usar mediana.
3. Ajustar acessibilidade dos modais/drawers.
4. Criar pagina 404/sitemap/robots.
5. Criar dashboard de funil comercial.

## 21. Checklist de aceite para "pronto para vender"

- [ ] Conta nova cria loja, owner e trial corretamente.
- [ ] Usuario antigo sem loja e recuperado automaticamente ou recebe mensagem clara.
- [ ] Trial vence sem apagar dados.
- [ ] Loja expirada nao consegue gerar lead por RPC direta.
- [ ] Assinatura aprovada por webhook ativa acesso.
- [ ] Assinatura cancelada/vencida bloqueia painel.
- [ ] Vendedor inativo nao acessa leads.
- [ ] Senha inicial nao fica salva nem visivel.
- [ ] `stores` nao expoe campos administrativos para `anon`.
- [ ] Canonical/OG apontam para dominio oficial.
- [ ] Termos/Privacidade/Cancelamento publicados.
- [ ] Erros criticos vao para ferramenta de observabilidade.
- [ ] Mobile Lighthouse tem TBT controlado.

## 22. Conclusao

O PneuFlow tem produto suficiente para um beta serio, mas ainda nao deve entrar em cobranca automatizada sem fechar os P0. A ordem mais segura e: primeiro proteger cadastro, vendedor, RPCs e assinatura; depois ajustar copy/SEO/observabilidade; por fim otimizar mobile e acabamento.

Proximo passo recomendado: validar cadastro/provisionamento e aplicar o hardening de assinatura/RPC antes de integrar definitivamente o gateway de pagamento.
