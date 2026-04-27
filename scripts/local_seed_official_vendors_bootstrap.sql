-- Idempotent: inserts 8 storefront slugs expected by local_seed_marketplace_screenshots.sql
-- when app.official-vendors.seed-on-startup is false (default local).
begin;
insert into official_vendors (
  slug, name, country, state, city, website_url, national_shipping, ships_to_countries,
  influence_score, note, badge, enabled, partner_program_tier, listing_import_enabled
) values
('fear-not-tarantulas', 'Fear Not Tarantulas', 'United States', 'Virginia', 'Virginia Beach',
 'https://www.fearnottarantulas.com', true, 'United States,Mexico,Canada', 93,
 'Launch cohort founding partner · national shipping footprint across North America.',
 'Founding partner', true, 'STRATEGIC_FOUNDER', true),
('swifts-invertebrates', 'Swift''s Invertebrates', 'United States', 'Mississippi', 'Little Rock',
 'https://www.swiftinverts.com', true, 'United States', 88,
 'Certified breeder — deep catalog with consistent shipping standards.',
 'Verified partner', true, 'STRATEGIC_PARTNER', true),
('spider-shoppe', 'Spider Shoppe', 'United States', 'Washington', 'Tacoma',
 'https://spidershoppe.com', true, 'United States', 84,
 'Trusted Pacific Northwest storefront with proactive customer support.',
 'Verified partner', true, 'STRATEGIC_PARTNER', true),
('pinchers-pokies', 'Pinchers & Pokies Exotics', 'United States', 'South Carolina', 'Summerville',
 'https://www.pinchersandpokies.com', true, 'United States', 82,
 'Community-forward seller with specialization in arboreal species.',
 'Verified partner', true, 'STRATEGIC_PARTNER', true),
('primal-fear', 'Primal Fear Tarantulas', 'United States', 'California', 'Los Angeles',
 'https://primalfeartarantulas.com', true, 'United States', 78,
 'Southern California breeder with curated availability updates.',
 'Verified partner', true, 'STRATEGIC_PARTNER', true),
('tarantula-canada', 'Tarantula Canada', 'Canada', 'Quebec', 'Montreal',
 'https://www.tarantulacanada.ca', true, 'Canada', 90,
 'Founding partner serving Canada-wide shipping with bilingual support.',
 'Founding partner', true, 'STRATEGIC_FOUNDER', true),
('tarantulas-de-mexico', 'Tarantulas de México', 'Mexico', 'Jalisco', 'Zapopan',
 'http://www.tarantulasdemexico.com', true, 'Mexico', 91,
 'Founding cohort · legally operated breeding hub and education-first listings.',
 'Founding partner', true, 'STRATEGIC_FOUNDER', true),
('mexico-exotico', 'México Exótico (PIMVS)', 'Mexico', 'CDMX', 'Ciudad de México',
 'https://pimvsmexicoexotico.wixsite.com/pimvsmexicoexotico', true, 'Mexico', 79,
 'Certified partner focused on conservation-aligned traceability.',
 'Verified partner', true, 'STRATEGIC_PARTNER', true)
on conflict (slug) do nothing;
commit;
