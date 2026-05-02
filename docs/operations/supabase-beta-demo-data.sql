-- =============================================================================
-- Beta DEMO seed data — idempotent SQL for Supabase SQL Editor (or psql)
-- =============================================================================
-- Purpose:
--   Applies the same data changes as Flyway V58 + V59 + V60 when you want parity without
--   waiting for a deploy, or to repair a partially failed migration.
--
-- Safe usage:
--   - Requires species rows from normal migrations (e.g. Brachypelma hamorii, …).
--   - partner_listings.availability/status MUST use IN_STOCK / ACTIVE etc.
--     (see migration V52 — matches JPA EnumType.STRING).
--   - marketplace_listings.status stays lowercase: active, sold, …
--   - activity_posts.visibility: only 'private' | 'public' (V44); seeds use 'public'.
--
-- NOT included (do not paste blindly):
--   - Full schema CREATE TABLE (use Flyway from the app).
--   - flyway_schema_history rows — let Flyway manage versions on Railway.
--
-- After running: redeploy so Flyway skips already-applied versions, or repair history.
-- =============================================================================



-- Beta tester agreement + labeled DEMO content for marketplace / community previews.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS beta_agreement_accepted_at TIMESTAMPTZ NULL;

ALTER TABLE official_vendors
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE activity_posts
    ADD COLUMN IF NOT EXISTS is_demo_content BOOLEAN NOT NULL DEFAULT FALSE;

