-- V12: sinónimos manuales de especies ya sembradas (reclasificaciones conocidas del hobby)

INSERT INTO species_synonyms (species_id, synonym, source)
SELECT id, 'Brachypelma vagans', 'manual'
FROM species WHERE scientific_name = 'Tliltocatl vagans';

INSERT INTO species_synonyms (species_id, synonym, source)
SELECT id, 'Brachypelma smithi', 'manual'
FROM species WHERE scientific_name = 'Brachypelma hamorii';

INSERT INTO species_synonyms (species_id, synonym, source)
SELECT id, 'Avicularia versicolor', 'manual'
FROM species WHERE scientific_name = 'Caribena versicolor';

INSERT INTO species_synonyms (species_id, synonym, source)
SELECT id, 'Haplopelma lividum', 'manual'
FROM species WHERE scientific_name = 'Cyriopagopus lividus';

INSERT INTO species_synonyms (species_id, synonym, source)
SELECT id, 'Grammostola rosea', 'manual'
FROM species WHERE scientific_name = 'Grammostola porteri';
