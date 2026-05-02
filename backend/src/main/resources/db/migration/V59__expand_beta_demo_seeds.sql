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
    'in_stock',
    'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brachypelma_hamorii_003.jpg',
    'https://example.com/demo/products/demo-beta-101',
    'Mexico',
    'CDMX',
    'Ciudad de México',
    now(),
    'active'
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
    'in_stock',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    'https://example.com/demo/products/demo-beta-102',
    'Mexico',
    'CDMX',
    'Ciudad de México',
    now(),
    'active'
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
    'in_stock',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chromatopelma_cyaneopubescens_L1060747.jpg/1024px-Chromatopelma_cyaneopubescens_L1060747.jpg',
    'https://example.com/demo/products/demo-beta-103',
    'Mexico',
    'Jalisco',
    'Guadalajara',
    now(),
    'active'
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
    'out_of_stock',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tliltocatl_vagans.jpg/1024px-Tliltocatl_vagans.jpg',
    'https://example.com/demo/products/demo-beta-104',
    'Mexico',
    'Jalisco',
    'Guadalajara',
    now(),
    'active'
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
    'in_stock',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Avicularia_avicularia_001.jpg/1024px-Avicularia_avicularia_001.jpg',
    'https://example.com/demo/products/demo-beta-105',
    'Colombia',
    'Antioquia',
    'Medellín',
    now(),
    'active'
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
    'in_stock',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Psalmopoeus_irminia_1170677.jpg/1024px-Psalmopoeus_irminia_1170677.jpg',
    'https://example.com/demo/products/demo-beta-106',
    'Mexico',
    'Nuevo León',
    'Monterrey',
    now(),
    'active'
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
    'in_stock',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Grammostola_pulchripes_L1610989.jpg',
    'https://example.com/demo/products/demo-beta-107',
    'Peru',
    'Cusco',
    'Cusco',
    now(),
    'active'
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
