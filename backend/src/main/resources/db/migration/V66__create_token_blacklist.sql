-- V66: revocation table for JWT access tokens (logout invalidates a still-valid JWT).
-- token_hash is hex-encoded SHA-256 of the raw bearer token (64 chars).
-- A daily @Scheduled job purges rows where expires_at < now().

CREATE TABLE IF NOT EXISTS public.token_blacklist (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash  char(64) NOT NULL UNIQUE,
    user_id     uuid REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at
    ON public.token_blacklist (expires_at);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id
    ON public.token_blacklist (user_id)
    WHERE user_id IS NOT NULL;
