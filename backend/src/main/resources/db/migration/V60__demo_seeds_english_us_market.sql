-- English-language demo seeds + US market flavor (parallel to ES/MX demo rows).
-- Idempotent inserts; widens shipping hints on existing demo vendors.

-- Existing demo vendors: make cross-border / US shipping explicit for testers.
UPDATE official_vendors SET ships_to_countries = 'Mexico,United States,Canada'
WHERE slug IN ('demo-nebula-arachnids', 'demo-silkforge-collective', 'demo-lunar-spoods');

UPDATE official_vendors SET ships_to_countries = 'Colombia,Mexico,United States'
WHERE slug = 'demo-arbor-demo-line';

UPDATE official_vendors SET ships_to_countries = 'Peru,Chile,United States,Mexico'
WHERE slug = 'demo-andean-arachno';

-- US-facing demo partner stores (English copy on cards).
INSERT INTO official_vendors (
    slug, name, country, state, city, website_url, national_shipping, ships_to_countries,
    influence_score, note, badge, enabled, partner_program_tier, listing_import_enabled, is_demo
)
VALUES
(
    'demo-gulf-coast-exotics',
    'Gulf Coast Exotics (DEMO)',
    'United States',
    'Texas',
    'Houston',
    'https://example.com/demo/gulf-coast-exotics',
    true,
    'United States,Mexico',
    73,
    'Demo showcase for US buyers — not a real storefront. Temporary beta content.',
    'Demo · US sample',
    true,
    'STRATEGIC_PARTNER',
    false,
    true
),
(
    'demo-pnw-arachnids',
    'PNW Arachnids (DEMO)',
    'United States',
    'Oregon',
    'Portland',
    'https://example.com/demo/pnw-arachnids',
    true,
    'United States,Canada',
    70,
    'Placeholder inventory for Pacific Northwest layout tests (beta only).',
    'Demo · US sample',
    true,
    'STRATEGIC_PARTNER',
    false,
    true
)
ON CONFLICT (slug) DO NOTHING;

-- Bilingual hint on keeper profile (demo system user).
UPDATE keeper_profiles SET bio =
    'Perfil de demostración — contenido temporal mientras la comunidad crece. Nada de aquí es una venta real.'
    || E'\n\n'
    || 'Demo keeper profile — sample content for Mexico/US beta testers. Nothing here is a real sale.'
WHERE user_id = (SELECT id FROM users WHERE email = 'beta-demo-feed@internal.tarantulapp.invalid' LIMIT 1)
  AND (
        bio NOT LIKE '%Mexico/US beta testers%'
        OR bio IS NULL
      );

-- Partner catalog: US demo vendors + English titles on Latin America demo shops (same UUID prefix scheme).
INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000108'::uuid,
    v.id,
    'demo-beta-us-108',
    '[DEMO EN] Mexican red knee — juvenile (sample)',
    'Fictitious listing for US/MX beta previews; illustrative price only.',
    'Brachypelma hamorii',
    'brachypelma hamorii',
    s.id,
    89.00,
    'USD',
    2,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg',
    'https://example.com/demo/products/demo-beta-us-108',
    'United States',
    'Texas',
    'Houston',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Brachypelma hamorii' LIMIT 1) s
WHERE v.slug = 'demo-gulf-coast-exotics'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000109'::uuid,
    v.id,
    'demo-beta-us-109',
    '[DEMO EN] Gooty sapphire — sling (placeholder)',
    'Beta-only mock row — do not treat as purchasable inventory.',
    'Poecilotheria metallica',
    'poecilotheria metallica',
    s.id,
    120.00,
    'USD',
    1,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    'https://example.com/demo/products/demo-beta-us-109',
    'United States',
    'Texas',
    'Houston',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Poecilotheria metallica' LIMIT 1) s
