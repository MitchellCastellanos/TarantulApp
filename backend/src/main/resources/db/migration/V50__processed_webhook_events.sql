-- Idempotency log for incoming webhooks (Stripe, Google Play, etc.).
-- Provider event ids (for example Stripe evt_*) are stable across retries.
-- Unique primary key semantics keep webhook processing idempotent.
-- First insert processes event; duplicate insert is treated as already handled.
CREATE TABLE IF NOT EXISTS processed_webhook_events (
    event_id     VARCHAR(255) PRIMARY KEY,
    source       VARCHAR(64)  NOT NULL,
    event_type   VARCHAR(128),
    received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cheap index for trimming old events (cron job: delete where received_at < now() - 30 days).
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_received_at
    ON processed_webhook_events(received_at);
