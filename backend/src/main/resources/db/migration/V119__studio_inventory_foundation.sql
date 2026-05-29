-- Phase 3: Studio workspace + inventory batches (user-facing "Batch").

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS passport_creator_enabled_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS studio_activated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN users.passport_creator_enabled_at IS
    'When set, user may create batches and generate passports in Studio.';
COMMENT ON COLUMN users.studio_activated_at IS
    'When set, Studio appears in primary navigation for this keeper.';

-- Verified commercial sellers can create passports by default.
UPDATE users
SET passport_creator_enabled_at = COALESCE(verified_breeder_at, NOW())
WHERE verified_breeder = TRUE
  AND passport_creator_enabled_at IS NULL;

CREATE TABLE IF NOT EXISTS inventory_batches (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL,
    species_id       INT          NULL,
    name             VARCHAR(120) NOT NULL,
    quantity_total   INT          NOT NULL DEFAULT 0,
    quantity_sold    INT          NOT NULL DEFAULT 0,
    notes            TEXT         NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_inventory_batches PRIMARY KEY (id),
    CONSTRAINT fk_inventory_batches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_batches_species FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL,
    CONSTRAINT chk_inventory_batches_qty_total CHECK (quantity_total >= 0),
    CONSTRAINT chk_inventory_batches_qty_sold CHECK (quantity_sold >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_user ON inventory_batches (user_id);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id           UUID         NOT NULL DEFAULT gen_random_uuid(),
    batch_id     UUID         NOT NULL,
    user_id      UUID         NOT NULL,
    delta_sold   INT          NOT NULL DEFAULT 0,
    delta_total  INT          NOT NULL DEFAULT 0,
    reason       VARCHAR(40)  NOT NULL DEFAULT 'MANUAL',
    notes        TEXT         NULL,
    passport_id  UUID         NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_inventory_adjustments PRIMARY KEY (id),
    CONSTRAINT fk_inventory_adjustments_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_adjustments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_adjustments_passport FOREIGN KEY (passport_id) REFERENCES passports(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_batch ON inventory_adjustments (batch_id);

ALTER TABLE passports
    ADD COLUMN IF NOT EXISTS batch_id UUID NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_passports_batch'
    ) THEN
        ALTER TABLE passports
            ADD CONSTRAINT fk_passports_batch
            FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_passports_batch_id ON passports (batch_id);
