-- V2: Catálogo de especies
CREATE TABLE species (
    id                INT          NOT NULL GENERATED ALWAYS AS IDENTITY,
    scientific_name   VARCHAR(150) NOT NULL,
    common_name       VARCHAR(150) NULL,
    origin_region     VARCHAR(150) NULL,
    habitat_type      VARCHAR(20)  NULL,   -- terrestrial | arboreal | fossorial
    adult_size_cm_min DECIMAL(4,1) NULL,
    adult_size_cm_max DECIMAL(4,1) NULL,
    growth_rate       VARCHAR(20)  NULL,   -- slow | moderate | fast
    temperament       VARCHAR(200) NULL,
    humidity_min      INT          NULL,
    humidity_max      INT          NULL,
    ventilation       VARCHAR(20)  NULL,   -- low | moderate | high
    substrate_type    VARCHAR(150) NULL,
    experience_level  VARCHAR(20)  NULL,   -- beginner | intermediate | advanced
    care_notes        TEXT         NULL,
    is_custom         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by        UUID         NULL,
    CONSTRAINT pk_species              PRIMARY KEY (id),
    CONSTRAINT uq_species_sci_name     UNIQUE (scientific_name),
    CONSTRAINT fk_species_created_by   FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_species_scientific_name ON species (scientific_name);
CREATE INDEX idx_species_common_name     ON species (common_name);
