-- Claim hardening: per-passport claim state + business-held claim code.
-- ON_SHELF  = label visible in public (shelf/vitrine); scan shows data but claim needs the seller's code.
-- CLAIMABLE = released for claim (legacy behavior: login is enough).
-- CLAIMED   = custody taken by a keeper (mirrors claimed_at, kept for uniform filtering).
-- VOID      = label invalidated by issuer/admin (lost, stolen, misprint); scan shows notice, never claimable.
ALTER TABLE passports
    ADD COLUMN IF NOT EXISTS claim_status VARCHAR(20) NOT NULL DEFAULT 'CLAIMABLE',
    ADD COLUMN IF NOT EXISTS claim_code VARCHAR(16) NULL,
    ADD COLUMN IF NOT EXISTS claim_released_at TIMESTAMP NULL;

-- Backfill: passports already claimed are CLAIMED; unclaimed ones stay CLAIMABLE so
-- labels already printed and handed to buyers keep working exactly as before.
UPDATE passports
   SET claim_status = 'CLAIMED'
 WHERE claimed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_passports_claim_status ON passports (claim_status);
