-- Product categories for marketplace peer listings and partner catalog sync.
ALTER TABLE marketplace_listings
    ADD COLUMN IF NOT EXISTS listing_category VARCHAR(32) NOT NULL DEFAULT 'tarantulas';

ALTER TABLE partner_listings
    ADD COLUMN IF NOT EXISTS listing_category VARCHAR(32) NOT NULL DEFAULT 'tarantulas';

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category_status
    ON marketplace_listings (listing_category, status);

CREATE INDEX IF NOT EXISTS idx_partner_listings_category_status
    ON partner_listings (listing_category, status);
