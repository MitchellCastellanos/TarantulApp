-- Phase 2: passport claim analytics (claims are signals, not inventory truth).
CREATE TABLE IF NOT EXISTS passport_claim_events (
    id                          UUID        NOT NULL DEFAULT gen_random_uuid(),
    passport_id                 UUID        NOT NULL,
    claimed_by_user_id          UUID        NOT NULL,
    pro_grant_id                UUID        NULL,
    feeding_reminder_created    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_passport_claim_events PRIMARY KEY (id),
    CONSTRAINT fk_pce_passport FOREIGN KEY (passport_id) REFERENCES passports(id) ON DELETE CASCADE,
    CONSTRAINT fk_pce_user FOREIGN KEY (claimed_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pce_pro_grant FOREIGN KEY (pro_grant_id) REFERENCES pro_day_grants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_passport_claim_events_passport ON passport_claim_events (passport_id);
CREATE INDEX IF NOT EXISTS idx_passport_claim_events_user ON passport_claim_events (claimed_by_user_id);
