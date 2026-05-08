ALTER TABLE marketplace_orders
    ADD COLUMN IF NOT EXISTS terms_summary text,
    ADD COLUMN IF NOT EXISTS payment_reference varchar(160),
    ADD COLUMN IF NOT EXISTS payment_reported_at timestamptz,
    ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
    ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
    ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_payment_reported_at
    ON marketplace_orders (payment_reported_at DESC);
