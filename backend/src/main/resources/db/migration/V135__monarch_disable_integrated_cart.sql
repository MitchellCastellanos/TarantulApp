-- Monarch Reptiles: disable the in-app integrated cart.
-- Each listing now links directly to its own product page on the partner website
-- (no add-to-cart, no cart bar). Behavior is config-driven via feed_config.cartEnabled
-- so any partner can be switched independently from the admin panel.

UPDATE official_vendors
SET feed_config = COALESCE(feed_config, '{}'::jsonb) || jsonb_build_object('cartEnabled', false),
    updated_at = NOW()
WHERE slug = 'monarch-reptiles';
