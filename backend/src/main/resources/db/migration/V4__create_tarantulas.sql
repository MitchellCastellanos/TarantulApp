-- V4: Tarántulas individuales
CREATE TABLE tarantulas (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL,
    species_id       INT          NULL,
    name             VARCHAR(100) NOT NULL,
    current_size_cm  DECIMAL(4,1) NULL,
    stage            VARCHAR(20)  NULL,   -- sling | juvenile | subadult | adult
    sex              VARCHAR(10)  NULL,   -- male | female | unsexed
    purchase_date    DATE         NULL,
    profile_photo    VARCHAR(500) NULL,
    notes            TEXT         NULL,
    is_public        BOOLEAN      NOT NULL DEFAULT FALSE,
    short_id         VARCHAR(10)  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tarantulas          PRIMARY KEY (id),
    CONSTRAINT uq_tarantulas_short_id UNIQUE (short_id),
    CONSTRAINT fk_tarantulas_user     FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT fk_tarantulas_species  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL
);

CREATE INDEX idx_tarantulas_user_id ON tarantulas (user_id);
