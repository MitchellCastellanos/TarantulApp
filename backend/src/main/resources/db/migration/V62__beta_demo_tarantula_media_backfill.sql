-- Repair beta DEMO image URLs: older migrations pointed at moved/removed Commons files and broken thumb paths.
-- All URLs below are direct upload.wikimedia.org originals (tarantula photos only).

-- Species reference shots: refresh Wikimedia URLs only (leave non-Commons refs untouched).
UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
WHERE scientific_name = 'Brachypelma hamorii'
  AND (reference_photo_url IS NULL OR trim(reference_photo_url) = '' OR reference_photo_url LIKE '%upload.wikimedia.org%');

UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Chromatopelma-cyaneopubescens-2348.JPG'
WHERE scientific_name = 'Chromatopelma cyaneopubescens'
  AND (reference_photo_url IS NULL OR trim(reference_photo_url) = '' OR reference_photo_url LIKE '%upload.wikimedia.org%');

UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
WHERE scientific_name = 'Grammostola pulchripes'
  AND (reference_photo_url IS NULL OR trim(reference_photo_url) = '' OR reference_photo_url LIKE '%upload.wikimedia.org%');

UPDATE species SET reference_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Tliltocatl_vagans_12147674.jpg'
WHERE scientific_name = 'Tliltocatl vagans'
  AND (reference_photo_url IS NULL OR trim(reference_photo_url) = '' OR reference_photo_url LIKE '%upload.wikimedia.org%');

-- Demo system user avatar.
UPDATE users u
SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
WHERE u.email = 'beta-demo-feed@internal.tarantulapp.invalid';

-- Community feed (ES + EN demo copies): every seeded post gets a working spider photo.
UPDATE activity_posts p
SET
    media_url = CASE p.id
        WHEN 'b1000000-0000-4000-8000-000000000001'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000002'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Chromatopelma-cyaneopubescens-2348.JPG'
        WHEN 'b1000000-0000-4000-8000-000000000003'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000004'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Tliltocatl_vagans_12147674.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000005'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/0/00/Lasiodora_parahybana.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000006'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Poecilotheria_regalis.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000007'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Avicularia_avicularia.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000008'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/0/00/Lasiodora_parahybana.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000009'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/7/79/Psalmopoeus_irminia_0041.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000010'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/1/14/Theraphosa_blondi_244516842.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000011'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000012'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Chromatopelma-cyaneopubescens-2348.JPG'
        WHEN 'b1000000-0000-4000-8000-000000000013'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000014'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Tliltocatl_vagans_12147674.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000015'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/2/21/Aphonopelma_chalcodes.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000016'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Poecilotheria_regalis.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000017'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/6/60/Poecilotheria_metallica.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000018'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/0/00/Lasiodora_parahybana.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000019'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
        WHEN 'b1000000-0000-4000-8000-000000000020'::uuid THEN 'https://upload.wikimedia.org/wikipedia/commons/1/14/Theraphosa_blondi_244516842.jpg'
    END,
    media_type = 'image'
WHERE p.is_demo_content = true
  AND p.id IN (
      'b1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000002'::uuid,
      'b1000000-0000-4000-8000-000000000003'::uuid, 'b1000000-0000-4000-8000-000000000004'::uuid,
      'b1000000-0000-4000-8000-000000000005'::uuid, 'b1000000-0000-4000-8000-000000000006'::uuid,
      'b1000000-0000-4000-8000-000000000007'::uuid, 'b1000000-0000-4000-8000-000000000008'::uuid,
      'b1000000-0000-4000-8000-000000000009'::uuid, 'b1000000-0000-4000-8000-000000000010'::uuid,
      'b1000000-0000-4000-8000-000000000011'::uuid, 'b1000000-0000-4000-8000-000000000012'::uuid,
      'b1000000-0000-4000-8000-000000000013'::uuid, 'b1000000-0000-4000-8000-000000000014'::uuid,
      'b1000000-0000-4000-8000-000000000015'::uuid, 'b1000000-0000-4000-8000-000000000016'::uuid,
      'b1000000-0000-4000-8000-000000000017'::uuid, 'b1000000-0000-4000-8000-000000000018'::uuid,
      'b1000000-0000-4000-8000-000000000019'::uuid, 'b1000000-0000-4000-8000-000000000020'::uuid
  );

-- Partner catalog (demo vendor listings).
UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000101'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000102'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Chromatopelma-cyaneopubescens-2348.JPG'
WHERE id = 'f1000000-0000-4000-8000-000000000103'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Tliltocatl_vagans_12147674.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000104'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Avicularia_avicularia.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000105'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/79/Psalmopoeus_irminia_0041.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000106'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/19/Hapalopus_triseriatus_young.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000107'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000108'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/6/60/Poecilotheria_metallica.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000109'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Chromatopelma-cyaneopubescens-2348.JPG'
WHERE id = 'f1000000-0000-4000-8000-000000000110'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/21/Aphonopelma_chalcodes.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000111'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000112'::uuid;

UPDATE partner_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Striped-knee_Tarantula_%28Aphonopelma_seemanni%29_%286944283342%29.jpg'
WHERE id = 'f1000000-0000-4000-8000-000000000113'::uuid;

-- Peer marketplace (demo seller).
UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Poecilotheria_regalis.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000201'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/00/Lasiodora_parahybana.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000202'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/14/Theraphosa_blondi_244516842.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000203'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/14/Theraphosa_blondi_244516842.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000204'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000205'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/21/Aphonopelma_chalcodes.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000206'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Chromatopelma-cyaneopubescens-2348.JPG'
WHERE id = 'e2000000-0000-4000-8000-000000000207'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000208'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/00/Lasiodora_parahybana.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000209'::uuid;

UPDATE marketplace_listings SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
WHERE id = 'e2000000-0000-4000-8000-000000000210'::uuid;

-- Demo collection spiders (profile photos).
UPDATE tarantulas SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Brachypelma_smithi_2009_G09.jpg'
WHERE id = 'c1000000-0000-4000-8000-000000000001'::uuid;

UPDATE tarantulas SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Chromatopelma-cyaneopubescens-2348.JPG'
WHERE id = 'c1000000-0000-4000-8000-000000000002'::uuid;

UPDATE tarantulas SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Grammostola_pulchripes_2.jpg'
WHERE id = 'c1000000-0000-4000-8000-000000000003'::uuid;

UPDATE tarantulas SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Tliltocatl_vagans_12147674.jpg'
WHERE id = 'c1000000-0000-4000-8000-000000000004'::uuid;

UPDATE tarantulas SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Poecilotheria_regalis.jpg'
WHERE id = 'c1000000-0000-4000-8000-000000000005'::uuid;

UPDATE tarantulas SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/2/21/Aphonopelma_chalcodes.jpg'
WHERE id = 'c1000000-0000-4000-8000-000000000006'::uuid;

UPDATE tarantulas SET profile_photo = 'https://upload.wikimedia.org/wikipedia/commons/6/60/Poecilotheria_metallica.jpg'
WHERE id = 'c1000000-0000-4000-8000-000000000007'::uuid;
