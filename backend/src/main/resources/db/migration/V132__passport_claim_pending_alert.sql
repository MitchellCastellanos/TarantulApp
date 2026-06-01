-- Tracks the 2h "claim not confirmed" admin alert so each claim is processed at most once.
ALTER TABLE passports
    ADD COLUMN IF NOT EXISTS claim_pending_alert_sent_at TIMESTAMP NULL;

-- Backfill: existing claims are considered already processed so the job does not flood on first run.
UPDATE passports
   SET claim_pending_alert_sent_at = claimed_at
 WHERE claimed_at IS NOT NULL
   AND claim_pending_alert_sent_at IS NULL;