-- System user for seeded public posts (login not intended; bcrypt = "password" dev hash).
INSERT INTO users (id, email, password_hash, display_name, plan, public_handle, community_profile_visibility, search_visible, founder_keeper, is_beta_tester, referral_milestone_mask, qr_print_exports)
VALUES (
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'beta-demo-feed@internal.tarantulapp.invalid',
    '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
    'Criador demo (seed)',
    'FREE',
    'demo_feed_beta',
    'preview_only',
    true,
    false,
    false,
    0,
    0
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO official_vendors (
    slug, name, country, state, city, website_url, national_shipping, ships_to_countries,
    influence_score, note, badge, enabled, partner_program_tier, listing_import_enabled, is_demo
)
VALUES
(
    'demo-nebula-arachnids',
    'Nebula Arachnids (DEMO)',
    'Mexico',
    'CDMX',
    'Ciudad de México',
    'https://example.com/demo/nebula-arachnids',
    true,
    'Mexico,United States',
    74,
    'Datos de demostración para la beta — no es una tienda real.',
    'Demo · no comprar',
    true,
    'STRATEGIC_PARTNER',
    false,
    true
),
(
    'demo-silkforge-collective',
    'Silkforge Collective (DEMO)',
    'Mexico',
    'Jalisco',
    'Guadalajara',
    'https://example.com/demo/silkforge-collective',
    true,
    'Mexico',
    71,
    'Ejemplo de socio certificado con badges — contenido ficticio.',
    'Demo · ficticio',
    true,
    'STRATEGIC_PARTNER',
    false,
    true
),
(
    'demo-arbor-demo-line',
    'Arbor Demo Line (DEMO)',
    'Colombia',
    'Antioquia',
    'Medellín',
    'https://example.com/demo/arbor-demo-line',
    false,
    'Colombia,Mexico',
    69,
    'Ilustración de envíos regionales — no representa un vendedor real.',
    'Demo · ejemplo',
    true,
    'STRATEGIC_FOUNDER',
    false,
    true
)
ON CONFLICT (slug) DO NOTHING;

-- Reference photos (Wikimedia Commons) — only fill when empty so deploys keep custom assets.
UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg'
WHERE scientific_name = 'Brachypelma hamorii' AND (reference_photo_url IS NULL OR reference_photo_url = '');

UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg'
WHERE scientific_name = 'Chromatopelma cyaneopubescens' AND (reference_photo_url IS NULL OR reference_photo_url = '');

UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg'
WHERE scientific_name = 'Grammostola pulchripes' AND (reference_photo_url IS NULL OR reference_photo_url = '');

UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tliltocatl_vagans.jpg/1024px-Tliltocatl_vagans.jpg'
WHERE scientific_name = 'Tliltocatl vagans' AND (reference_photo_url IS NULL OR reference_photo_url = '');

-- Demo collection rows for the seed keeper (optional showcase).
INSERT INTO tarantulas (id, user_id, species_id, name, short_id, stage, sex, profile_photo, is_public)
SELECT
    'c1000000-0000-4000-8000-000000000001'::uuid,
    u.id,
    (SELECT id FROM species WHERE scientific_name = 'Brachypelma hamorii' LIMIT 1),
    'Demo · Luna',
    'TAUXSEED1',
    'adult',
    'female',
    'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg',
    false
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (short_id) DO NOTHING;

INSERT INTO tarantulas (id, user_id, species_id, name, short_id, stage, sex, profile_photo, is_public)
SELECT
    'c1000000-0000-4000-8000-000000000002'::uuid,
    u.id,
    (SELECT id FROM species WHERE scientific_name = 'Chromatopelma cyaneopubescens' LIMIT 1),
    'Demo · Azul',
    'TAUXSEED2',
    'juvenile',
    'unsexed',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    false
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (short_id) DO NOTHING;

-- Public feed samples (Spanish copy for LATAM beta).
INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000001'::uuid,
    u.id,
    '🪴 Primera mudita en la nueva enclosure — todo fluido. (Post de demostración para la beta.)',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg',
    'image',
    true,
    now() - interval '36 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000002'::uuid,
    u.id,
    'Probando recordatorios de comida con la tarántula más dormilona del mundo 😅 #demo',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    'image',
    true,
    now() - interval '20 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000003'::uuid,
    u.id,
    '¿Alguien más usa etiquetas QR en tapas? Estamos puliendo el flujo en la beta. (Contenido DEMO)',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    'image',
    true,
    now() - interval '6 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

-- Extra demo seeds so beta testers see fuller marketplace, feed, and profiles.
-- All copy marks content as temporary / DEMO (no real commerce).

-- Two more official vendors (partner marketplace cards).
INSERT INTO official_vendors (
    slug, name, country, state, city, website_url, national_shipping, ships_to_countries,
    influence_score, note, badge, enabled, partner_program_tier, listing_import_enabled, is_demo
)
VALUES
(
    'demo-lunar-spoods',
    'Lunar Spoods Lab (DEMO)',
    'Mexico',
    'Nuevo León',
    'Monterrey',
    'https://example.com/demo/lunar-spoods',
    true,
    'Mexico,United States',
    72,
    'Tienda ficticia — datos de relleno mientras activamos socios reales.',
    'Demo · temporal',
    true,
    'STRATEGIC_PARTNER',
    false,
    true
),
(
    'demo-andean-arachno',
    'Andean Arachno Hub (DEMO)',
    'Peru',
    'Cusco',
    'Cusco',
    'https://example.com/demo/andean-arachno',
    false,
    'Peru,Chile',
    67,
    'Ejemplo regional — no representa inventario real.',
    'Demo · ficticio',
    true,
    'STRATEGIC_FOUNDER',
    false,
    true
)
ON CONFLICT (slug) DO NOTHING;

-- Keeper profile for the system demo user (community / handle surfaces).
INSERT INTO keeper_profiles (user_id, handle, bio, location, featured_collection, contact_instagram)
SELECT
    u.id,
    'demo_feed_beta',
    'Perfil de demostración — contenido temporal mientras la comunidad crece. Nada de aquí es una venta real.',
    'Ciudad de México, México',
    'Tarántulas de ejemplo (DEMO)',
    'tarantulapp_demo'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (user_id) DO NOTHING;

-- Partner catalog rows (official vendors): illustrative listings, not buyable.
INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000101'::uuid,
    v.id,
    'demo-beta-101',
    '[DEMO] Brachypelma hamorii — juvenil (ejemplo)',
    'Listado ficticio para la beta; precio ilustrativo. No es una compra real.',
    'Brachypelma hamorii',
    'brachypelma hamorii',
    s.id,
    1299.00,
    'MXN',
    2,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg',
    'https://example.com/demo/products/demo-beta-101',
    'Mexico',
    'CDMX',
    'Ciudad de México',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Brachypelma hamorii' LIMIT 1) s
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
    'f1000000-0000-4000-8000-000000000102'::uuid,
    v.id,
    'demo-beta-102',
    '[DEMO] Grammostola pulchripes — sling (placeholder)',
    'Stock de ejemplo; reemplazaremos con inventario real de socios.',
    'Grammostola pulchripes',
    'grammostola pulchripes',
    s.id,
    890.00,
    'MXN',
    5,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    'https://example.com/demo/products/demo-beta-102',
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
    'f1000000-0000-4000-8000-000000000103'::uuid,
    v.id,
    'demo-beta-103',
    '[DEMO] Chromatopelma cyaneopubescens — subadulto',
    'Solo para mostrar layout y filtros — contenido temporal.',
    'Chromatopelma cyaneopubescens',
    'chromatopelma cyaneopubescens',
    s.id,
    1450.00,
    'MXN',
    1,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    'https://example.com/demo/products/demo-beta-103',
    'Mexico',
    'Jalisco',
    'Guadalajara',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Chromatopelma cyaneopubescens' LIMIT 1) s
WHERE v.slug = 'demo-silkforge-collective'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000104'::uuid,
    v.id,
    'demo-beta-104',
    '[DEMO] Tliltocatl vagans — adulta (mock)',
    'Texto de relleno mientras importamos catálogos reales de criadores.',
    'Tliltocatl vagans',
    'tliltocatl vagans',
    s.id,
    1100.00,
    'MXN',
    0,
    'OUT_OF_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tliltocatl_vagans.jpg/1024px-Tliltocatl_vagans.jpg',
    'https://example.com/demo/products/demo-beta-104',
    'Mexico',
    'Jalisco',
    'Guadalajara',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Tliltocatl vagans' LIMIT 1) s
WHERE v.slug = 'demo-silkforge-collective'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000105'::uuid,
    v.id,
    'demo-beta-105',
    '[DEMO] Avicularia avicularia — sling grupal',
    'Fila de ejemplo — DEMO, sin envíos reales desde esta entrada.',
    'Avicularia avicularia',
    'avicularia avicularia',
    s.id,
    350.00,
    'MXN',
    12,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Avicularia_avicularia_001.jpg/1024px-Avicularia_avicularia_001.jpg',
    'https://example.com/demo/products/demo-beta-105',
    'Colombia',
    'Antioquia',
    'Medellín',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Avicularia avicularia' LIMIT 1) s
WHERE v.slug = 'demo-arbor-demo-line'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000106'::uuid,
    v.id,
    'demo-beta-106',
    '[DEMO] Psalmopoeus irminia — juvenil',
    'Contenido provisional para probar cards y enlaces.',
    'Psalmopoeus irminia',
    'psalmopoeus irminia',
    s.id,
    42.00,
    'USD',
    3,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Psalmopoeus_irminia_1170677.jpg/1024px-Psalmopoeus_irminia_1170677.jpg',
    'https://example.com/demo/products/demo-beta-106',
    'Mexico',
    'Nuevo León',
    'Monterrey',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Psalmopoeus irminia' LIMIT 1) s
WHERE v.slug = 'demo-lunar-spoods'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

INSERT INTO partner_listings (
    id, official_vendor_id, external_id, title, description,
    species_name_raw, species_normalized, species_id,
    price_amount, currency, stock_quantity, availability,
    image_url, product_canonical_url, country, state, city,
    last_synced_at, status
)
SELECT
    'f1000000-0000-4000-8000-000000000107'::uuid,
    v.id,
    'demo-beta-107',
    '[DEMO] Hapalopus sp. Colombia — grupo',
    'Datos de muestra; no contactar por esta publicación.',
    'Hapalopus sp. Colombia (grande)',
    'hapalopus sp colombia grande',
    s.id,
    28.00,
    'USD',
    8,
    'IN_STOCK',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    'https://example.com/demo/products/demo-beta-107',
    'Peru',
    'Cusco',
    'Cusco',
    now(),
    'ACTIVE'
FROM official_vendors v
CROSS JOIN LATERAL (SELECT id FROM species WHERE scientific_name = 'Hapalopus sp. Colombia (grande)' LIMIT 1) s
WHERE v.slug = 'demo-andean-arachno'
ON CONFLICT (official_vendor_id, external_id) DO NOTHING;

-- Peer marketplace listings (user-to-user style), clearly labeled.
INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000201'::uuid,
    u.id,
    '[DEMO · temporal] Poecilotheria regalis — intercambio ilustrativo',
    'Anuncio ficticio para la beta. No hay animal ni venta real detrás de esta fila.',
    'Poecilotheria regalis',
    'juvenile',
    'unsexed',
    2500.00,
    'MXN',
    'active',
    'Guadalajara',
    'Mexico',
    'Jalisco',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Poecilotheria_regalis.jpg/1024px-Poecilotheria_regalis.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000202'::uuid,
    u.id,
    '[DEMO] Lasiodora parahybana — sling (placeholder)',
    'Solo para que el listado no se vea vacío; reemplazaremos con anuncios reales.',
    'Lasiodora parahybana',
    'sling',
    'unsexed',
    450.00,
    'MXN',
    'active',
    'Ciudad de México',
    'Mexico',
    'CDMX',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lasiodora_parahybana.jpg/1024px-Lasiodora_parahybana.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000203'::uuid,
    u.id,
    '[DEMO · mientras tanto] Enclosure decorada — foto de ejemplo',
    'Producto inventado para mostrar fotos y ubicación; no está en venta.',
    'Accesorios (demo)',
    NULL,
    NULL,
    899.00,
    'MXN',
    'active',
    'Monterrey',
    'Mexico',
    'Nuevo León',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Theraphosa_blondi.jpg/1024px-Theraphosa_blondi.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000204'::uuid,
    u.id,
    '[DEMO] Theraphosa blondi — adulta (mock)',
    'Etiqueta DEMO: contenido temporal para pruebas de UI.',
    'Theraphosa blondi',
    'adult',
    'female',
    4200.00,
    'MXN',
    'active',
    'Medellín',
    'Colombia',
    'Antioquia',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Theraphosa_blondi.jpg/1024px-Theraphosa_blondi.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, country, state, image_url
)
SELECT
    'e2000000-0000-4000-8000-000000000205'::uuid,
    u.id,
    '[DEMO] Caja de transporte + hidratación (ejemplo)',
    'Ítem genérico ficticio — sirve para ver cómo se ven los listados.',
    'Suministros (demo)',
    NULL,
    NULL,
    320.00,
    'MXN',
    'active',
    'Cusco',
    'Peru',
    'Cusco',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Grammostola_pulchripes_L1610989.jpg/1024px-Grammostola_pulchripes_L1610989.jpg'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

