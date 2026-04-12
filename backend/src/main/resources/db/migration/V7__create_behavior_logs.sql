-- V7: Registros de comportamiento
CREATE TABLE behavior_logs (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    tarantula_id  UUID         NOT NULL,
    logged_at     TIMESTAMPTZ  NOT NULL,
    mood          VARCHAR(30)  NULL,   -- calm | defensive | active | hiding | pre_molt
    notes         VARCHAR(500) NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_behavior_logs      PRIMARY KEY (id),
    CONSTRAINT fk_behavior_tarantula FOREIGN KEY (tarantula_id) REFERENCES tarantulas(id) ON DELETE CASCADE
);

CREATE INDEX idx_behavior_tarantula_date ON behavior_logs (tarantula_id, logged_at DESC);
