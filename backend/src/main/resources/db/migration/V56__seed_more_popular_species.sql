-- V56: Sembrado de especies populares ausentes en V3
-- Motivación: vendors y búsquedas frecuentes (Cyriocosmus elegans, Tliltocatl albopilosus,
-- Grammostola pulchra, Aphonopelma seemanni, etc.) llegaban al Discover sin tarjeta porque
-- no existían filas en `species`. Sin fila no hay tarjeta (DiscoverCatalogService.isPublicCatalogRow).
-- Fuentes consultadas para datos de cuidado: World Spider Catalog (rangos y distribución),
-- Tom's Big Spiders y Arachnoboards (rangos de humedad/ventilación/temperamento del hobby).

INSERT INTO species (
    scientific_name, common_name, origin_region, habitat_type,
    adult_size_cm_min, adult_size_cm_max, growth_rate, temperament,
    humidity_min, humidity_max, ventilation, substrate_type,
    experience_level, care_notes, is_custom, data_source, hobby_world
) VALUES
(
    'Cyriocosmus elegans', 'Trinidad Olive Beauty', 'Trinidad, Venezuela', 'terrestrial',
    5.0, 7.0, 'moderate', 'Tímida, escondediza, sin pelos urticantes molestos, no agresiva',
    70, 80, 'moderate', 'Coco húmedo profundo, permite madrigueras',
    'beginner', 'Enana llamativa con un patrón en forma de corazón en el opistosoma. Pasa mucho tiempo en su madriguera. Excelente para principiantes con poco espacio que no buscan manipular. Necesita sustrato profundo y húmedo.', false, 'seed', 'new_world'
),
(
    'Tliltocatl albopilosus', 'Honduran Curly Hair', 'Honduras, Nicaragua, Costa Rica', 'terrestrial',
    14.0, 17.0, 'moderate', 'Dócil, tolerante, ocasional pateo de pelos urticantes',
    65, 75, 'moderate', 'Coco, tierra vegetal',
    'beginner', 'Una de las especies más recomendadas para iniciar el hobby. Pelaje rizado característico. Muy resistente, come bien y tolera errores comunes de novato. Activa y visible.', false, 'seed', 'new_world'
),
(
    'Brachypelma emilia', 'Mexican Red Leg', 'México (Sinaloa, Sonora, Nayarit)', 'terrestrial',
    13.0, 15.0, 'slow', 'Dócil, puede patear pelos urticantes ante estrés',
    50, 65, 'moderate', 'Coco seco, arena gruesa, turba',
    'beginner', 'Patrón en triángulo negro sobre el cefalotórax y patas con bandas rojas/naranja. Crecimiento lento pero longeva (décadas). Mismos cuidados que el resto del género.', false, 'seed', 'new_world'
),
(
    'Brachypelma albiceps', 'Mexican Golden Red Rump', 'México (Guerrero, Morelos)', 'terrestrial',
    13.0, 15.0, 'slow', 'Dócil, puede patear pelos urticantes',
    50, 65, 'moderate', 'Coco seco, arena, turba',
    'beginner', 'Cefalotórax dorado y opistosoma rojo intenso. Muy llamativa y tranquila. Crecimiento lento típico del género. Buena alternativa a hamorii con coloración distinta.', false, 'seed', 'new_world'
),
(
    'Aphonopelma seemanni', 'Costa Rican Zebra', 'Costa Rica, Nicaragua, Honduras', 'terrestrial',
    12.0, 14.0, 'moderate', 'Esquiva, suele cavar y esconderse, rara vez defensiva',
    65, 75, 'moderate', 'Coco profundo, permite cavar',
    'beginner', 'Patas con bandas blanco-negro tipo cebra. Excelente cavadora; ofrécele sustrato profundo. Aunque tímida, es resistente y muy popular en Centroamérica.', false, 'seed', 'new_world'
),
(
    'Grammostola pulchra', 'Brazilian Black', 'Brasil, Uruguay', 'terrestrial',
    16.0, 20.0, 'slow', 'Extremadamente dócil, pelos urticantes muy leves',
    60, 70, 'moderate', 'Coco, tierra vegetal',
    'beginner', 'Negro azabache puro en adultas. Considerada de las más dóciles y bonitas del hobby. Crecimiento muy lento pero longevidad enorme. Inversión a largo plazo.', false, 'seed', 'new_world'
),
(
    'Davus pentaloris', 'Guatemalan Tiger Rump', 'Guatemala, sur de México', 'terrestrial',
    8.0, 10.0, 'moderate', 'Nerviosa, veloz, pelos urticantes presentes pero leves',
    65, 75, 'moderate', 'Coco húmedo, tierra vegetal',
    'beginner', 'Enana muy colorida con rayas tipo tigre en el abdomen. Activa y visible si tiene escondite. Buena segunda especie tras una Brachypelma o Tliltocatl.', false, 'seed', 'new_world'
),
(
    'Psalmopoeus irminia', 'Venezuelan Suntiger', 'Venezuela', 'arboreal',
    14.0, 16.0, 'fast', 'Defensiva y rápida, sin pelos urticantes, muerde sin advertencia',
    70, 80, 'high', 'Coco con corchos verticales y trepaderos',
    'intermediate', 'Patrón naranja brillante sobre fondo negro inconfundible. Velocidad y temperamento exigen respeto. Sin urticantes pero compensa con actitud. Crecimiento rápido.', false, 'seed', 'new_world'
),
(
    'Xenesthis immanis', 'Colombian Lesserblack', 'Colombia, Ecuador, Venezuela', 'terrestrial',
    18.0, 22.0, 'moderate', 'Defensiva pero más bien escondediza, raramente visible',
    70, 85, 'moderate', 'Coco profundo y húmedo, permite madrigueras',
    'intermediate', 'Gigante sudamericana con coloración violácea en machos maduros. Pasa mucho tiempo en madriguera. Necesita terrario amplio y humedad alta sin encharcar.', false, 'seed', 'new_world'
),
(
    'Harpactira pulchripes', 'Golden Blue Leg Baboon', 'Sudáfrica (Provincia Oriental del Cabo)', 'terrestrial',
    12.0, 14.0, 'moderate', 'Defensiva pero más manejable que otros baboons africanos, veloz',
    55, 65, 'moderate', 'Coco con arena, permite madrigueras',
    'intermediate', 'Cefalotórax y patas con tonos dorados y azulados espectaculares. Más tolerante que la mayoría de baboons, pero sigue siendo veloz. Buena puerta de entrada al Old World.', false, 'seed', 'old_world'
),
(
    'Idiothele mira', 'Blue Foot Baboon', 'Sudáfrica (KwaZulu-Natal)', 'fossorial',
    10.0, 12.0, 'moderate', 'Defensiva, fossorial obligada, construye trampilla',
    60, 70, 'moderate', 'Coco profundo (15+ cm), construye trampilla con seda',
    'intermediate', 'Una de las pocas tarántulas que construye una trampilla auténtica en su madriguera. Pies azul brillante. Casi no se ve fuera del nido — para coleccionistas de comportamiento, no de exhibición.', false, 'seed', 'old_world'
),
(
    'Ceratogyrus darlingi', 'Rear-horned Baboon', 'Sudáfrica, Botswana, Mozambique, Zimbabwe', 'fossorial',
    12.0, 14.0, 'moderate', 'Defensiva, fossorial, sale sobre todo de noche',
    55, 70, 'moderate', 'Coco con arena profundo, permite madrigueras',
    'intermediate', 'Cuerno foveal característico en el cefalotórax. Cava madrigueras profundas. Más tolerante que otros baboons pero sigue requiriendo respeto. Excelente comedora.', false, 'seed', 'old_world'
),
(
    'Omothymus violaceopes', 'Singapore Blue', 'Singapur, Malasia, sur de Tailandia', 'arboreal',
    18.0, 22.0, 'fast', 'Muy defensiva, extremadamente rápida, sin pelos urticantes',
    70, 85, 'high', 'Coco con corchos verticales muy altos',
    'advanced', 'Arborícola gigante con coloración azul violácea espectacular. Velocidad y temperamento exigen experiencia previa con arborícolas Old World. Necesita altura y ventilación cruzada.', false, 'seed', 'old_world'
),
(
    'Chilobrachys fimbriatus', 'Indian Violet', 'India (Ghats Occidentales)', 'fossorial',
    14.0, 16.0, 'fast', 'Defensiva, veloz, fossorial con telas extensas',
    65, 80, 'moderate', 'Coco profundo (20+ cm), permite tunelar',
    'intermediate', 'Combina madrigueras profundas con tela superficial extensa. Crecimiento rápido. Tonos cobrizos y violetas en adultas. Para aficionados con algo de experiencia en fossoriales Old World.', false, 'seed', 'old_world'
)
ON CONFLICT (scientific_name) DO NOTHING;
