-- Seller attestation for wildlife trade compliance (listing-level; evolves with legal review).
ALTER TABLE marketplace_listings
    ADD COLUMN IF NOT EXISTS wild_caught boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS capture_origin_country_iso varchar(2),
    ADD COLUMN IF NOT EXISTS regulatory_permit_refs varchar(420),
    ADD COLUMN IF NOT EXISTS seller_trade_disclosure_accepted_at timestamptz;

COMMENT ON COLUMN marketplace_listings.capture_origin_country_iso IS 'ISO-3166-1 alpha-2 when wild_caught=true';
COMMENT ON COLUMN marketplace_listings.regulatory_permit_refs IS 'Free-text UMA / CITES / other permit refs supplied by seller';
COMMENT ON COLUMN marketplace_listings.seller_trade_disclosure_accepted_at IS 'When seller certified legal-trade compliance at publish time';
