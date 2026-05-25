-- Strategic partner / vendor ecosystem contract.
-- Community sellers and verified vendors remain user/listing driven.
-- Official/founding partners live in official_vendors and can opt into approved sync.

ALTER TABLE official_vendors
    ADD COLUMN IF NOT EXISTS feed_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN official_vendors.partner_program_tier IS
    'Partner ecosystem tier: OFFICIAL_PARTNER | FOUNDING_PARTNER. Legacy STRATEGIC_* values are still read by the app.';
COMMENT ON COLUMN official_vendors.listing_import_enabled IS
    'Approved sync gate. Vendor subscriptions do not grant automatic sync.';
COMMENT ON COLUMN official_vendors.feed_config IS
    'Per-partner sync/handoff config: allowedCategories, blockedCategories, categoryMapping, boostLevel, cartHandoffMode, partnerTier.';

UPDATE official_vendors
SET partner_program_tier = 'FOUNDING_PARTNER',
    badge = COALESCE(NULLIF(badge, ''), 'Founding partner'),
    feed_config = COALESCE(feed_config, '{}'::jsonb) || '{
      "partnerTier": "founding",
      "boostLevel": 2,
      "allowedCategories": ["tarantulas", "terrariums", "substrates", "live_food", "supplies", "breeding_projects"],
      "blockedCategorySlugs": ["jumping-spiders", "jumping-spider", "millipedes", "millipede", "scorpions", "scorpion", "ants", "ant", "other-invertebrates", "centipedes", "snails", "beetles"],
      "categoryMapping": {
        "tarantulas": "tarantulas",
        "new-world": "tarantulas",
        "old-world": "tarantulas",
        "old-world-tarantulas": "tarantulas",
        "tarantula-cribs": "terrariums",
        "terrariums": "terrariums",
        "terrariums-and-enclosures": "terrariums",
        "enclosures": "terrariums",
        "starter-terrarium-kits": "terrariums",
        "substrate": "substrates",
        "substrates": "substrates",
        "feeder-insects": "live_food",
        "feeder": "live_food",
        "feeders": "live_food",
        "supplies": "supplies",
        "decorations": "supplies",
        "feeding-and-watering": "supplies",
        "temperature-heating-and-humidity": "supplies"
      },
      "cartHandoffMode": "woocommerce",
      "notes": "Monarch remains the founding partner template; behavior is now config-driven."
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'monarch-reptiles';

UPDATE official_vendors
SET partner_program_tier = 'FOUNDING_PARTNER',
    updated_at = NOW()
WHERE partner_program_tier = 'STRATEGIC_FOUNDER';

UPDATE official_vendors
SET partner_program_tier = 'OFFICIAL_PARTNER',
    updated_at = NOW()
WHERE partner_program_tier = 'STRATEGIC_PARTNER';
