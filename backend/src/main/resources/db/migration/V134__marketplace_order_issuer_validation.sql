-- Verified Origin issuer authorization overlay for marketplace orders.
-- When the seller is a Verified Origin issuer, the order is "blocked" until the issuer authorizes
-- it: that grants the buyer Pro days (once) and validates custody. Buyers attach proof of purchase
-- (in-store upload, or the emailed receipt for online buys); the issuer validates at delivery.
ALTER TABLE marketplace_orders
    ADD COLUMN IF NOT EXISTS requires_issuer_validation BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS issuer_validation_status VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS issuer_validated_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS receipt_kind VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS pro_grant_done BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing orders predate this feature: leave them unblocked (no issuer validation required).
