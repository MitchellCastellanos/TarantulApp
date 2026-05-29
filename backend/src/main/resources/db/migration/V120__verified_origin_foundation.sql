-- Verified Origin trust layer (separate from Official Partner and verified_breeder commercial tier).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS verified_origin_at timestamptz,
    ADD COLUMN IF NOT EXISTS verified_origin_kind varchar(20),
    ADD COLUMN IF NOT EXISTS origin_trust_score integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.verified_origin_at IS 'Public Verified Origin badge; distinct from official partner and verified_breeder.';
COMMENT ON COLUMN users.verified_origin_kind IS 'Display-only: BREEDER, STORE, VENDOR, SELLER.';
COMMENT ON COLUMN users.origin_trust_score IS 'Internal ops signal; never exposed in public DTOs.';

UPDATE users
SET verified_origin_at = storefront_verified_at,
    verified_origin_kind = CASE
        WHEN verified_breeder = true THEN 'VENDOR'
        ELSE 'SELLER'
    END
WHERE storefront_verified_at IS NOT NULL
  AND verified_origin_at IS NULL;

CREATE TABLE IF NOT EXISTS origin_verification_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,
    note VARCHAR(1000),
    evidence_url VARCHAR(600),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewer_note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT chk_origin_verification_kind CHECK (kind IN ('BREEDER', 'STORE', 'VENDOR', 'SELLER')),
    CONSTRAINT chk_origin_verification_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_origin_verification_user_created
    ON origin_verification_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_origin_verification_status
    ON origin_verification_submissions (status, created_at DESC);
