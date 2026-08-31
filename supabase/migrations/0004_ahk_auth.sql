-- ════════════════════════════════════════════════════════════════
--  AHK Desktop Auth: licenses, sessions, Discord OAuth sessions
-- ════════════════════════════════════════════════════════════════

-- License keys for the AHK desktop app
CREATE TABLE IF NOT EXISTS public.licenses (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    key           text        UNIQUE NOT NULL,
    label         text,
    discord_user_id   text,
    discord_username  text,
    hwid          text,
    type          text        NOT NULL DEFAULT 'temporary'
                              CHECK (type IN ('temporary','permanent','trial')),
    expires_at    timestamptz,
    is_active     boolean     NOT NULL DEFAULT true,
    max_hwid_resets   integer NOT NULL DEFAULT 1,
    hwid_resets_used  integer NOT NULL DEFAULT 0,
    activated_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Persistent session tokens emitted after a successful key/discord validation.
-- AHK stores the token locally and re-validates on every launch.
CREATE TABLE IF NOT EXISTS public.ahk_sessions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    token           text        UNIQUE NOT NULL,
    license_id      uuid        REFERENCES public.licenses(id) ON DELETE CASCADE,
    hwid            text        NOT NULL,
    is_valid        boolean     NOT NULL DEFAULT true,
    last_validated_at timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Short-lived records used by the polling-based Discord OAuth flow for desktop.
CREATE TABLE IF NOT EXISTS public.ahk_discord_sessions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nonce           text        UNIQUE NOT NULL,
    hwid            text        NOT NULL,
    status          text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','authenticated','expired')),
    discord_id      text,
    discord_username text,
    discord_avatar  text,
    license_id      uuid        REFERENCES public.licenses(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL DEFAULT now() + interval '5 minutes'
);

CREATE INDEX IF NOT EXISTS idx_licenses_key   ON public.licenses(key);
CREATE INDEX IF NOT EXISTS idx_licenses_hwid  ON public.licenses(hwid);
CREATE INDEX IF NOT EXISTS idx_ahk_sessions_token ON public.ahk_sessions(token);
CREATE INDEX IF NOT EXISTS idx_ahk_discord_nonce  ON public.ahk_discord_sessions(nonce);

ALTER TABLE public.licenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahk_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahk_discord_sessions ENABLE ROW LEVEL SECURITY;
