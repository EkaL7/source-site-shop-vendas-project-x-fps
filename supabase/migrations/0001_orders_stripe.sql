-- KittyFPS: tabela orders com campos para Stripe.
-- Idempotente: pode rodar mesmo se a tabela orders já existir.

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text UNIQUE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    discord_name text,
    plataforma text,
    dispositivo text,
    whatsapp text,
    obs text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    total_brl numeric(10,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pendente',
    payment_status text NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrar tabela legada que usava total_usd
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='total_usd'
    ) THEN
        ALTER TABLE public.orders RENAME COLUMN total_usd TO total_brl;
    END IF;
END $$;

-- Garantir colunas novas em tabela pré-existente
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS obs text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Unique constraint em stripe_payment_intent_id (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_stripe_payment_intent_id_key'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi ON public.orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security: usuário só lê os próprios pedidos.
-- INSERT/UPDATE são feitos APENAS pelo backend (service_role bypassa RLS),
-- então não precisamos de policies de escrita — RLS já bloqueia o anon.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_orders" ON public.orders;
CREATE POLICY "users_read_own_orders" ON public.orders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
