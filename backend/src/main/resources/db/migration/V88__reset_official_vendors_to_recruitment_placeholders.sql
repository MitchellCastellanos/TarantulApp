-- Wipe all real-named official partner cards (none of them actually signed with us)
-- and replace with recruitment placeholder cards that link back to the in-app
-- "Become an official partner" form (/marketplace#vendor-activation).
--
-- partner_listings and partner_listing_sync_runs FK official_vendors with
-- ON DELETE CASCADE, so dependent rows are removed automatically.

DELETE FROM official_vendors;

INSERT INTO official_vendors (
    slug, name, country, state, city, website_url, national_shipping, ships_to_countries,
    influence_score, note, badge, enabled, partner_program_tier, listing_import_enabled, is_demo
) VALUES
(
    'become-partner-us-breeder',
    'Are you a U.S. breeder?',
    'United States',
    NULL,
    NULL,
    'https://tarantulapp.com/marketplace#vendor-activation',
    true,
    'United States',
    95,
    'This featured spot is open. Apply to become an official partner and get listed in front of every U.S. keeper.',
    'Open spot',
    true,
    NULL,
    false,
    false
),
(
    'become-partner-mexico-breeder',
    '¿Eres breeder en México?',
    'Mexico',
    NULL,
    NULL,
    'https://tarantulapp.com/marketplace#vendor-activation',
    true,
    'Mexico',
    94,
    'Este lugar destacado está disponible. Aplica para ser partner oficial y aparecer aquí.',
    'Lugar disponible',
    true,
    NULL,
    false,
    false
),
(
    'become-partner-canada-breeder',
    'Breeder in Canada?',
    'Canada',
    NULL,
    NULL,
    'https://tarantulapp.com/marketplace#vendor-activation',
    true,
    'Canada',
    93,
    'This featured slot is open for a vetted Canadian breeder or shop. Apply to claim it.',
    'Open spot',
    true,
    NULL,
    false,
    false
),
(
    'become-partner-exotic-shop',
    'Run an exotic invert shop?',
    'United States',
    NULL,
    NULL,
    'https://tarantulapp.com/marketplace#vendor-activation',
    true,
    'United States,Mexico,Canada',
    92,
    'Showcase your storefront here. Apply for the official partner program in minutes — our team reviews every request.',
    'Open spot',
    true,
    NULL,
    false,
    false
),
(
    'become-partner-international',
    'Ship internationally?',
    'International',
    NULL,
    NULL,
    'https://tarantulapp.com/marketplace#vendor-activation',
    true,
    'United States,Mexico,Canada',
    91,
    'Cross-border breeders welcome. Submit your operation to be reviewed for verified partner status.',
    'Open spot',
    true,
    NULL,
    false,
    false
)
ON CONFLICT (slug) DO NOTHING;
