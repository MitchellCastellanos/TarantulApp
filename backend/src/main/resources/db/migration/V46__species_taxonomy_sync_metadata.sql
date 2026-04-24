ALTER TABLE species
    ADD COLUMN IF NOT EXISTS taxonomy_last_synced_at TIMESTAMP NULL;

ALTER TABLE species
    ADD COLUMN IF NOT EXISTS care_profile_source VARCHAR(60) NULL;

ALTER TABLE species
    ADD COLUMN IF NOT EXISTS care_profile_confidence NUMERIC(3,2) NULL;

