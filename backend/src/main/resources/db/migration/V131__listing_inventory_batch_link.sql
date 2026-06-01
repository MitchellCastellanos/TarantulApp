-- Link a peer marketplace listing to a Studio inventory batch so a seller can,
-- at listing-creation time, attach the listing to a batch and generate QR labels
-- (passports) for the specimens they are putting up for sale.
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_batch_id
    ON marketplace_listings (batch_id);
