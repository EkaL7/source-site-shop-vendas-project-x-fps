# Project X FPS

Projeto fullstack de estudo que simula uma loja virtual de servicos de otimizacao para jogos FPS mobile/PC.
Desenvolvido para praticar integracao de tecnologias modernas do ecossistema React.

---

## Stack

- **Frontend:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Pagamentos:** Stripe (cartao parcelado, Pix, Boleto)
- **Autenticacao:** Discord OAuth via Supabase Auth
- **Animacoes:** Framer Motion
- **Icones:** Lucide React
- **Roteamento:** React Router DOM v7

---

## Funcionalidades

- Vitrine de produtos com detalhes, categorias e precos em BRL
- Carrinho de compras persistido em localStorage
- Login social com Discord (OAuth2)
- Checkout integrado com Stripe Elements (cartao, Pix)
- Sistema de cupons de desconto com validacao server-side
- Dashboard do usuario (historico de pedidos)
- Edge Functions em Deno (Supabase) para:
  - Criacao de PaymentIntent com recalculo de preco no servidor
  - Webhook da Stripe para atualizacao de status do pedido
  - Validacao de cupons
  - Integracao com Discord (adicionar usuario ao servidor, verificar membership)
- Sistema de licenciamento para app desktop (auth via chave ou Discord OAuth)
- Paginas de FAQ e Politicas
- Layout responsivo com tema rosa/branco
- Contato via WhatsApp (link dinamico)

---

## Como rodar localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variaveis de ambiente

Copie `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

As variaveis necessarias sao:

| Variavel                      | Descricao                          |
| ----------------------------- | ---------------------------------- |
| `VITE_SUPABASE_URL`          | URL do seu projeto Supabase        |
| `VITE_SUPABASE_ANON_KEY`     | Chave anon (publica) do Supabase   |
| `VITE_STRIPE_PUBLISHABLE_KEY`| Chave publicavel da Stripe         |
| `VITE_WHATSAPP_NUMBER`       | Numero de WhatsApp para contato    |

> **Atencao:** chaves secretas (`sk_*`, `service_role`, `STRIPE_WEBHOOK_SECRET`, tokens de bot Discord) NUNCA vao no `.env` do frontend. Elas sao configuradas como secrets do Supabase Edge Functions.

### 3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173/`

---

## Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Instale o CLI: `scoop install supabase` (Windows) ou `brew install supabase/tap/supabase`
3. Faca login e vincule o projeto:
   ```bash
   supabase login
   supabase link --project-ref SEU_PROJECT_REF
   ```
4. Aplique as migrations:
   ```bash
   supabase db push
   ```
5. Configure os secrets do backend:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   supabase secrets set DISCORD_CLIENT_ID=xxx
   supabase secrets set DISCORD_CLIENT_SECRET=xxx
   supabase secrets set DISCORD_BOT_TOKEN=xxx
   supabase secrets set DISCORD_GUILD_ID=xxx
   ```
6. Faca deploy das Edge Functions:
   ```bash
   supabase functions deploy create-payment-intent
   supabase functions deploy stripe-webhook
   supabase functions deploy validate-coupon
   supabase functions deploy discord-add-to-guild
   supabase functions deploy discord-check-membership
   supabase functions deploy ahk-auth
   ```

---

## Configurar Stripe

1. Crie uma conta na [Stripe](https://stripe.com)
2. Copie a chave publicavel (`pk_test_...`) para `VITE_STRIPE_PUBLISHABLE_KEY` no `.env`
3. Configure um webhook apontando para `https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Eventos a escutar: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`
5. Copie o Signing Secret (`whsec_...`) e configure via `supabase secrets set`

---

## Configurar Discord OAuth

1. Crie um app em [Discord Developer Portal](https://discord.com/developers/applications)
2. Em OAuth2 > Redirects, adicione: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
3. Copie Client ID e Client Secret
4. Configure no Supabase Dashboard: Authentication > Providers > Discord

---

## Estrutura do projeto

```
src/
  App.tsx, main.tsx          -- Entrada + rotas
  components/                -- Layout, TopNav, Footer, LogoMark, etc.
  pages/                     -- Home, Products, Cart, Checkout, Dashboard, FAQ, etc.
  cart/CartContext.tsx        -- Carrinho (localStorage)
  contexts/AuthContext.tsx    -- Supabase Auth (Discord)
  data/products.ts           -- Catalogo de produtos
  lib/                       -- Clients (Supabase, Stripe, WhatsApp)
  types.ts                   -- Tipos compartilhados

supabase/
  config.toml                -- Config do projeto Supabase
  migrations/                -- SQL migrations (orders, coupons, licenses, etc.)
  functions/
    _shared/                 -- CORS, Discord helpers, coupon, fulfill-order
    create-payment-intent/   -- Cria PaymentIntent + insere order
    stripe-webhook/          -- Recebe eventos da Stripe
    validate-coupon/         -- Valida cupom de desconto
    discord-add-to-guild/    -- Adiciona usuario ao servidor Discord
    discord-check-membership/-- Verifica membership no Discord
    ahk-auth/                -- Auth para app desktop (chave + Discord OAuth)
```

---

## Fluxo de pagamento

1. Usuario faz login com Discord
2. Adiciona produtos ao carrinho e vai para `/checkout`
3. Frontend chama a Edge Function `create-payment-intent`
4. Backend valida produtos, recalcula total no servidor, cria PaymentIntent na Stripe
5. Frontend renderiza `<PaymentElement>` (cartao / Pix)
6. Apos pagamento, Stripe dispara webhook que atualiza o status do pedido
7. Usuario recebe confirmacao na pagina de sucesso

---

## Build para producao

```bash
npm run build
```

Gera a pasta `dist/` pronta para deploy em qualquer host estatico (Vercel, Netlify, Cloudflare Pages).

---

## Tecnologias estudadas

- React 19 com hooks e Context API
- TypeScript strict mode
- Vite como bundler
- Tailwind CSS v4 com tema customizado
- Supabase Auth (OAuth social), Database (PostgreSQL + RLS), Edge Functions (Deno)
- Stripe Elements e Payment Intents API
- Discord OAuth2 e Bot API
- Framer Motion para animacoes de pagina
- React Router DOM v7 (rotas aninhadas, lazy loading)

---

> **Nota:** Este repositorio e apenas para fins de estudo. Nenhuma credencial real esta incluida no codigo-fonte. Configure suas proprias chaves seguindo as instrucoes acima.
