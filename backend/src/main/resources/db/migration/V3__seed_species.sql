-- V3: Datos iniciales del catálogo de especies
INSERT INTO species (
    scientific_name, common_name, origin_region, habitat_type,
    adult_size_cm_min, adult_size_cm_max, growth_rate, temperament,
    humidity_min, humidity_max, ventilation, substrate_type,
    experience_level, care_notes, is_custom
) VALUES
(
    'Tliltocatl vagans', 'Mexican Red Rump', 'México, Guatemala, Belice', 'terrestrial',
    12.0, 14.0, 'moderate', 'Defensiva, pateo de pelos urticantes frecuente',
    50, 70, 'moderate', 'Coco, tierra vegetal, turba',
    'beginner', 'Especie muy popular para comenzar el hobby. Construye madrigueras con facilidad. Tolera bien un rango amplio de condiciones de temperatura y humedad.', false
),
(
    'Brachypelma hamorii', 'Mexican Red Knee', 'México occidental (Jalisco, Michoacán)', 'terrestrial',
    14.0, 16.0, 'slow', 'Dócil, puede patear pelos urticantes, raramente arremete',
    50, 65, 'moderate', 'Coco seco, arena gruesa, turba',
    'beginner', 'Icónica del hobby. Crece muy lento pero vive décadas. Ideal para principiantes que buscan una tarántula longeva y manejable.', false
),
(
    'Brachypelma auratum', 'Mexican Flame Knee', 'México (Guerrero, Michoacán)', 'terrestrial',
    14.0, 15.0, 'slow', 'Dócil, similar a hamorii, ocasionalmente patea pelos',
    50, 65, 'moderate', 'Coco seco, arena, turba',
    'beginner', 'Coloración espectacular con rodillas naranja intenso. Mismos cuidados que hamorii. Crecimiento lento pero muy gratificante.', false
),
(
    'Brachypelma boehmei', 'Mexican Fire Leg', 'México (Guerrero)', 'terrestrial',
    12.0, 15.0, 'slow', 'Nerviosa, patea pelos con facilidad, puede amenazar',
    50, 65, 'moderate', 'Coco seco, turba, arena',
    'beginner', 'Patas naranja brillante inconfundibles. Algo más nerviosa que otros Brachypelma. Mismos cuidados básicos del género.', false
),
(
    'Grammostola pulchripes', 'Chaco Golden Knee', 'Paraguay, Argentina', 'terrestrial',
    16.0, 20.0, 'slow', 'Muy dócil, considerada la más tranquila del hobby',
    50, 60, 'low', 'Coco, turba, arena fina',
    'beginner', 'Una de las más dóciles y recomendadas para principiantes. Crece muy lento pero llega a ser grande y longeva. Poco mantenimiento.', false
),
(
    'Grammostola porteri', 'Chilean Rose', 'Chile central', 'terrestrial',
    12.0, 14.0, 'slow', 'Muy dócil pero puede ayunar meses sin causa aparente',
    50, 65, 'low', 'Coco seco, arena, turba',
    'beginner', 'Famosa por rechazar comida durante semanas o meses sin razón aparente. No te preocupes si ayuna; es completamente normal para esta especie.', false
),
(
    'Chromatopelma cyaneopubescens', 'Green Bottle Blue', 'Venezuela (Paraguaná)', 'terrestrial',
    14.0, 17.0, 'fast', 'Nerviosa y veloz, pelos urticantes leves, no agresiva',
    40, 55, 'high', 'Coco muy seco, arena gruesa',
    'intermediate', 'Una de las más hermosas del hobby. Necesita buena ventilación y sustrato seco. Le encanta construir telas elaboradas. Spot húmedo en un rincón.', false
),
(
    'Lasiodora parahybana', 'Brazilian Salmon Pink', 'Brasil (Paraíba)', 'terrestrial',
    20.0, 25.0, 'fast', 'Semi-defensiva, puede arremetir como advertencia, pelos intensos',
    60, 75, 'moderate', 'Coco húmedo, tierra vegetal',
    'intermediate', 'Crece muy rápido y llega a ser enorme. Activa y visible. Buena opción para quien quiere una tarántula grande sin demasiada agresividad.', false
),
(
    'Nhandu chromatus', 'White-Striped Birdeater', 'Brasil, Paraguay', 'terrestrial',
    16.0, 20.0, 'moderate', 'Defensiva, muy peluda, pateo de pelos muy intenso',
    60, 75, 'moderate', 'Coco, tierra vegetal húmeda',
    'intermediate', 'Pelos urticantes muy potentes; guantes recomendados en cualquier mantenimiento. Activa y llamativa gracias a su patrón de rayas.', false
),
(
    'Acanthoscurria geniculata', 'Giant White Knee', 'Brasil (Amazonas)', 'terrestrial',
    18.0, 22.0, 'fast', 'Defensiva, puede arremetir, rápida',
    65, 75, 'moderate', 'Coco, tierra húmeda',
    'intermediate', 'Una de las más llamativas por sus rodillas blancas sobre fondo negro. Crecimiento rápido. Activa y buena para observar.', false
),
(
    'Theraphosa blondi', 'Goliath Birdeater', 'Venezuela, Brasil norte, Surinam', 'terrestrial',
    25.0, 30.0, 'fast', 'Muy defensiva, pelos urticantes extremadamente irritantes',
    75, 90, 'low', 'Turba muy húmeda y profunda (20+ cm)',
    'advanced', 'La tarántula más grande del mundo. Requiere terrario amplio, mucha humedad y cuidado experimentado. Sus pelos son los más irritantes del hobby.', false
),
(
    'Avicularia avicularia', 'Pinktoe', 'Caribe, norte de Sudamérica', 'arboreal',
    12.0, 14.0, 'moderate', 'Dócil y veloz, rara vez muerde, puede saltar',
    65, 80, 'high', 'Coco suelto con trepaderos y ramas',
    'intermediate', 'Arborícola muy popular. Necesita altura más que área de piso. La ventilación cruzada es crítica; sin ella puede tener problemas en la muda.', false
),
(
    'Caribena versicolor', 'Antilles Pinktoe', 'Martinica', 'arboreal',
    13.0, 15.0, 'moderate', 'Dócil de adulta; sling puede ser errática y veloz',
    70, 85, 'high', 'Coco suelto, estructura arbórea con mucha ventilación',
    'intermediate', 'Los slings son increíblemente coloridos (azul intenso). Son algo más delicados que adultos y requieren más humedad. Alta ventilación siempre.', false
),
(
    'Poecilotheria regalis', 'Indian Ornamental', 'India (Tamil Nadu, Andhra Pradesh)', 'arboreal',
    17.0, 20.0, 'fast', 'Rápida y defensiva, puede morder sin previo aviso',
    65, 80, 'high', 'Coco, sustrato arbóreo con corchos y escondites verticales',
    'advanced', 'Velocidad y temperamento la ubican para aficionados experimentados. Cero descuidos al abrir el terrario. Mordedura reportada como dolorosa.', false
),
(
    'Poecilotheria metallica', 'Gooty Sapphire Ornamental', 'India (Andhra Pradesh)', 'arboreal',
    16.0, 18.0, 'fast', 'Extremadamente rápida y defensiva, especie en peligro de extinción',
    65, 80, 'high', 'Coco, corchos verticales, trepaderos',
    'advanced', 'Una de las más buscadas y hermosas del hobby. En peligro crítico en estado silvestre. Cuidados similares a regalis pero algo más delicada en slings.', false
),
(
    'Pterinochilus murinus', 'Orange Baboon Tarantula (OBT)', 'África oriental y central', 'terrestrial',
    12.0, 15.0, 'fast', 'Muy agresiva y rápida, defensa inmediata sin advertencia',
    50, 65, 'moderate', 'Coco, turba, permite madrigueras y telas extensas',
    'intermediate', 'Apodada "Orange Bitey Thing". Muy agresiva pero fascinante de observar. Construye redes elaboradas. Para aficionados que disfrutan observar, no manipular.', false
),
(
    'Cyriopagopus lividus', 'Cobalt Blue', 'Myanmar, Tailandia', 'fossorial',
    13.0, 15.0, 'moderate', 'Muy agresiva, fossorial extrema, raramente visible',
    70, 85, 'low', 'Turba muy profunda (30+ cm), acceso a agua',
    'advanced', 'Fossorial extrema; prácticamente no la verás fuera de su madriguera. Necesita mucho sustrato profundo. Para coleccionistas pacientes que valoran tener la especie.', false
),
(
    'Monocentropus balfouri', 'Socotra Blue Baboon', 'Isla Socotra, Yemen', 'terrestrial',
    14.0, 16.0, 'moderate', 'Defensiva pero manejable, semisocial (vive en grupos en la naturaleza)',
    50, 65, 'high', 'Coco, turba, ramas y madrigueras',
    'intermediate', 'Una de las pocas tarántulas semisociales del hobby. Es posible mantener varias juntas con cuidado. Coloración azulada espectacular en adultos.', false
),
(
    'Hapalopus sp. Colombia (grande)', 'Pumpkin Patch Tarantula', 'Colombia', 'terrestrial',
    8.0, 9.0, 'fast', 'Semi-defensiva, activa, puede patear pelos',
    65, 75, 'moderate', 'Coco húmedo, tierra vegetal',
    'beginner', 'Enana pero con personalidad grande. Muy activa y visible. Patrón naranja-negro sobre el abdomen muy llamativo. Perfecta para espacios reducidos.', false
),
(
    'Euathlus sp. Red', 'Chilean Dwarf', 'Chile', 'terrestrial',
    6.0, 7.0, 'slow', 'Muy dócil y tranquila',
    50, 65, 'low', 'Coco seco, arena fina, turba',
    'beginner', 'Enana y muy dócil, ideal para principiantes con poco espacio. Crece muy lento. Se esconde bastante pero tranquila si se manipula con cuidado.', false
),
(
    'Aphonopelma chalcodes', 'Desert Blonde', 'Sonora (México), Arizona (EE.UU.)', 'terrestrial',
    12.0, 14.0, 'slow', 'Muy dócil, puede patear pelos suaves',
    40, 55, 'low', 'Arena gruesa, tierra seca, grava fina',
    'beginner', 'Especie del desierto; necesita sustrato seco y buena ventilación. Muy dócil y resistente. Ayunos prolongados son normales, especialmente en invierno.', false
),
(
    'Psalmopoeus cambridgei', 'Trinidad Chevron', 'Trinidad, Venezuela norte', 'arboreal',
    16.0, 18.0, 'fast', 'Agresiva y rápida, sin pelos urticantes, muerde sin advertencia',
    65, 80, 'high', 'Coco, trepaderos, corchos verticales',
    'intermediate', 'Sin pelos urticantes pero compensa con velocidad y actitud defensiva. Crecimiento rápido. Para aficionados que quieren arbóreas más raras y desafiantes.', false
),
(
    'Stromatopelma calceatum', 'Featherleg Baboon', 'África occidental', 'arboreal',
    14.0, 17.0, 'fast', 'Extremadamente rápida y agresiva, defensa sin advertencia',
    65, 75, 'high', 'Coco, corchos verticales, trepaderos secos',
    'advanced', 'Una de las arbóreas más agresivas del hobby. Velocidad extrema. Solo para coleccionistas muy experimentados que entienden los riesgos.', false
),
(
    'Heteroscodra maculata', 'Togo Starburst Baboon', 'África occidental', 'arboreal',
    13.0, 15.0, 'fast', 'Muy agresiva y veloz, defensa inmediata',
    60, 75, 'high', 'Coco, corchos, trepaderos',
    'advanced', 'Patrón estrellado espectacular. Temperamento similar a Stromatopelma. Solo para coleccionistas avanzados. Extremadamente veloz.', false
),
(
    'Pamphobeteus sp. Platyomma', 'Giant Purple Birdeater', 'Colombia, Ecuador', 'terrestrial',
    18.0, 22.0, 'fast', 'Semi-defensiva, impresionante por tamaño y coloración',
    65, 80, 'moderate', 'Coco húmedo, tierra vegetal',
    'intermediate', 'Una de las tarántulas más grandes y llamativas de Sudamérica. Los machos muestran coloración morada/violácea espectacular. Requiere terrario amplio.', false
);
