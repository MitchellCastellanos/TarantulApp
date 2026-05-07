ALTER TABLE users
    ADD COLUMN IF NOT EXISTS verified_breeder boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS verified_breeder_at timestamptz;
