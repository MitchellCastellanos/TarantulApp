-- V6: Registros de mudas
CREATE TABLE molt_logs (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    tarantula_id  UUID         NOT NULL,
    molted_at     TIMESTAMPTZ  NOT NULL,
    pre_size_cm   DECIMAL(4,1) NULL,
    post_size_cm  DECIMAL(4,1) NULL,
    notes         VARCHAR(500) NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_molt_logs      PRIMARY KEY (id),
    CONSTRAINT fk_molt_tarantula FOREIGN KEY (tarantula_id) REFERENCES tarantulas(id) ON DELETE CASCADE
);

CREATE INDEX idx_molt_tarantula_date ON molt_logs (tarantula_id, molted_at DESC);
