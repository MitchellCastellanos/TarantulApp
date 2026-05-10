-- Idempotent: inserts placeholder "Become an official partner" recruitment cards.
-- Used as the official vendor strip in local dev / screenshots so the marketplace
-- has content while every real partner slot is still open for application.
begin;
insert into official_vendors (
  slug, name, country, state, city, website_url, national_shipping, ships_to_countries,
  influence_score, note, badge, enabled, partner_program_tier, listing_import_enabled, is_demo
) values
('become-partner-us-breeder', 'Are you a U.S. breeder?', 'United States', null, null,
 'https://tarantulapp.com/marketplace#vendor-activation', true, 'United States', 95,
 'This featured spot is open. Apply to become an official partner and get listed in front of every U.S. keeper.',
 'Open spot', true, null, false, false),
('become-partner-mexico-breeder', '¿Eres breeder en México?', 'Mexico', null, null,
 'https://tarantulapp.com/marketplace#vendor-activation', true, 'Mexico', 94,
 'Este lugar destacado está disponible. Aplica para ser partner oficial y aparecer aquí.',
 'Lugar disponible', true, null, false, false),
('become-partner-canada-breeder', 'Breeder in Canada?', 'Canada', null, null,
 'https://tarantulapp.com/marketplace#vendor-activation', true, 'Canada', 93,
 'This featured slot is open for a vetted Canadian breeder or shop. Apply to claim it.',
 'Open spot', true, null, false, false),
('become-partner-exotic-shop', 'Run an exotic invert shop?', 'United States', null, null,
 'https://tarantulapp.com/marketplace#vendor-activation', true, 'United States,Mexico,Canada', 92,
 'Showcase your storefront here. Apply for the official partner program in minutes — our team reviews every request.',
 'Open spot', true, null, false, false),
('become-partner-international', 'Ship internationally?', 'International', null, null,
 'https://tarantulapp.com/marketplace#vendor-activation', true, 'United States,Mexico,Canada', 91,
 'Cross-border breeders welcome. Submit your operation to be reviewed for verified partner status.',
 'Open spot', true, null, false, false)
on conflict (slug) do nothing;
commit;
