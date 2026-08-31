-- KittyFPS: cupons de desconto.
-- Validação acontece SEMPRE no backend (Edge Functions) com service_role.
-- O anon não tem permissão de SELECT/UPDATE — assim cupons não vazam
-- pelo client e contagem de uso é confiável.

CREATE TABLE IF NOT EXISTS public.coupons (
    code text PRIMARY KEY,
    discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    max_uses integer,                     -- NULL = ilimitado
    current_uses integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    expires_at timestamptz,                -- NULL = sem expiração
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- Sem nenhuma policy: anon e authenticated NÃO conseguem ler/escrever.
-- Acesso só via service_role (Edge Functions).

-- Cupom de teste (100% off) - permite finalizar pedidos sem passar pela Stripe.
INSERT INTO public.coupons (code, discount_percent, active)
VALUES ('TESTE', 100, true)
ON CONFLICT (code) DO UPDATE SET discount_percent = 100, active = true;

-- Campos novos em orders pra registrar cupom usado.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_discount_brl numeric(10,2);
