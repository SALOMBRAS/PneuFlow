# Vercel Clean Deploy - PneuFlow

## Resumo

- Data: 23/06/2026.
- Repositório: `https://github.com/SALOMBRAS/PneuFlow.git`.
- Branch de produção esperada: `main`.
- Projeto Vercel oficial: `pneuflow`.
- URL oficial obtida: `https://pneuflow.vercel.app`.
- Status: preview e produção publicados com sucesso.

## Projeto antigo

- Nome local anterior em `.vercel/project.json`: `pneufacil`.
- Project ID anterior: `prj_T34bmAfAPloHPdiIS6d41usrFpTH`.
- URL antiga informada para limpeza futura: `https://pneuflow-afc5m76jb-pedrosalomao22099-4358s-projects.vercel.app`.
- O projeto antigo não foi excluído.
- Backup do vínculo local antigo: `backups/vercel-before-clean-deploy/`.
- Observação: ao vincular o projeto `pneuflow`, a Vercel CLI retornou o mesmo Project ID antigo. Isso indica que o projeto existente foi encontrado/renomeado no escopo atual, não um segundo projeto separado.

## Projeto novo/oficial

- Nome: `pneuflow`.
- Project ID: `prj_T34bmAfAPloHPdiIS6d41usrFpTH`.
- Org ID: `team_ucwyx7RdqLZ2yv95TPZLB4Ul`.
- Owner/scope: `pedrosalomao22099-4358s-projects`.
- Framework: Vite.
- Root Directory: `.`.
- Build Command detectado: `npm run build` ou `vite build`.
- Install Command detectado: `npm install` ou equivalente.
- Node.js Version: `24.x`.
- URL estável do projeto no scope: `https://pneuflow-pedrosalomao22099-4358s-projects.vercel.app`.
- URL oficial configurada por alias: `https://pneuflow.vercel.app`.

## Variáveis de ambiente

Variáveis encontradas no projeto Vercel, sem registrar valores:

- `VITE_SUPABASE_URL`: Preview, Production.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Preview, Production.

Não foram configuradas nesta etapa:

- service role;
- senha do banco;
- connection string;
- token da Supabase CLI;
- chave da AbacatePay ou outro gateway.

## Deployments

### Preview

- URL: `https://pneuflow-o4lpcz59p-pedrosalomao22099-4358s-projects.vercel.app`.
- Status: `READY`.
- Build remoto: passou.

### Production

- URL única do deployment: `https://pneuflow-nmojskq7v-pedrosalomao22099-4358s-projects.vercel.app`.
- Alias automático do projeto: `https://pneuflow-pedrosalomao22099-4358s-projects.vercel.app`.
- Alias oficial configurado: `https://pneuflow.vercel.app`.
- Status: `READY`.
- Build remoto: passou.

## Testes realizados

Foram validadas respostas HTTP 200 nas seguintes rotas da URL oficial:

- `/`
- `/login`
- `/register`
- `/assinatura`
- `/privacidade`
- `/dashboard`
- `/dashboard/catalog`
- `/dashboard/leads`
- `/dashboard/sellers`
- `/dashboard/settings`
- `/store/minha-loja`

Observação: os testes acima validam publicação, roteamento SPA e disponibilidade das telas. Fluxos reais de autenticação, e-mail e trial ainda dependem de ajuste/validação no Supabase Auth.

## Supabase Auth

Não foi alterada nenhuma configuração do Supabase nesta etapa.

Configuração recomendada em `Supabase Dashboard -> Authentication -> URL Configuration`:

- Site URL: `https://pneuflow.vercel.app`
- Redirect URLs de produção:
  - `https://pneuflow.vercel.app/**`
- Redirect URLs locais:
  - `http://localhost:5173/**`
  - `http://localhost:4173/**`

Para previews da Vercel, usar apenas wildcard restrita ao escopo correto, se necessário. Não remover imediatamente URLs antigas da allowlist antes de validar cadastro, login e recuperação de senha na URL nova.

## Busca por referências antigas

Foi feita busca no repositório, excluindo pastas ignoradas como `node_modules`, `dist`, `.git`, `.vercel` e `backups`, por:

- `pneufacil`
- `pneu-facil`
- `Pneu Fácil`
- `PneuFacil`
- `vercel.app`
- `vercel.com`
- `pneuflow-afc5m76jb`
- `pedrosalomao22099-4358s-projects`

Resultado: nenhuma referência ativa encontrada no código/documentação pesquisados antes da criação deste documento.

## Próximos testes obrigatórios

- Cadastro novo.
- Confirmação de e-mail.
- Login.
- Logout.
- Esqueci minha senha.
- Link de recuperação.
- Redefinição de senha.
- Auth callback.
- Atualização direta de rotas protegidas sem 404.
- Login dentro do período de teste.
- Redirecionamento para `/assinatura` quando aplicável.

## Exclusão do projeto antigo

Não excluir nada automaticamente.

Antes de excluir manualmente qualquer projeto antigo:

1. Ajustar Supabase Auth para incluir `https://pneuflow.vercel.app`.
2. Validar todos os fluxos de autenticação.
3. Confirmar que nenhum fluxo redireciona para a URL antiga.
4. Confirmar que a URL oficial `https://pneuflow.vercel.app` aponta sempre para o Production Deployment.
5. Só então remover manualmente projetos/deployments antigos pelo painel da Vercel, se ainda existirem.
