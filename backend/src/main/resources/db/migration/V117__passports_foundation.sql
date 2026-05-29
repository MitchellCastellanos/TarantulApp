-- Phase 1: canonical public identity for specimens (passport before claim, specimen after claim).
-- Same short_id /t/{shortId} URL for life; existing tarantulas are backfilled as already claimed.

CREATE TABLE IF NOT EXISTS passports (
    id                   UUID         NOT NULL DEFAULT gen_random_uuid(),
    short_id             VARCHAR(10)  NOT NULL,
    created_by_user_id   UUID         NULL,
    species_id           INT          NULL,
    stage                VARCHAR(20)  NULL,
    sex                  VARCHAR(10)  NULL,
    origin_user_id       UUID         NULL,
    pro_gift_days        INT          NOT NULL DEFAULT 30,
    label_notes          TEXT         NULL,
    claimed_at           TIMESTAMPTZ  NULL,
    claimed_by_user_id   UUID         NULL,
    tarantula_id         UUID         NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_passports PRIMARY KEY (id),
    CONSTRAINT uq_passports_short_id UNIQUE (short_id),
    CONSTRAINT uq_passports_tarantula_id UNIQUE (tarantula_id),
    CONSTRAINT fk_passports_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_passports_origin_user FOREIGN KEY (origin_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_passports_claimed_by FOREIGN KEY (claimed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_passports_species FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL,
    CONSTRAINT fk_passports_tarantula FOREIGN KEY (tarantula_id) REFERENCES tarantulas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_passports_short_id ON passports (short_id);
CREATE INDEX IF NOT EXISTS idx_passports_created_by ON passports (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_passports_claimed_by ON passports (claimed_by_user_id);

ALTER TABLE tarantulas
    ADD COLUMN IF NOT EXISTS passport_id UUID NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tarantulas_passport'
    ) THEN
        ALTER TABLE tarantulas
            ADD CONSTRAINT fk_tarantulas_passport
            FOREIGN KEY (passport_id) REFERENCES passports(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tarantulas_passport_id ON tarantulas (passport_id) WHERE passport_id IS NOT NULL;

-- Backfill: every existing specimen gets a claimed passport with the same short_id.
INSERT INTO passports (
    id,
    short_id,
    created_by_user_id,
    species_id,
    stage,
    sex,
    origin_user_id,
    claimed_at,
    claimed_by_user_id,
    tarantula_id,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    t.short_id,
    t.user_id,
    t.species_id,
    t.stage,
    t.sex,
    t.user_id,
    COALESCE(t.created_at, NOW()),
    t.user_id,
    t.id,
    COALESCE(t.created_at, NOW()),
    COALESCE(t.updated_at, NOW())
FROM tarantulas t
WHERE NOT EXISTS (
    SELECT 1 FROM passports p WHERE p.short_id = t.short_id
);

UPDATE tarantulas t
SET passport_id = p.id
FROM passports p
WHERE p.tarantula_id = t.id
  AND t.passport_id IS NULL;

COMMENT ON TABLE passports IS
    'Canonical public identity at /t/{shortId}. Unclaimed = passport page; claimed = specimen page.';