-- Extra demo spiders (mostly private; one public for collection previews).
INSERT INTO tarantulas (id, user_id, species_id, name, short_id, stage, sex, profile_photo, is_public)
SELECT
    'c1000000-0000-4000-8000-000000000003'::uuid,
    u.id,
    (SELECT id FROM species WHERE scientific_name = 'Grammostola pulchripes' LIMIT 1),
    'Demo · Miel',
    'TAUXSEED3',
    'subadult',
    'female',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    true
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (short_id) DO NOTHING;

INSERT INTO tarantulas (id, user_id, species_id, name, short_id, stage, sex, profile_photo, is_public)
SELECT
    'c1000000-0000-4000-8000-000000000004'::uuid,
    u.id,
    (SELECT id FROM species WHERE scientific_name = 'Tliltocatl vagans' LIMIT 1),
    'Demo · Cacao',
    'TAUXSEED4',
    'juvenile',
    'unsexed',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tliltocatl_vagans.jpg/1024px-Tliltocatl_vagans.jpg',
    true
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (short_id) DO NOTHING;

INSERT INTO tarantulas (id, user_id, species_id, name, short_id, stage, sex, profile_photo, is_public)
SELECT
    'c1000000-0000-4000-8000-000000000005'::uuid,
    u.id,
    (SELECT id FROM species WHERE scientific_name = 'Poecilotheria regalis' LIMIT 1),
    'Demo · Rayas',
    'TAUXSEED5',
    'sling',
    'unsexed',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Poecilotheria_regalis.jpg/1024px-Poecilotheria_regalis.jpg',
    false
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (short_id) DO NOTHING;

