-- Per-vendor catalog import configuration (WooCommerce, static JSON, etc.)

ALTER TABLE official_vendors
    ADD COLUMN IF NOT EXISTS feed_base_url VARCHAR(350),
    ADD COLUMN IF NOT EXISTS feed_type VARCHAR(40);

COMMENT ON COLUMN official_vendors.feed_base_url IS 'Store origin for partner sync/handoff, e.g. https://example.com';
COMMENT ON COLUMN official_vendors.feed_type IS 'Adapter key: woocommerce | static | mock';

UPDATE official_vendors
SET feed_base_url = COALESCE(feed_base_url, 'https://monarchreptiles.com'),
    feed_type = COALESCE(feed_type, 'woocommerce'),
    updated_at = NOW()
WHERE slug = 'monarch-reptiles';
