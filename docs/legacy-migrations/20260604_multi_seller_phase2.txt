Corrija a tela "Leads de WhatsApp" para mostrar qual vendedor gerou cada lead.

Contexto:
O link de vendedor já funciona.
A vitrine abriu com URL no formato:
/store/minha-loja?ref=teste-vendedor-1-9abd8e

O cliente clicou no WhatsApp e o lead apareceu no painel do dono da loja.
Porém, na tela Leads de WhatsApp aparece apenas:
- Cliente
- Produto
- Valor
- Data/Hora
- Ações

Preciso que também apareça o vendedor responsável pelo lead.

Regras:
- Não mexer na vitrine pública.
- Não mexer no cadastro de pneus.
- Não mexer nos links de vendedor.
- Não recriar tabelas.
- Não duplicar componentes.
- Manter mobile first e responsivo.
- Rodar npm run build no final.

Tarefas:

1. Abrir src/pages/Dashboard/Leads.jsx.
2. Abrir src/services/storage.js.
3. Verificar a função getLeads.
4. Garantir que os leads retornem também:
   - seller_id
   - ref_code
   - attribution_source

5. Buscar os vendedores da loja na tabela store_members:
   - user_id
   - nome
   - email
   - ref_code
   - role

6. Fazer o vínculo:
   - lead.seller_id === member.user_id
   ou, como fallback:
   - lead.ref_code === member.ref_code

7. Enriquecer cada lead com:
   - vendedor_nome
   - vendedor_email
   - vendedor_ref_code

8. Na tabela de Leads, adicionar uma nova coluna chamada:
   "Vendedor"

9. Exibir nessa coluna:
   - Nome do vendedor, se existir
   - E-mail do vendedor abaixo, em texto menor
   - Badge "Indicação" se attribution_source = referral
   - Badge "Anúncio" se attribution_source = product
   - "Sem vendedor" se não houver seller_id nem ref_code

10. A busca da tela também deve pesquisar por:
   - nome do cliente
   - produto
   - nome do vendedor
   - e-mail do vendedor
   - ref_code

11. Não quebrar a exclusão de leads.

12. Se o lead tiver ref_code mas não encontrar vendedor correspondente, mostrar:
   "Ref: CÓDIGO"
   e um aviso discreto:
   "vendedor não encontrado"

13. Rodar npm run build.

Ao final, informe:
- arquivo alterado
- causa do problema
- como ficou a exibição do vendedor
- se o build passou