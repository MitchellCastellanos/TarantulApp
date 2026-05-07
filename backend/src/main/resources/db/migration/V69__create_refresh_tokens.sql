-- V69: rotating refresh tokens (single-use). The access JWT stays the canonical session token
-- for now (24h); the refresh token allows the frontend to mint a new access token without
-- re-authenticating, and gives us per-device session listing + logout-all.
--
-- token_hash is hex SHA-256 of the raw refresh token (the raw value is only ever in the response
-- body and the client's secure storage; the DB never sees it). On each refresh the previous row
-- is marked revoked_at and a fresh token is issued — leaks of one token rotate themselves out.

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash    char(64) NOT NULL UNIQUE,
    device_label  varchar(120),
    expires_at    timestamptz NOT NULL,
    last_used_at  timestamptz,
    revoked_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
    ON public.refresh_tokens (user_id, expires_at DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
    ON public.refresh_tokens (expires_at);
