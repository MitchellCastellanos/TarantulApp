-- Per-user preferred locale for transactional emails (Pro grants, receipts, etc.).
-- Independent from beta_preferred_locale (which is gated to beta-program emails).
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(8);

-- Seed from beta_preferred_locale where the user already opted in, so the first
-- transactional email after rollout matches what they previously received.
UPDATE users SET preferred_locale = beta_preferred_locale
WHERE preferred_locale IS NULL AND beta_preferred_locale IS NOT NULL AND beta_preferred_locale <> '';
