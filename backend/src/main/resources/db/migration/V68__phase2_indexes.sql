-- V68: targeted indexes added during Phase 2 capacity audit. Existing migrations already cover
-- the high-traffic paths (activity_posts, chat_messages, notifications, marketplace_listings),
-- so this migration only fills the gaps surfaced by the index audit:
--
-- 1) tarantulas filtered indexes for the two dashboard hot queries
--    (user collection minus deceased; public discover catalog).
-- 2) referral_redemptions reverse lookup by referee (used by ReferralService when crediting
--    bonuses to the user who got invited; existing index covers referrer side).
-- 3) marketplace_listings composite (seller + status) for keeper profile queries.

CREATE INDEX IF NOT EXISTS idx_tarantulas_user_alive
    ON public.tarantulas (user_id)
    WHERE deceased_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tarantulas_public
    ON public.tarantulas (created_at DESC)
    WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referee
    ON public.referral_redemptions (referee_user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_status
    ON public.marketplace_listings (seller_user_id, status, created_at DESC);
