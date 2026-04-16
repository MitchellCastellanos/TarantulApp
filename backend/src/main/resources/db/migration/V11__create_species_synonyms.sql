-- V11: tabla de sinónimos de especies
CREATE TABLE species_synonyms (
    id         SERIAL PRIMARY KEY,
    species_id INT          NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    synonym    VARCHAR(150) NOT NULL UNIQUE,
    source     VARCHAR(20)  NOT NULL DEFAULT 'gbif'
);

CREATE INDEX idx_species_synonyms_lower ON species_synonyms (LOWER(synonym));
