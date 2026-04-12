-- V5: Registros de alimentación
CREATE TABLE feeding_logs (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    tarantula_id  UUID         NOT NULL,
    fed_at        TIMESTAMPTZ  NOT NULL,
    prey_type     VARCHAR(50)  NULL,   -- grillo, dubia, lombriz...
    prey_size     VARCHAR(20)  NULL,   -- small | medium | large
    quantity      INT          NOT NULL DEFAULT 1,
    accepted      BOOLEAN      NULL,
    notes         VARCHAR(500) NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_feeding_logs      PRIMARY KEY (id),
    CONSTRAINT fk_feeding_tarantula FOREIGN KEY (tarantula_id) REFERENCES tarantulas(id) ON DELETE CASCADE
);

CREATE INDEX idx_feeding_tarantula_date ON feeding_logs (tarantula_id, fed_at DESC);
