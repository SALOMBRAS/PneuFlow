# PneuFlow

<p align="center">
  <img src="https://img.shields.io/badge/PneuFlow-Sistema%20para%20lojas%20de%20pneus-f59e0b?style=for-the-badge&labelColor=111827" alt="PneuFlow" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-111827?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/JavaScript-111827?style=for-the-badge&logo=javascript&logoColor=F7DF1E" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Vite-111827?style=for-the-badge&logo=vite&logoColor=646CFF" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-111827?style=for-the-badge&logo=supabase&logoColor=3FCF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vercel-111827?style=for-the-badge&logo=vercel&logoColor=FFFFFF" alt="Vercel" />
</p>

## Sobre o projeto

O **PneuFlow** é uma plataforma web para lojas de pneus criarem uma vitrine digital, gerenciarem catálogo, vendedores e leads de WhatsApp em um painel simples e responsivo.

O projeto foi desenvolvido com foco em uso prático e apresentação acadêmica. A ideia principal é permitir que uma loja de pneus tenha uma presença digital mais organizada, com catálogo online, página pública da loja e painel administrativo para acompanhar informações importantes do negócio.

## Problema que o PneuFlow resolve

Muitas lojas de pneus ainda atendem clientes enviando fotos soltas, listas manuais ou mensagens repetidas no WhatsApp. Isso dificulta a escolha do cliente e atrasa o atendimento.

O **PneuFlow** resolve esse problema oferecendo:

- Uma vitrine pública para o cliente consultar pneus.
- Um painel para o lojista cadastrar e organizar produtos.
- Um fluxo simples para gerar leads pelo WhatsApp.
- Gestão de vendedores e links de indicação.
- Métricas comerciais para acompanhar visitas, leads e vendas.

## Principais funcionalidades

- Landing page institucional do PneuFlow.
- Cadastro e login de lojistas usando Supabase Auth.
- Modal de aceite de Termos de Uso e Política de Privacidade.
- Página pública de Política de Privacidade.
- Dashboard com métricas comerciais.
- Cadastro, edição, listagem e exclusão de pneus.
- Upload de imagens dos pneus e da loja.
- Configurações da loja.
- Gestão de vendedores.
- Registro e acompanhamento de leads.
- Confirmação de venda em leads.
- Vitrine pública por slug da loja.
- Filtros por marca, medida, estoque e tipo de veículo.
- CTA para WhatsApp.
- Rastreamento de visitas por indicação de vendedor.

## Tecnologias utilizadas

- **React**: construção da interface.
- **Vite**: ambiente de desenvolvimento e build.
- **JavaScript**: linguagem principal do frontend.
- **React Router**: rotas da aplicação.
- **Supabase**: autenticação, banco de dados, storage e RPCs.
- **Supabase Auth**: login, cadastro e sessão.
- **Supabase Storage**: imagens de pneus e loja.
- **Supabase Edge Functions**: rotinas de gestão de vendedores.
- **Vercel**: deploy.
- **Lucide React**: ícones.
- **CSS customizado**: layout, responsividade e identidade visual.

## Como instalar

Clone o repositório:

```bash
git clone https://github.com/SALOMBRAS/PneuFlow.git
```

Entre na pasta:

```bash
cd PneuFlow
```

Instale as dependências:

```bash
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto usando o `.env.example` como referência:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Para Edge Functions ou rotinas de servidor, use variáveis separadas:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SERVICE_ROLE_KEY=
```

> Nunca envie `.env`, `.env.local` ou chaves secretas para o GitHub.

## Como executar localmente

Execute o ambiente de desenvolvimento:

```bash
npm run dev
```

Por padrão:

- Frontend: `http://localhost:5173`
- API local legada: `http://localhost:3001`

O fluxo principal atual do sistema usa Supabase. A API local com `database.json` permanece no projeto como legado/fallback de desenvolvimento.

## Como gerar build

```bash
npm run build
```

O build final será gerado na pasta:

```text
dist/
```

## Rotas principais

| Rota | Descrição |
|---|---|
| `/` | Landing page do PneuFlow |
| `/login` | Login do lojista |
| `/register` | Cadastro de lojista |
| `/privacidade` | Política de Privacidade |
| `/dashboard` | Dashboard principal da loja |
| `/dashboard/catalog` | Catálogo de pneus |
| `/dashboard/leads` | Leads de WhatsApp |
| `/dashboard/sellers` | Gestão de vendedores |
| `/dashboard/settings` | Configurações da loja |
| `/store/:slug` | Vitrine pública da loja |

## Como usar o sistema

### 1. Criar uma conta

Acesse `/register`, preencha os dados da loja e aceite os Termos de Uso e a Política de Privacidade.

### 2. Acessar o painel

Depois do cadastro/login, acesse o dashboard da loja em `/dashboard`.

### 3. Cadastrar pneus

Entre em **Catálogo de Pneus** e cadastre os produtos com:

- marca;
- modelo;
- medida;
- preço;
- estoque;
- descrição;
- tipo de veículo;
- imagens.

### 4. Configurar a loja

Em **Configurações**, ajuste informações como nome, WhatsApp, endereço, logo e dados da vitrine.

### 5. Gerenciar vendedores

Na área de **Vendedores**, o lojista pode criar vendedores, configurar WhatsApp e usar links de indicação.

### 6. Usar a vitrine pública

A vitrine pode ser acessada pela rota:

```text
/store/nome-da-loja
```

Nela o cliente consulta pneus, usa filtros e entra em contato pelo WhatsApp.

### 7. Acompanhar leads

Na área de **Leads de WhatsApp**, o lojista acompanha os contatos gerados pela vitrine e pode marcar vendas confirmadas.

## Estrutura básica de pastas

```text
src/
  components/          Componentes reutilizáveis
  contexts/            Contextos globais da aplicação
  data/                Dados estáticos usados pela interface
  lib/                 Configuração do cliente Supabase
  pages/               Páginas principais
    Auth/              Login, cadastro e recuperação de senha
    Dashboard/         Painel administrativo da loja
    StoreFront/        Vitrine pública da loja
  services/            Camada de acesso ao Supabase
  utils/               Utilitários do projeto

supabase/
  functions/           Edge Functions
  migrations/          Scripts SQL/migrações documentadas

api/                   API legada para fallback local/Vercel
public/                Arquivos públicos
docs/                  Documentação auxiliar
```

## Segurança e ambiente

- O frontend deve usar apenas a chave pública do Supabase.
- Chaves sensíveis devem ficar somente em ambiente seguro.
- `.env`, `.env.local`, `database.json`, `node_modules` e `dist` estão no `.gitignore`.
- As permissões reais de acesso aos dados dependem das policies RLS configuradas no Supabase.

## Status do projeto

Projeto funcional para demonstração, estudo e apresentação acadêmica.

Algumas melhorias futuras recomendadas:

- 
- 
- 
  

## Autor

Desenvolvido por **Pedro Salomão**.

GitHub: [SALOMBRAS](https://github.com/SALOMBRAS)
