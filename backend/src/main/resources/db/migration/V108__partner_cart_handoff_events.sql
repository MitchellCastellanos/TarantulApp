CREATE TABLE IF NOT EXISTS partner_cart_handoff_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    official_vendor_id UUID NOT NULL REFERENCES official_vendors(id) ON DELETE CASCADE,
    vendor_slug VARCHAR(120) NOT NULL,
    line_count INT NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    handoff_mode VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_handoff_vendor_created
    ON partner_cart_handoff_events (official_vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_handoff_created
    ON partner_cart_handoff_events (created_at DESC);
