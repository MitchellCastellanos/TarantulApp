-- Phase 2 — Specimen ownership transfer between keepers (email-based, non-monetary,
-- irreversible). Documentation of custody, not a legal instrument. The passport keeps its
-- origin_user_id across transfers, so provenance ("bought from X") is preserved.

CREATE TABLE IF NOT EXISTS specimen_transfers (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    passport_id   UUID         NOT NULL,
    tarantula_id  UUID         NULL,
    from_user_id  UUID         NOT NULL,
    to_email      VARCHAR(255) NOT NULL,
    to_user_id    UUID         NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
    message       VARCHAR(500) NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    accepted_at   TIMESTAMPTZ  NULL,
    cancelled_at  TIMESTAMPTZ  NULL,
    CONSTRAINT pk_specimen_transfers PRIMARY KEY (id),
    CONSTRAINT fk_specimen_transfers_passport FOREIGN KEY (passport_id) REFERENCES passports (id),
    CONSTRAINT fk_specimen_transfers_from_user FOREIGN KEY (from_user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_specimen_transfers_passport ON specimen_transfers (passport_id);
CREATE INDEX IF NOT EXISTS idx_specimen_transfers_to_email ON specimen_transfers (LOWER(to_email));
CREATE INDEX IF NOT EXISTS idx_specimen_transfers_to_user ON specimen_transfers (to_user_id);

-- Lock: at most one pending transfer per passport at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_specimen_transfers_pending
    ON specimen_transfers (passport_id) WHERE status = 'pending';
