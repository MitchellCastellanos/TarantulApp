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