WHERE v.slug = 'demo-gulf-coast-exotics'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000110'::uuid,
    v.id,
    'demo-beta-us-110',
    '[DEMO EN] Green bottle blue — juvenile',
    'Temporary listing to exercise filters/cards for US testers.',
    'Chromatopelma cyaneopubescens',
    'chromatopelma cyaneopubescens',
    s.id,
    95.00,
    'USD',
    2,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    'https://example.com/demo/products/demo-beta-us-110',
    'United States',
    'Oregon',
    'Portland',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Chromatopelma cyaneopubescens' LIMIT 1) s
WHERE v.slug = 'demo-pnw-arachnids'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000111'::uuid,
    v.id,
    'demo-beta-us-111',
    '[DEMO EN] Arizona blonde — sling group',
    'Illustrative stock count — not a real offer.',
    'Aphonopelma chalcodes',
    'aphonopelma chalcodes',
    s.id,
    45.00,
    'USD',
    10,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Theraphosa_blondi.jpg/1024px-Theraphosa_blondi.jpg',
    'https://example.com/demo/products/demo-beta-us-111',
    'United States',
    'Oregon',
    'Portland',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Aphonopelma chalcodes' LIMIT 1) s
WHERE v.slug = 'demo-pnw-arachnids'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000112'::uuid,
    v.id,
    'demo-beta-en-112',
    '[DEMO EN] Chaco golden knee — subadult (mock)',
    'English catalog row on a Mexico-based demo partner — cross-border preview only.',
    'Grammostola pulchripes',
    'grammostola pulchripes',
    s.id,
    79.00,
    'USD',
    1,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    'https://example.com/demo/products/demo-beta-en-112',
    'Mexico',
    'CDMX',
    'Ciudad de México',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Grammostola pulchripes' LIMIT 1) s
WHERE v.slug = 'demo-nebula-arachnids'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000113'::uuid,
    v.id,
    'demo-beta-en-113',
    '[DEMO EN] Costa Rican zebra — juvenile',
    'Placeholder listing for EN UI review — not real inventory.',
    'Aphonopelma seemanni',
    'aphonopelma seemanni',
    s.id,
    65.00,
    'USD',
    3,
    'OUT_OF_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tliltocatl_vagans.jpg/1024px-Tliltocatl_vagans.jpg',
    'https://example.com/demo/products/demo-beta-en-113',
    'Mexico',
    'Jalisco',
    'Guadalajara',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Aphonopelma seemanni' LIMIT 1) s
WHERE v.slug = 'demo-silkforge-collective'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

-- Peer marketplace (USD + US cities, English copy).
INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000206'::uuid,
    u.id,
    '[DEMO · US] Arizona blonde sling — shipping example',
    'Fictitious peer listing for EN beta testers. No animal for sale.',
    'Aphonopelma chalcodes',
    'sling',
    'unsexed',
    85.00,
    'USD',
    'active',
    'Phoenix',
    'United States',
    'Arizona',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Theraphosa_blondi.jpg/1024px-Theraphosa_blondi.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000207'::uuid,
    u.id,
    '[DEMO EN] GBB juvenile — local pickup style copy',
    'Placeholder text for US marketplace layout — do not contact for purchase.',
    'Chromatopelma cyaneopubescens',
    'juvenile',
    'unsexed',
    175.00,
    'USD',
    'active',
    'Austin',
    'United States',
    'Texas',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000208'::uuid,
    u.id,
    '[DEMO · US] Enclosure bundle — photo placeholder',
    'Generic accessory mock-up for EN screenshots (not a real SKU).',
    'Supplies (demo)',
    NULL,
    NULL,
    129.00,
    'USD',
    'active',
    'Miami',
    'United States',
    'Florida',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000209'::uuid,
    u.id,
    '[DEMO EN] Brazilian salmon pink — subadult (mock)',
    'Temporary row for beta — replaces with real classifieds later.',
    'Lasiodora parahybana',
    'subadult',
    'female',
    220.00,
    'USD',
    'active',
    'Seattle',
    'United States',
    'Washington',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lasiodora_parahybana.jpg/1024px-Lasiodora_parahybana.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000210'::uuid,
    u.id,
    '[DEMO · US/MX] Cross-border copy test — sling',
    'Shows dual-market wording for LATAM + US beta (not a listing).',
    'Brachypelma hamorii',
    'sling',
    'unsexed',
    95.00,
    'USD',
    'active',
    'San Diego',
    'United States',
    'California',
    'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

