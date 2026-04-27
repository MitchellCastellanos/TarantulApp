-- Rich marketplace seed for screenshots and demos (Postgres).
-- Safe to re-run: removes rows tagged screenshot-demo-* / SCREENSHOT_PEER_V1.
-- Images: Unsplash tarantula photos (CDN); local dev / screenshots only.
--
-- Prerequisites: run scripts/local_seed_social_marketplace.sql first so seed users +
-- dev@ password hash exist; Flyway migrations applied; official_vendors rows for the
-- storefront slugs below (run scripts/local_seed_official_vendors_bootstrap.sql if the
-- app is not started with OFFICIAL_VENDORS_SEED_ON_STARTUP=true).
--
-- Usage (local):
--   psql "$DATABASE_URL" -f scripts/local_seed_marketplace_screenshots.sql

begin;

-- ?? Presentable official vendors: founding vs certified tiers + import enabled ??
UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_FOUNDER',
  badge = 'Founding partner',
  note = 'Launch cohort ù flagship North America partner storefront.',
  listing_import_enabled = true,
  influence_score = 96,
  website_url = 'https://www.fearnottarantulas.com'
WHERE slug = 'fear-not-tarantulas';

UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_FOUNDER',
  badge = 'Founding partner',
  note = 'Founding bilingual partner ù nationwide coverage across Canada.',
  listing_import_enabled = true,
  influence_score = 94,
  website_url = 'https://www.tarantulacanada.ca'
WHERE slug = 'tarantula-canada';

UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_FOUNDER',
  badge = 'Founding partner',
  note = 'Founding Mexico partner ù legally operated propagation and education-first listings.',
  listing_import_enabled = true,
  influence_score = 95,
  website_url = 'http://www.tarantulasdemexico.com'
WHERE slug = 'tarantulas-de-mexico';

UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_PARTNER',
  badge = 'Verified partner',
  note = 'Certified storefront ù established importer line with proven shipping QA.',
  listing_import_enabled = true,
  influence_score = 89,
  website_url = 'https://www.swiftinverts.com'
WHERE slug = 'swifts-invertebrates';

UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_PARTNER',
  badge = 'Verified partner',
  note = 'Wide species catalog ù responsive online sales support.',
  listing_import_enabled = true,
  influence_score = 85,
  website_url = 'https://spidershoppe.com'
WHERE slug = 'spider-shoppe';

UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_PARTNER',
  badge = 'Verified partner',
  note = 'Trusted specialty seller ù arboreal and fossorial specialties.',
  listing_import_enabled = true,
  influence_score = 83,
  website_url = 'https://www.pinchersandpokies.com'
WHERE slug = 'pinchers-pokies';

UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_PARTNER',
  badge = 'Verified partner',
  note = 'West Coast curated availability with weekly storefront updates.',
  listing_import_enabled = true,
  influence_score = 80,
  website_url = 'https://primalfeartarantulas.com'
WHERE slug = 'primal-fear';

UPDATE official_vendors SET
  partner_program_tier = 'STRATEGIC_PARTNER',
  badge = 'Verified partner',
  note = 'Certified Mexico partner ù conservation-aligned traceability.',
  listing_import_enabled = true,
  influence_score = 82,
  website_url = 'https://pimvsmexicoexotico.wixsite.com/pimvsmexicoexotico'
WHERE slug = 'mexico-exotico';

-- ?? Replace prior demo partner inventory ??
delete from partner_listings where external_id like 'screenshot-demo-%';