-- More community feed samples (Spanish), clearly DEMO / temporal.
INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000004'::uuid,
    u.id,
    '📦 Empaque de prueba: estamos afinando fotos y pesos para envíos. (DEMO — contenido temporal)',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tliltocatl_vagans.jpg/1024px-Tliltocatl_vagans.jpg',
    'image',
    true,
    now() - interval '52 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000005'::uuid,
    u.id,
    'Tip beta: guarda un registro de mudas aunque sea corto — ayuda a ver patrones. #demo #mientrasTanto',
    'public',
    NULL,
    NULL,
    true,
    now() - interval '44 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000006'::uuid,
    u.id,
    'Humedad estable > humedad alta por ráfagas. Post de demostración para la beta.',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Poecilotheria_regalis.jpg/1024px-Poecilotheria_regalis.jpg',
    'image',
    true,
    now() - interval '30 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000007'::uuid,
    u.id,
    '¿Probamos listados del marketplace? Estas filas son ficticias hasta que entren socios reales. [DEMO]',
    'public',
    NULL,
    NULL,
    true,
    now() - interval '18 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000008'::uuid,
    u.id,
    'Subí fotos con luz suave para no estresar a la spood — ejemplo para la comunidad (temporal).',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lasiodora_parahybana.jpg/1024px-Lasiodora_parahybana.jpg',
    'image',
    true,
    now() - interval '14 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000009'::uuid,
    u.id,
    'Roadmap corto: QR en etiquetas, feed público, marketplace. Gracias por probar la beta 🙌 (post DEMO)',
    'public',
    NULL,
    NULL,
    true,
    now() - interval '9 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_posts (id, author_user_id, body, visibility, media_url, media_type, is_demo_content, created_at)
SELECT
    'b1000000-0000-4000-8000-000000000010'::uuid,
    u.id,
    'Recordatorio amable: lo que ves como “DEMO” o “temporal” son placeholders — no comprar ni DM serios ahí.',
    'public',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Theraphosa_blondi.jpg/1024px-Theraphosa_blondi.jpg',
    'image',
    true,
    now() - interval '3 hours'
FROM users u
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid'
ON CONFLICT (id) DO NOTHING;

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

-- -----------------------------------------------------------------------------
-- Optional repair: partner_listings written with lowercase enums (fails CHECK).
-- Run only if you see chk_partner_listings_* violations. Same logic as V52.
-- -----------------------------------------------------------------------------
/*
UPDATE partner_listings
SET availability = CASE lower(availability)
    WHEN 'in_stock' THEN 'IN_STOCK'
    WHEN 'out_of_stock' THEN 'OUT_OF_STOCK'
    ELSE 'UNKNOWN'
END
WHERE availability IS NOT NULL;

UPDATE partner_listings
SET status = CASE lower(status)
    WHEN 'active' THEN 'ACTIVE'
    WHEN 'stale' THEN 'STALE'
    ELSE 'HIDDEN'
END
WHERE status IS NOT NULL;
*/