-- Community feed (English), same demo author, flagged as demo content.
INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000011'::uuid,
    u.id,
    '🪴 First molt in the new enclosure — everything went smoothly. (DEMO beta sample post.)',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg',
    'image',
    true,
    now() - interval '40 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000012'::uuid,
    u.id,
    'Testing feeding reminders with the sleepiest T in the house 😅 #demo',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    'image',
    true,
    now() - interval '33 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000013'::uuid,
    u.id,
    'Anyone else labeling enclosures with QR codes? Polishing the beta flow. (DEMO)',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    'image',
    true,
    now() - interval '28 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000014'::uuid,
    u.id,
    '📦 Packing dry run: tightening photo + weight workflow for shipments. (DEMO — placeholder)',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tliltocatl_vagans.jpg/1024px-Tliltocatl_vagans.jpg',
    'image',
    true,
    now() - interval '48 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000015'::uuid,
    u.id,
    'Beta tip: log molts even if the note is short — patterns show up faster. #demo',
    'public',
    NULL,
    NULL,
    true,
    now() - interval '35 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000016'::uuid,
    u.id,
    'Stable humidity beats giant spikes. Demo post for the community feed.',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Poecilotheria_regalis.jpg/1024px-Poecilotheria_regalis.jpg',
    'image',
    true,
    now() - interval '22 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000017'::uuid,
    u.id,
    'Marketplace rows here are fake until real partners sync — [DEMO] for US + MX beta.',
    'public',
    NULL,
    NULL,
    true,
    now() - interval '16 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000018'::uuid,
    u.id,
    'Soft lighting for photos = less stress for the spood — sample post for testers (temporary).',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lasiodora_parahybana.jpg/1024px-Lasiodora_parahybana.jpg',
    'image',
    true,
    now() - interval '11 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000019'::uuid,
    u.id,
    'Mini roadmap: QR labels, public feed, marketplace. Thanks for beta testing 🙌 [DEMO EN]',
    'public',
    NULL,
    NULL,
    true,
    now() - interval '7 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000020'::uuid,
    u.id,
    'Heads up: anything tagged DEMO / temporary is filler — not for real purchases or serious DMs.',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Theraphosa_blondi.jpg/1024px-Theraphosa_blondi.jpg',
    'image',
    true,
    now() - interval '2 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

-- Extra demo spiders with English names (optional collection density).
INSERT INTO tarantulas (id, user_id, species_id, name, short_id, stage, sex, profile_photo, is_public)
SELECT
    'c1000000-0000-4000-8000-000000000006'::uuid,
    u.id,
    (SELECT id FROM species WHERE scientific_name = 'Aphonopelma chalcodes' LIMIT 1),
    'Demo · Desert',
    'TAUXSEED6',
    'sling',
    'unsexed',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Theraphosa_blondi.jpg/1024px-Theraphosa_blondi.jpg',
    true
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (short_id) DO NOTHING;

INSERT INTO tarantulas (id, user_id, species_id, name, short_id, stage, sex, profile_photo, is_public)
SELECT
    'c1000000-0000-4000-8000-000000000007'::uuid,
    u.id,
    (SELECT id FROM species WHERE scientific_name = 'Poecilotheria metallica' LIMIT 1),
    'Demo · Sapphire',
    'TAUXSEED7',
    'juvenile',
    'unsexed',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    false
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (short_id) DO NOTHING;