-- Partner demo rows: mix of MX / US / CA geography for filter screenshots.
with tarantula_img(idx, url) as (
  values
    (1, 'https://images.unsplash.com/photo-1564398042875-dddb3c722039?w=1200&q=80&auto=format&fit=crop'),
    (2, 'https://images.unsplash.com/photo-1752810228770-d866aee13158?w=1200&q=80&auto=format&fit=crop'),
    (3, 'https://images.unsplash.com/photo-1771223050567-8659c6e2a762?w=1200&q=80&auto=format&fit=crop'),
    (4, 'https://images.unsplash.com/photo-1579222741606-ecaab2d4bb16?w=1200&q=80&auto=format&fit=crop'),
    (5, 'https://images.unsplash.com/photo-1597215675000-0420736f4ccc?w=1200&q=80&auto=format&fit=crop'),
    (6, 'https://images.unsplash.com/photo-1567939973912-f499537375bd?w=1200&q=80&auto=format&fit=crop'),
    (7, 'https://images.unsplash.com/photo-1763493323940-0c3323d8beea?w=1200&q=80&auto=format&fit=crop'),
    (8, 'https://images.unsplash.com/photo-1598356918644-7a5af992f40c?w=1200&q=80&auto=format&fit=crop'),
    (9, 'https://images.unsplash.com/photo-1596535403955-8216afaacc99?w=1200&q=80&auto=format&fit=crop'),
    (10, 'https://images.unsplash.com/photo-1635495672951-314b0d4e6d28?w=1200&q=80&auto=format&fit=crop'),
    (11, 'https://images.unsplash.com/photo-1580681157234-58dbf3fe9370?w=1200&q=80&auto=format&fit=crop'),
    (12, 'https://images.unsplash.com/photo-1705931037230-928f91e63a5f?w=1200&q=80&auto=format&fit=crop'),
    (13, 'https://images.unsplash.com/photo-1527101760592-3a603b32b08a?w=1200&q=80&auto=format&fit=crop'),
    (14, 'https://images.unsplash.com/photo-1747738305505-66f6e3781265?w=1200&q=80&auto=format&fit=crop'),
    (15, 'https://images.unsplash.com/photo-1609531084358-f09af256ffcb?w=1200&q=80&auto=format&fit=crop'),
    (16, 'https://images.unsplash.com/photo-1635171379225-e820401ad961?w=1200&q=80&auto=format&fit=crop'),
    (17, 'https://images.unsplash.com/photo-1583870549158-10e557c83f11?w=1200&q=80&auto=format&fit=crop'),
    (18, 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=80&auto=format&fit=crop')
),
vendors as (
  select slug, id from official_vendors
  where slug in (
    'fear-not-tarantulas', 'tarantula-canada', 'tarantulas-de-mexico',
    'swifts-invertebrates', 'spider-shoppe', 'pinchers-pokies', 'primal-fear', 'mexico-exotico'
  )
),
items(slug, ext, title, description, species, price_amount, currency, country, state, city, img_seed) as (
  values
  -- Fear Not (US)
  ('fear-not-tarantulas', 'fn-01', 'Grammostola pulchripes ù juvenile', 'Captive-bred juvenile; steady feeding schedule and clean molt history.', 'Grammostola pulchripes', 129.00, 'USD', 'United States', 'Virginia', 'Virginia Beach', 'fn01'),
  ('fear-not-tarantulas', 'fn-02', 'Brachypelma hamorii ù subadult', 'Classic beginner-friendly lineage; insulated shipping available.', 'Brachypelma hamorii', 149.00, 'USD', 'United States', 'Virginia', 'Virginia Beach', 'fn02'),
  ('fear-not-tarantulas', 'fn-03', 'Caribena versicolor ù sling bundle', 'Colorful arboreal starters; group pricing for 3+.', 'Caribena versicolor', 54.00, 'USD', 'United States', 'Virginia', 'Virginia Beach', 'fn03'),
  ('fear-not-tarantulas', 'fn-04', 'Aphonopelma chalcodes ù adult female', 'Long-lived desert species; calm disposition for display.', 'Aphonopelma chalcodes', 219.00, 'USD', 'United States', 'Texas', 'Dallas', 'fn04'),
  ('fear-not-tarantulas', 'fn-05', 'Pamphobeteus antinous ù juvenile', 'Bold feeder; recommended for intermediate keepers.', 'Pamphobeteus antinous', 189.00, 'USD', 'United States', 'California', 'Los Angeles', 'fn05'),
  -- Tarantula Canada
  ('tarantula-canada', 'tc-01', 'Brachypelma auratum ù juvenile', 'ùlevage CB ù documentation de mue incluse.', 'Brachypelma auratum', 165.00, 'CAD', 'Canada', 'Quebec', 'Montreal', 'tc01'),
  ('tarantula-canada', 'tc-02', 'Grammostola rosea ù adult', 'Hardy Chilean rose ù ideal for calm display enclosures.', 'Grammostola rosea', 95.00, 'CAD', 'Canada', 'Ontario', 'Toronto', 'tc02'),
  ('tarantula-canada', 'tc-03', 'Cyriocosmus elegans ù juvenile', 'Small footprint terrestrial with big personality.', 'Cyriocosmus elegans', 72.00, 'CAD', 'Canada', 'British Columbia', 'Vancouver', 'tc03'),
  ('tarantula-canada', 'tc-04', 'Monocentopus balfouri ù communal bundle', 'Communal setup provenance notes included.', 'Monocentopus balfouri', 420.00, 'CAD', 'Canada', 'Quebec', 'Montreal', 'tc04'),
  ('tarantula-canada', 'tc-05', 'Lampropelma nigerrimum ù juvenile', 'Deep substrate species ù moisture routine guide included.', 'Selenocosmia sp.', 210.00, 'CAD', 'Canada', 'Alberta', 'Calgary', 'tc05'),
  -- Mùxico founding
  ('tarantulas-de-mexico', 'tm-01', 'Brachypelma hamorii ù juvenil', 'Proyecto legal CDMX ù cartilla de cuidado en espaùol.', 'Brachypelma hamorii', 1850.00, 'MXN', 'Mexico', 'Jalisco', 'Guadalajara', 'tm01'),
  ('tarantulas-de-mexico', 'tm-02', 'Aphonopelma seemanni ù juvenil', 'Terrestre robusta ù ideal para terrario mediano.', 'Aphonopelma seemanni', 990.00, 'MXN', 'Mexico', 'Jalisco', 'Zapopan', 'tm02'),
  ('tarantulas-de-mexico', 'tm-03', 'Grammostola pulchripes ù sling', 'Lote sling saludable ù fotos semanales.', 'Grammostola pulchripes', 450.00, 'MXN', 'Mexico', 'Nuevo Leon', 'Monterrey', 'tm03'),
  ('tarantulas-de-mexico', 'tm-04', 'Tliltocatl vagans ù subadulto', 'Comportamiento predecible ù refugio incluido en embalaje.', 'Tliltocatl vagans', 1100.00, 'MXN', 'Mexico', 'CDMX', 'Ciudad de Mexico', 'tm04'),
  ('tarantulas-de-mexico', 'tm-05', 'Davus pentaloris ù juvenil', 'Compacta y voraz ù perfecta para rack de crecimiento.', 'Davus pentaloris', 680.00, 'MXN', 'Mexico', 'Puebla', 'Puebla', 'tm05'),
  -- Swift's (US certified)
  ('swifts-invertebrates', 'si-01', 'Pterinochilus murinus ù subadult', 'Orange bitey thing ù temperament disclosure included.', 'Pterinochilus murinus', 135.00, 'USD', 'United States', 'Mississippi', 'Little Rock', 'si01'),
  ('swifts-invertebrates', 'si-02', 'Harpactira pulchripes ù juvenile', 'Burrow-loving species ù deep substrate recipe card.', 'Harpactira pulchripes', 118.00, 'USD', 'United States', 'Tennessee', 'Nashville', 'si02'),
  ('swifts-invertebrates', 'si-03', 'Idiothele mira ù sling batch', 'Rare availability ù limited weekly drops.', 'Idiothele mira', 95.00, 'USD', 'United States', 'Mississippi', 'Little Rock', 'si03'),
  ('swifts-invertebrates', 'si-04', 'Ceratogyrus darlingi ù juvenile', 'Traditional horned baboon ù bold feeding response.', 'Ceratogyrus darlingi', 88.00, 'USD', 'United States', 'Florida', 'Miami', 'si04'),
  -- Spider Shoppe (US)
  ('spider-shoppe', 'ss-01', 'Poecilotheria metallica ù juvenile', 'Signature arboreal ù humidity tracking sheet included.', 'Poecilotheria metallica', 289.00, 'USD', 'United States', 'Washington', 'Tacoma', 'ss01'),
  ('spider-shoppe', 'ss-02', 'Avicularia avicularia ù juvenile', 'Classic pink toe starter for tall enclosures.', 'Avicularia avicularia', 49.00, 'USD', 'United States', 'Washington', 'Seattle', 'ss02'),
  ('spider-shoppe', 'ss-03', 'Chromatopelma cyaneopubescens ù sling', 'Green bottle blue ù bright colors at feeding size.', 'Chromatopelma cyaneopubescens', 79.00, 'USD', 'United States', 'Oregon', 'Portland', 'ss03'),
  ('spider-shoppe', 'ss-04', 'Lasiodora parahybana ù juvenile', 'Gentle giant terrestrial ù appetite showcase.', 'Lasiodora parahybana', 65.00, 'USD', 'United States', 'California', 'Sacramento', 'ss04'),
  -- Pinchers (US)
  ('pinchers-pokies', 'pp-01', 'Theraphosa blondi ù sling', 'Heavy-bodied species ù long-term commitment bundle.', 'Theraphosa blondi', 125.00, 'USD', 'United States', 'South Carolina', 'Summerville', 'pp01'),
  ('pinchers-pokies', 'pp-02', 'Phormictopus cancerides ù juvenile', 'Hispaniolan giant ù confident feeder.', 'Phormictopus cancerides', 72.00, 'USD', 'United States', 'Georgia', 'Atlanta', 'pp02'),
  ('pinchers-pokies', 'pp-03', 'Holothele incei ù communal trio', 'Micro communal setup notes included.', 'Holothele incei', 42.00, 'USD', 'United States', 'South Carolina', 'Summerville', 'pp03'),
  -- Primal Fear (US)
  ('primal-fear', 'pf-01', 'Ephebopus cyanognathus ù juvenile', 'Electric blue chelicerae ù intermediate humidity.', 'Ephebopus cyanognathus', 165.00, 'USD', 'United States', 'California', 'Los Angeles', 'pf01'),
  ('primal-fear', 'pf-02', 'Xenesthis immanis ù juvenile', 'Bold terrestrial with seasonal feeding rhythm.', 'Xenesthis immanis', 195.00, 'USD', 'United States', 'Arizona', 'Phoenix', 'pf02'),
  ('primal-fear', 'pf-03', 'Grammostola iheringi ù juvenile', 'Brazilian giant chocolate ù burrow-ready packing.', 'Grammostola iheringi', 142.00, 'USD', 'United States', 'California', 'San Diego', 'pf03'),
  -- Mùxico Exùtico (certified MX)
  ('mexico-exotico', 'me-01', 'Brachypelma auratum ù juvenil', 'Proyecto educativo ù guùa de legalidad regional.', 'Brachypelma auratum', 1750.00, 'MXN', 'Mexico', 'CDMX', 'Ciudad de Mexico', 'me01'),
  ('mexico-exotico', 'me-02', 'Tliltocatl albopilosus ù sling', 'Peluche clùsico ù temperamento manso.', 'Tliltocatl albopilosus', 520.00, 'MXN', 'Mexico', 'CDMX', 'Ciudad de Mexico', 'me02'),
  ('mexico-exotico', 'me-03', 'Nhandu chromatus ù juvenil', 'Patrones llamativos ù fotos macro semanales.', 'Nhandu chromatus', 890.00, 'MXN', 'Mexico', 'Estado de Mexico', 'Toluca', 'me03'),
  ('mexico-exotico', 'me-04', 'Acanthoscurria geniculata ù juvenil', 'Comedora agresiva ù ideal para exhibiciùn.', 'Acanthoscurria geniculata', 760.00, 'MXN', 'Mexico', 'Queretaro', 'Queretaro', 'me04')
),
items_rn as (
  select *, row_number() over (order by slug, ext) as rn from items
)
insert into partner_listings (
  id, official_vendor_id, external_id, title, description, species_name_raw, species_normalized,
  price_amount, currency, stock_quantity, availability, image_url, product_canonical_url,
  country, state, city, last_synced_at, status, created_at, updated_at
)
select
  gen_random_uuid(),
  v.id,
  'screenshot-demo-' || i.ext,
  i.title,
  i.description,
  i.species,
  i.species,
  i.price_amount,
  i.currency,
  3,
  'in_stock',
  ti.url,
  'https://www.tarantulapp.com/partner-demo?sku=' || i.ext,
  i.country,
  i.state,
  i.city,
  now() - ((random() * 48) || ' hours')::interval,
  'active',
  now(),
  now()
from items_rn i
join vendors v on v.slug = i.slug
join tarantula_img ti on ti.idx = ((i.rn - 1) % 18) + 1;

-- ?? Peer listings (keepers) tagged for cleanup ??
delete from marketplace_listings where pedigree_ref = 'SCREENSHOT_PEER_V1';

insert into marketplace_listings (
  id, seller_user_id, title, description, species_name, stage, sex,
  price_amount, currency, status, city, state, country, image_url, pedigree_ref, created_at, updated_at
)
select gen_random_uuid(), u.id, pr.title, pr.description, pr.species_name, pr.stage, pr.sex,
  pr.price_amount, pr.currency, 'active', pr.city, pr.state, pr.country,
  ti.url,
  'SCREENSHOT_PEER_V1', now() - (random() * 120 || ' hours')::interval, now()
from (
  select r.*, row_number() over (order by r.email, r.title) as rn
  from (
  values
  -- Mùxico (MXN ù espaùol)
  ('seed.alex@tarantulapp.local', 'Grammostola pulchripes ù juvenil CB', 'Alimentaciùn estable ù historial de mudas.', 'Grammostola pulchripes', 'juvenile', 'unsexed', 2450.00, 'MXN', 'Mexico City', 'CDMX', 'Mexico', 'mx1'),
  ('seed.sofia@tarantulapp.local', 'Caribena versicolor ù juveniles', 'Arbùrea activa ù lista para terrario alto.', 'Caribena versicolor', 'juvenile', 'unsexed', 2280.00, 'MXN', 'Guadalajara', 'Jalisco', 'Mexico', 'mx2'),
  ('seed.mateo@tarantulapp.local', 'Pterinochilus murinus ù subadulto hembra', 'Directa en comedero ù paquete con hoja de hùbito.', 'Pterinochilus murinus', 'subadult', 'female', 1650.00, 'MXN', 'Monterrey', 'Nuevo Leon', 'Mexico', 'mx3'),
  ('seed.alex@tarantulapp.local', 'Brachypelma hamorii ù par juvenil', 'Proyecto educativo ù lùnea familiar documentada.', 'Brachypelma hamorii', 'juvenile', 'unsexed', 3100.00, 'MXN', 'Puebla', 'Puebla', 'Mexico', 'mx4'),
  ('seed.sofia@tarantulapp.local', 'Typhochlaena seladonia ù sling', 'Arbùrea rara ù humedad guiada.', 'Typhochlaena seladonia', 'sling', 'unsexed', 4200.00, 'MXN', 'Merida', 'Yucatan', 'Mexico', 'mx5'),
  ('seed.mateo@tarantulapp.local', 'Davus fasciatus ù juvenil', 'Terrestre compacta ù comedora confiable.', 'Davus fasciatus', 'juvenile', 'unsexed', 980.00, 'MXN', 'Queretaro', 'Queretaro', 'Mexico', 'mx6'),
  ('seed.alex@tarantulapp.local', 'Grammostola actaeon ù juvenil', 'Terrestre pesada ù ideal para fan de mudas.', 'Grammostola actaeon', 'juvenile', 'unsexed', 2650.00, 'MXN', 'Mexico City', 'CDMX', 'Mexico', 'mx7'),
  ('seed.sofia@tarantulapp.local', 'Psalmopoeus cambridgei ù juvenil', 'Arbùrea veloz ù terrario vertical recomendado.', 'Psalmopoeus cambridgei', 'juvenile', 'unsexed', 1380.00, 'MXN', 'Guadalajara', 'Jalisco', 'Mexico', 'mx8'),
  ('seed.mateo@tarantulapp.local', 'Pterinochilus chordatus ù juvenil', 'Veloz y voraz ù keeper intermedio.', 'Pterinochilus chordatus', 'juvenile', 'unsexed', 1520.00, 'MXN', 'Monterrey', 'Nuevo Leon', 'Mexico', 'mx9'),
  ('seed.alex@tarantulapp.local', 'Aphonopelma seemanni ù juvenil', 'Terrestre clùsica ù muy tolerante.', 'Aphonopelma seemanni', 'juvenile', 'unsexed', 890.00, 'MXN', 'Toluca', 'Estado de Mexico', 'Mexico', 'mx10'),
  ('seed.sofia@tarantulapp.local', 'Tapinauchenius violaceus ù sling', 'Arbùrea mini ù micro terrario.', 'Tapinauchenius violaceus', 'sling', 'unsexed', 620.00, 'MXN', 'Cancun', 'Quintana Roo', 'Mexico', 'mx11'),
  ('seed.mateo@tarantulapp.local', 'Lasiodora klugi ù juvenil', 'Terrestre grande ù apetito fuerte.', 'Lasiodora klugi', 'juvenile', 'unsexed', 1750.00, 'MXN', 'Leon', 'Guanajuato', 'Mexico', 'mx12'),
  -- United States (USD ù English)
  ('seed.nolan@tarantulapp.local', 'Poecilotheria regalis ù juvenile', 'Bold arboreal appetite ù QR care sheet.', 'Poecilotheria regalis', 'juvenile', 'unsexed', 165.00, 'USD', 'Austin', 'Texas', 'United States', 'us1'),
  ('seed.nolan@tarantulapp.local', 'Cyclosternum fasciatum ù juvenile', 'Costa Rican tiger rump ù burrow starter kit.', 'Cyclosternum fasciatum', 'juvenile', 'unsexed', 55.00, 'USD', 'Dallas', 'Texas', 'United States', 'us2'),
  ('seed.nolan@tarantulapp.local', 'Phidippus regius ù spiderling group', 'Jumping spider starter bundle (display only).', 'Phidippus regius', 'sling', 'unsexed', 48.00, 'USD', 'Houston', 'Texas', 'United States', 'us3'),
  ('seed.nolan@tarantulapp.local', 'Tliltocatl vagans ù juvenile', 'Classic starter terrestrials ù calm feeder.', 'Tliltocatl vagans', 'juvenile', 'unsexed', 42.00, 'USD', 'Phoenix', 'Arizona', 'United States', 'us4'),
  ('seed.nolan@tarantulapp.local', 'Neoholothele incei ù communal pair', 'Micro communal ù shallow substrate recipe.', 'Neoholothele incei', 'juvenile', 'unsexed', 38.00, 'USD', 'Denver', 'Colorado', 'United States', 'us5'),
  ('seed.nolan@tarantulapp.local', 'Grammostola porteri ù adult female', 'Long-lived pet rock ù proven breeder lineage.', 'Grammostola porteri', 'adult', 'female', 120.00, 'USD', 'Chicago', 'Illinois', 'United States', 'us6'),
  ('seed.nolan@tarantulapp.local', 'Hapalopus sp. Colombia ù juvenile', 'Pumpkin patch ù bold appetite.', 'Hapalopus sp. Colombia', 'juvenile', 'unsexed', 85.00, 'USD', 'Miami', 'Florida', 'United States', 'us7'),
  ('seed.nolan@tarantulapp.local', 'Brachypelma boehmei ù juvenile', 'Fiery knee classic ù substrate mix included.', 'Brachypelma boehmei', 'juvenile', 'unsexed', 135.00, 'USD', 'San Antonio', 'Texas', 'United States', 'us8'),
  ('seed.nolan@tarantulapp.local', 'Pamphobeteus ultramarinus ù sling', 'NW giant appetite ù intermediate keeper.', 'Pamphobeteus ultramarinus', 'sling', 'unsexed', 95.00, 'USD', 'Los Angeles', 'California', 'United States', 'us9'),
  ('seed.nolan@tarantulapp.local', 'Theraphosa apophysis ù sling', 'Goliath lineage ù growth tracking sheet.', 'Theraphosa apophysis', 'sling', 'unsexed', 110.00, 'USD', 'Seattle', 'Washington', 'United States', 'us10'),
  ('seed.nolan@tarantulapp.local', 'Cyriocosmus elegans ù juvenile', 'Trinidad dwarf tiger ù fossorial starter.', 'Cyriocosmus elegans', 'juvenile', 'unsexed', 72.00, 'USD', 'Boston', 'Massachusetts', 'United States', 'us11'),
  ('seed.nolan@tarantulapp.local', 'Hysterocrates gigas ù juvenile', 'Cameroon baboon ù heavy-bodied feeder.', 'Hysterocrates gigas', 'juvenile', 'unsexed', 125.00, 'USD', 'Atlanta', 'Georgia', 'United States', 'us12'),
  -- Canada (CAD ù EN/FR friendly copy)
  ('seed.valeria@tarantulapp.local', 'Brachypelma smithi ù juvenile', 'Calm temperament ù bilingual packing slip.', 'Brachypelma smithi', 'juvenile', 'unsexed', 155.00, 'CAD', 'Montreal', 'Quebec', 'Canada', 'ca1'),
  ('seed.valeria@tarantulapp.local', 'Grammostola pulchra ù sling', 'Ultimate black beauty ù patience bundle.', 'Grammostola pulchra', 'sling', 'unsexed', 210.00, 'CAD', 'Toronto', 'Ontario', 'Canada', 'ca2'),
  ('seed.valeria@tarantulapp.local', 'Pterinochilus lugardi ù juvenile', 'Dark starburst baboon ù fossorial kit.', 'Pterinochilus lugardi', 'juvenile', 'unsexed', 98.00, 'CAD', 'Calgary', 'Alberta', 'Canada', 'ca3'),
  ('seed.valeria@tarantulapp.local', 'Augacephalus ezendami ù juvenile', 'Blue-legged baboon ù seasonal feeding notes.', 'Augacephalus ezendami', 'juvenile', 'unsexed', 132.00, 'CAD', 'Vancouver', 'British Columbia', 'Canada', 'ca4'),
  ('seed.valeria@tarantulapp.local', 'Monocentopus balfouri ù juvenile', 'Socotra island specialist ù communal article link.', 'Monocentopus balfouri', 'juvenile', 'unsexed', 185.00, 'CAD', 'Ottawa', 'Ontario', 'Canada', 'ca5'),
  ('seed.valeria@tarantulapp.local', 'Orphnaecus philippinus ù sling', 'Purple bloom dwarf ù arboreal sling protocol.', 'Orphnaecus philippinus', 'sling', 'unsexed', 68.00, 'CAD', 'Halifax', 'Nova Scotia', 'Canada', 'ca6'),
  ('seed.valeria@tarantulapp.local', 'Tapinauchenius plumipes ù juvenile', 'Purple tree spider ù cork bark bundle.', 'Tapinauchenius plumipes', 'juvenile', 'unsexed', 78.00, 'CAD', 'Edmonton', 'Alberta', 'Canada', 'ca7'),
  ('seed.valeria@tarantulapp.local', 'Phormingochilus everetti ù sling', 'Rare arboreal appetite ù humidity checklist.', 'Phormingochilus everetti', 'sling', 'unsexed', 145.00, 'CAD', 'Winnipeg', 'Manitoba', 'Canada', 'ca8'),
  ('seed.valeria@tarantulapp.local', 'Pelinobius muticus ù sling', 'King baboon lineage ù deep substrate pledge.', 'Pelinobius muticus', 'sling', 'unsexed', 125.00, 'CAD', 'Quebec City', 'Quebec', 'Canada', 'ca9'),
  ('seed.valeria@tarantulapp.local', 'Chilobrachys sp. Electric Blue ù sling', 'Electric blue markings ù humidity discipline.', 'Chilobrachys sp.', 'sling', 'unsexed', 115.00, 'CAD', 'Victoria', 'British Columbia', 'Canada', 'ca10'),
  ('seed.valeria@tarantulapp.local', 'Selenocosmia stirlingi ù juvenile', 'Australian whistling ù fossorial temperament.', 'Selenocosmia stirlingi', 'juvenile', 'unsexed', 92.00, 'CAD', 'Regina', 'Saskatchewan', 'Canada', 'ca11'),
  ('seed.valeria@tarantulapp.local', 'Poecilotheria ornata ù juvenile', 'Fringed ornamental ù vertical enclosure kit.', 'Poecilotheria ornata', 'juvenile', 'unsexed', 175.00, 'CAD', 'Montreal', 'Quebec', 'Canada', 'ca12')
  ) as r(email, title, description, species_name, stage, sex, price_amount, currency, city, state, country, img)
) pr
join users u on u.email = pr.email
join (
  values
    (1, 'https://images.unsplash.com/photo-1564398042875-dddb3c722039?w=1200&q=80&auto=format&fit=crop'),
    (2, 'https://images.unsplash.com/photo-1752810228770-d866aee13158?w=1200&q=80&auto=format&fit=crop'),
    (3, 'https://images.unsplash.com/photo-1771223050567-8659c6e2a762?w=1200&q=80&auto=format&fit=crop'),
    (4, 'https://images.unsplash.com/photo-1579222741606-ecaab2d4bb16?w=1200&q=80&auto=format&fit=crop'),
    (5, 'https://images.unsplash.com/photo-1597215675000-0420736f4ccc?w=1200&q=80&auto=format&fit=crop'),
    (6, 'https://images.unsplash.com/photo-1567939973912-f499537375bd?w=1200&q=80&auto=format&fit=crop'),
    (7, 'https://images.unsplash.com/photo-1763493323940-0c3323d8beea?w=1200&q=80&auto=format&fit=crop'),
    (8, 'https://images.unsplash.com/photo-1598356918644-7a5af992f40c?w=1200&q=80&auto=format&fit=crop'),
    (9, 'https://images.unsplash.com/photo-1596535403955-8216afaacc99?w=1200&q=80&auto=format&fit=crop'),
    (10, 'https://images.unsplash.com/photo-1635495672951-314b0d4e6d28?w=1200&q=80&auto=format&fit=crop'),
    (11, 'https://images.unsplash.com/photo-1580681157234-58dbf3fe9370?w=1200&q=80&auto=format&fit=crop'),
    (12, 'https://images.unsplash.com/photo-1705931037230-928f91e63a5f?w=1200&q=80&auto=format&fit=crop'),
    (13, 'https://images.unsplash.com/photo-1527101760592-3a603b32b08a?w=1200&q=80&auto=format&fit=crop'),
    (14, 'https://images.unsplash.com/photo-1747738305505-66f6e3781265?w=1200&q=80&auto=format&fit=crop'),
    (15, 'https://images.unsplash.com/photo-1609531084358-f09af256ffcb?w=1200&q=80&auto=format&fit=crop'),
    (16, 'https://images.unsplash.com/photo-1635171379225-e820401ad961?w=1200&q=80&auto=format&fit=crop'),
    (17, 'https://images.unsplash.com/photo-1583870549158-10e557c83f11?w=1200&q=80&auto=format&fit=crop'),
    (18, 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=80&auto=format&fit=crop')
) as ti(idx, url) on ti.idx = ((pr.rn - 1) % 18) + 1;

commit;
