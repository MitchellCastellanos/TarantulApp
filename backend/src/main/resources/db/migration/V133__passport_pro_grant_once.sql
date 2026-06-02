-- Anti-abuse: a passport rewards Pro days at most once, even across re-claims/transfers.
-- Marks the moment a PASSPORT_CLAIM Pro grant was issued for this passport.
ALTER TABLE passports
    ADD COLUMN IF NOT EXISTS pro_granted_at TIMESTAMP NULL;

-- Backfill: passports already claimed are assumed to have paid out their Pro grant.
UPDATE passports
   SET pro_granted_at = claimed_at
 WHERE claimed_at IS NOT NULL
   AND pro_granted_at IS NULL;
