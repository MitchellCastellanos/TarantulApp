-- Audit ledger for every Pro day extension. One row per grant; subscription activations
-- (Stripe / Google Play) are NOT recorded here -- they are tracked via the subscriptions table.
-- Sources: REFERRAL_SIGNUP, REFERRAL_MILESTONE, ADMIN, LEGACY_MIGRATION.
CREATE TABLE IF NOT EXISTS pro_day_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    days INT NOT NULL CHECK (days > 0),
    source VARCHAR(40) NOT NULL,
    reason VARCHAR(500),
    granted_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_day_grants_user_granted_at
    ON pro_day_grants (user_id, granted_at DESC);

-- Backfill: users currently on a future trial get a single LEGACY_MIGRATION row crediting
-- the calendar days remaining. Lets the gamification UI render breakdowns on day one
-- without claiming we know which channel originally produced the days.
INSERT INTO pro_day_grants (user_id, days, source, reason, granted_at)
SELECT
    u.id,
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - now())) / 86400)::INT),
    'LEGACY_MIGRATION',
    'Migración inicial al registro de días Pro / Initial pro-day ledger backfill',
    now()
FROM users u
WHERE u.trial_ends_at IS NOT NULL AND u.trial_ends_at > now();
