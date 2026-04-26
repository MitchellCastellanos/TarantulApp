-- Idempotency log for incoming webhooks (Stripe, Google Play, etc.).
-- The provider's event id (e.g. Stripe `evt_*`) is the natural primary key -- Stripe
-- guarantees stable ids even on retries, so a UNIQUE PK is enough to make webhook
-- handlers idempotent: insert wins -> process; insert fails -> already handled, ack 200.
CREATE TABLE IF NOT EXISTS processed_webhook_events (
    event_id     VARCHAR(255) PRIMARY KEY,
    source       VARCHAR(64)  NOT NULL,
    event_type   VARCHAR(128),
    received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cheap index for trimming old events (cron job: delete where received_at < now() - 30 days).
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_received_at
    ON processed_webhook_events(received_at);
