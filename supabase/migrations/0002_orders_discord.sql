-- KittyFPS: campos Discord na tabela orders.
-- discord_user_id: snowflake do user no Discord (capturado no momento do login OAuth).
-- discord_thread_id: ID do thread privado criado no canal de tickets após pagamento aprovado.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discord_user_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discord_thread_id text;

CREATE INDEX IF NOT EXISTS idx_orders_discord_user ON public.orders(discord_user_id);
