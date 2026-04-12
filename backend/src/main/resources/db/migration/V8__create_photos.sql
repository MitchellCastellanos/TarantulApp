CREATE TABLE photos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarantula_id UUID        NOT NULL REFERENCES tarantulas(id) ON DELETE CASCADE,
    file_path    VARCHAR(500) NOT NULL,
    caption      VARCHAR(255),
    taken_at     TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_tarantula ON photos(tarantula_id, created_at DESC);
