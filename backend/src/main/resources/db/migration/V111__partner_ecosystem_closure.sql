-- Idempotent partner ecosystem closure: legacy tiers + default cart handoff config.

UPDATE official_vendors
SET partner_program_tier = 'FOUNDING_PARTNER',
    updated_at = NOW()
WHERE partner_program_tier = 'STRATEGIC_FOUNDER';

UPDATE official_vendors
SET partner_program_tier = 'OFFICIAL_PARTNER',
    updated_at = NOW()
WHERE partner_program_tier = 'STRATEGIC_PARTNER';

UPDATE official_vendors
SET feed_config = COALESCE(feed_config, '{}'::jsonb) || '{"cartHandoffMode":"woocommerce"}'::jsonb,
    updated_at = NOW()
WHERE feed_config IS NULL
   OR NOT (feed_config ? 'cartHandoffMode');
