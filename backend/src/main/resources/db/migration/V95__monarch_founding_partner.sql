-- Monarch Reptiles: founding strategic partner (Canada-wide catalog import).

ALTER TABLE partner_listings
    ADD COLUMN IF NOT EXISTS promoted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_partner_listings_vendor_category_status
    ON partner_listings (official_vendor_id, listing_category, status);

-- Replace recruitment Canada slot with Monarch; keep other open spots.
DELETE FROM official_vendors WHERE slug = 'become-partner-canada-breeder';

INSERT INTO official_vendors (
    slug, name, country, state, city, website_url, national_shipping, ships_to_countries,
    influence_score, note, badge, enabled, partner_program_tier, listing_import_enabled, is_demo
) VALUES (
    'monarch-reptiles',
    'Monarch Reptiles',
    'Canada',
    'Quebec',
    NULL,
    'https://monarchreptiles.com/',
    true,
    'Canada',
    100,
    'Founding partner · Captive-bred reptiles & invertebrates, feeders, terrariums & supplies — shipped Canada-wide. Featuring Tarantula Cribs enclosures.',
    'Founding partner',
    true,
    'STRATEGIC_FOUNDER',
    true,
    false
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    state = EXCLUDED.state,
    website_url = EXCLUDED.website_url,
    national_shipping = EXCLUDED.national_shipping,
    ships_to_countries = EXCLUDED.ships_to_countries,
    influence_score = EXCLUDED.influence_score,
    note = EXCLUDED.note,
    badge = EXCLUDED.badge,
    enabled = EXCLUDED.enabled,
    partner_program_tier = EXCLUDED.partner_program_tier,
    listing_import_enabled = EXCLUDED.listing_import_enabled,
    is_demo = EXCLUDED.is_demo,
    updated_at = NOW();
