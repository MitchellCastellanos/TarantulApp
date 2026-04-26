-- =============================================================================
-- TarantulApp — catch-up idempotente Flyway V26 a V46 (PostgreSQL / Supabase)
-- =============================================================================
-- Misma logica: backend/src/main/resources/db/migration/V26..V46
-- No modifica flyway_schema_history. Tras correr, redeploy backend (Railway).
-- =============================================================================

SET statement_timeout = 0;

-- === V26__add_public_profile_fields_to_users.sql =================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_handle varchar(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio varchar(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location varchar(140);
ALTER TABLE users ADD COLUMN IF NOT EXISTS featured_collection varchar(180);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_whatsapp varchar(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_instagram varchar(80);

UPDATE users u
SET
    public_handle = kp.handle,
    bio = kp.bio,
    location = kp.location,
    featured_collection = kp.featured_collection,
    contact_whatsapp = kp.contact_whatsapp,
    contact_instagram = kp.contact_instagram
FROM keeper_profiles kp
WHERE kp.user_id = u.id
  AND (
      u.public_handle IS NULL
      OR u.bio IS NULL
      OR u.location IS NULL
      OR u.featured_collection IS NULL
      OR u.contact_whatsapp IS NULL
      OR u.contact_instagram IS NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_handle_unique
    ON users (lower(public_handle))
    WHERE public_handle IS NOT NULL AND public_handle <> '';

-- === V27__marketplace_location_and_usage_fields.sql ============================
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS state varchar(80);

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_country varchar(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_state varchar(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_city varchar(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_print_exports integer NOT NULL DEFAULT 0;

-- === V28__user_profile_photo.sql =================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo varchar(500);

-- === V29__official_vendors.sql =====================================================
CREATE TABLE IF NOT EXISTS official_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(120) NOT NULL UNIQUE,
  name varchar(140) NOT NULL,
  country varchar(80) NOT NULL,
  state varchar(80),
  city varchar(80),
  website_url varchar(350) NOT NULL,
  national_shipping boolean NOT NULL DEFAULT false,
  ships_to_countries varchar(350),
  influence_score integer NOT NULL DEFAULT 0,
  note varchar(200),
  badge varchar(80),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS official_vendor_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name varchar(140) NOT NULL,
  contact_name varchar(120),
  contact_email varchar(255) NOT NULL,
  website_url varchar(350),
  country varchar(80),
  state varchar(80),
  city varchar(80),
  shipping_scope varchar(80),
  note varchar(1200),
  status varchar(30) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_official_vendors_enabled ON official_vendors(enabled, influence_score DESC);
CREATE INDEX IF NOT EXISTS idx_official_vendor_leads_created ON official_vendor_leads(created_at DESC);

-- === V30__social_chat_referrals.sql ===============================================
CREATE TABLE IF NOT EXISTS activity_posts (
    id uuid PRIMARY KEY,
    author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body varchar(2000) NOT NULL,
    visibility varchar(20) NOT NULL DEFAULT 'private',
    milestone_kind varchar(40),
    image_url varchar(500),
    tarantula_id uuid REFERENCES tarantulas(id) ON DELETE SET NULL,
    hidden_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_activity_posts_visibility CHECK (visibility IN ('private', 'followers', 'public'))
);

CREATE INDEX IF NOT EXISTS idx_activity_posts_author_created
    ON activity_posts(author_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_posts_public_feed
    ON activity_posts(created_at DESC)
    WHERE visibility = 'public' AND hidden_at IS NULL;

CREATE TABLE IF NOT EXISTS chat_threads (
    id uuid PRIMARY KEY,
    user_low uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_high uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES marketplace_listings(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_chat_threads_distinct CHECK (user_low <> user_high),
    CONSTRAINT chk_chat_threads_order CHECK (user_low::text < user_high::text)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_threads_pair_dm
    ON chat_threads(user_low, user_high)
    WHERE listing_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_threads_pair_listing
    ON chat_threads(user_low, user_high, listing_id)
    WHERE listing_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY,
    thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body varchar(4000) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
    ON chat_messages(thread_id, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS referral_codes (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code varchar(24) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_code_lower
    ON referral_codes(lower(code));

CREATE TABLE IF NOT EXISTS referral_redemptions (
    id uuid PRIMARY KEY,
    referrer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code_snapshot varchar(24) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referrer
    ON referral_redemptions(referrer_user_id, created_at DESC);

-- === V31__activity_likes_comments.sql ============================================
CREATE TABLE IF NOT EXISTS activity_post_likes (
    id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES activity_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_post_likes_post_user UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_post_likes_post ON activity_post_likes(post_id);

CREATE TABLE IF NOT EXISTS activity_post_comments (
    id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES activity_posts(id) ON DELETE CASCADE,
    author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body varchar(1500) NOT NULL,
    hidden_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_post_comments_post_created
    ON activity_post_comments(post_id, created_at ASC);

-- === V32__users_referred_by_user_id.sql =========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL;

-- === V33__users_referral_milestones.sql =========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_milestone_mask integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_keeper boolean NOT NULL DEFAULT false;

-- === V34__sex_id_cases.sql =======================================================
CREATE TABLE IF NOT EXISTS sex_id_cases (
    id uuid PRIMARY KEY,
    author_user_id uuid NOT NULL REFERENCES users (id),
    title varchar(200),
    image_url varchar(500) NOT NULL,
    species_hint varchar(200),
    hidden_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sex_id_cases_author_created
    ON sex_id_cases (author_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sex_id_cases_public_feed
    ON sex_id_cases (created_at DESC)
    WHERE hidden_at IS NULL;

CREATE TABLE IF NOT EXISTS sex_id_case_votes (
    id uuid PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES sex_id_cases (id) ON DELETE CASCADE,
    voter_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    choice varchar(20) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_sex_id_case_votes_one_per_user UNIQUE (case_id, voter_user_id),
    CONSTRAINT chk_sex_id_case_votes_choice CHECK (choice IN ('MALE', 'FEMALE', 'UNCERTAIN'))
);

CREATE INDEX IF NOT EXISTS idx_sex_id_case_votes_case ON sex_id_case_votes (case_id);

-- === V35__marketplace_listing_boost.sql ========================================
ALTER TABLE marketplace_listings
    ADD COLUMN IF NOT EXISTS boosted_until timestamptz;

-- === V36__ensure_sex_id_cases_exists.sql =========================================
CREATE TABLE IF NOT EXISTS sex_id_cases (
    id uuid PRIMARY KEY,
    author_user_id uuid NOT NULL REFERENCES users (id),
    title varchar(200),
    image_url varchar(500) NOT NULL,
    species_hint varchar(200),
    hidden_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sex_id_cases_author_created
    ON sex_id_cases (author_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sex_id_cases_public_feed
    ON sex_id_cases (created_at DESC)
    WHERE hidden_at IS NULL;

CREATE TABLE IF NOT EXISTS sex_id_case_votes (
    id uuid PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES sex_id_cases (id) ON DELETE CASCADE,
    voter_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    choice varchar(20) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_sex_id_case_votes_one_per_user UNIQUE (case_id, voter_user_id),
    CONSTRAINT chk_sex_id_case_votes_choice CHECK (choice IN ('MALE', 'FEMALE', 'UNCERTAIN'))
);

CREATE INDEX IF NOT EXISTS idx_sex_id_case_votes_case ON sex_id_case_votes (case_id);

-- === V37__sex_id_case_ai_fields.sql =============================================
ALTER TABLE IF EXISTS sex_id_cases
    ADD COLUMN IF NOT EXISTS stage varchar(20),
    ADD COLUMN IF NOT EXISTS image_type varchar(20),
    ADD COLUMN IF NOT EXISTS ai_male_probability double precision,
    ADD COLUMN IF NOT EXISTS ai_confidence double precision,
    ADD COLUMN IF NOT EXISTS ai_confidence_label varchar(20),
    ADD COLUMN IF NOT EXISTS ai_explanation varchar(800);

-- === V38__ensure_sex_id_ai_columns_exist.sql =====================================
ALTER TABLE IF EXISTS sex_id_cases ADD COLUMN IF NOT EXISTS stage varchar(20);
ALTER TABLE IF EXISTS sex_id_cases ADD COLUMN IF NOT EXISTS image_type varchar(20);
ALTER TABLE IF EXISTS sex_id_cases ADD COLUMN IF NOT EXISTS ai_male_probability double precision;
ALTER TABLE IF EXISTS sex_id_cases ADD COLUMN IF NOT EXISTS ai_confidence double precision;
ALTER TABLE IF EXISTS sex_id_cases ADD COLUMN IF NOT EXISTS ai_confidence_label varchar(20);
ALTER TABLE IF EXISTS sex_id_cases ADD COLUMN IF NOT EXISTS ai_explanation varchar(800);

-- === V39__community_profiles_notifications_baseline.sql =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS search_visible boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    type varchar(40) NOT NULL,
    title varchar(160),
    body varchar(600),
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

-- === V40__launch_event_registration.sql ==========================================
CREATE TABLE IF NOT EXISTS public.launch_event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name varchar(140) NOT NULL,
    email varchar(255) NOT NULL,
    phone varchar(40) NOT NULL,
    owns_tarantulas boolean NOT NULL,
    tarantula_count integer,
    will_attend boolean NOT NULL DEFAULT true,
    bring_collection_info boolean NOT NULL DEFAULT false,
    reminder_opt_in boolean NOT NULL DEFAULT false,
    newsletter_opt_in boolean NOT NULL DEFAULT false,
    status varchar(20) NOT NULL,
    reservation_index integer,
    language varchar(8) NOT NULL DEFAULT 'en',
    source_path varchar(80),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT launch_event_registrations_status_chk
        CHECK (status IN ('RESERVED', 'WAITLIST')),
    CONSTRAINT launch_event_registrations_count_chk
        CHECK (tarantula_count IS NULL OR tarantula_count >= 0),
    CONSTRAINT launch_event_registrations_reservation_chk
        CHECK (
            (status = 'RESERVED' AND reservation_index IS NOT NULL AND reservation_index BETWEEN 1 AND 45)
            OR (status = 'WAITLIST' AND reservation_index IS NULL)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_launch_event_registrations_email_lower
    ON public.launch_event_registrations ((lower(email)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_launch_event_registrations_reservation_index
    ON public.launch_event_registrations (reservation_index)
    WHERE reservation_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_launch_event_registrations_status_created
    ON public.launch_event_registrations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.launch_event_email_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL REFERENCES public.launch_event_registrations(id) ON DELETE CASCADE,
    event_key varchar(80) NOT NULL,
    sent_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT launch_event_email_events_unique UNIQUE (registration_id, event_key)
);

CREATE INDEX IF NOT EXISTS ix_launch_event_email_events_event_key
    ON public.launch_event_email_events (event_key, sent_at DESC);

-- === V41__launch_event_capacity_50_and_future_interest.sql =====================
ALTER TABLE public.launch_event_registrations
    DROP CONSTRAINT IF EXISTS launch_event_registrations_reservation_chk;

ALTER TABLE public.launch_event_registrations
    ADD CONSTRAINT launch_event_registrations_reservation_chk CHECK (
        (status = 'RESERVED' AND reservation_index IS NOT NULL AND reservation_index BETWEEN 1 AND 50)
        OR (status = 'WAITLIST' AND reservation_index IS NULL)
    );

CREATE TABLE IF NOT EXISTS public.launch_event_future_interest (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) NOT NULL,
    language varchar(8) NOT NULL DEFAULT 'en',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_launch_event_future_interest_email_lower
    ON public.launch_event_future_interest (lower(email));

CREATE INDEX IF NOT EXISTS ix_launch_event_future_interest_created
    ON public.launch_event_future_interest (created_at DESC);

-- === V42__partner_listings_founder_program.sql =================================
ALTER TABLE official_vendors
    ADD COLUMN IF NOT EXISTS partner_program_tier varchar(40),
    ADD COLUMN IF NOT EXISTS listing_import_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_official_vendors_partner_program
    ON official_vendors(partner_program_tier, listing_import_enabled, enabled);

CREATE TABLE IF NOT EXISTS partner_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    official_vendor_id uuid NOT NULL REFERENCES official_vendors(id) ON DELETE CASCADE,
    external_id varchar(180) NOT NULL,
    title varchar(180) NOT NULL,
    description varchar(2000),
    species_name_raw varchar(180),
    species_normalized varchar(180),
    species_id integer REFERENCES species(id) ON DELETE SET NULL,
    price_amount numeric(10,2),
    currency varchar(8) NOT NULL DEFAULT 'USD',
    stock_quantity integer,
    availability varchar(30) NOT NULL DEFAULT 'unknown',
    image_url varchar(600),
    product_canonical_url varchar(600) NOT NULL,
    country varchar(80),
    state varchar(80),
    city varchar(80),
    last_synced_at timestamptz NOT NULL DEFAULT now(),
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_partner_listings_vendor_external UNIQUE (official_vendor_id, external_id),
    CONSTRAINT chk_partner_listings_availability CHECK (availability IN ('in_stock', 'out_of_stock', 'unknown')),
    CONSTRAINT chk_partner_listings_status CHECK (status IN ('active', 'stale', 'hidden'))
);

CREATE INDEX IF NOT EXISTS idx_partner_listings_vendor_status_synced
    ON partner_listings(official_vendor_id, status, last_synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_listings_status_synced
    ON partner_listings(status, last_synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_listings_species_id
    ON partner_listings(species_id);

-- === V43__partner_listing_sync_runs.sql ==========================================
CREATE TABLE IF NOT EXISTS partner_listing_sync_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    official_vendor_id uuid NOT NULL REFERENCES official_vendors(id) ON DELETE CASCADE,
    trigger_source varchar(40) NOT NULL,
    status varchar(20) NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    processed_count integer NOT NULL DEFAULT 0,
    upserted_count integer NOT NULL DEFAULT 0,
    stale_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    skipped_count integer NOT NULL DEFAULT 0,
    error_message varchar(1500),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_partner_sync_runs_status CHECK (status IN ('running', 'success', 'partial', 'failed')),
    CONSTRAINT chk_partner_sync_runs_trigger CHECK (trigger_source IN ('scheduler', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_partner_sync_runs_vendor_started
    ON partner_listing_sync_runs(official_vendor_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_sync_runs_status_started
    ON partner_listing_sync_runs(status, started_at DESC);

-- === V44__community_visibility_and_profile_flags.sql ============================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS community_profile_visibility varchar(20) NOT NULL DEFAULT 'preview_only';

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_community_profile_visibility;

ALTER TABLE users
    ADD CONSTRAINT chk_users_community_profile_visibility
    CHECK (community_profile_visibility IN ('public_full', 'preview_only', 'private'));

ALTER TABLE activity_posts
    DROP CONSTRAINT IF EXISTS chk_activity_posts_visibility;

ALTER TABLE activity_posts
    ADD CONSTRAINT chk_activity_posts_visibility
    CHECK (visibility IN ('private', 'public'));

-- === V45__community_moderation_traces_and_rate_limits.sql ========================
CREATE TABLE IF NOT EXISTS community_moderation_traces (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type varchar(30) NOT NULL,
    action varchar(20) NOT NULL,
    reason varchar(80) NOT NULL,
    content_preview varchar(240),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_mod_traces_user_created
    ON community_moderation_traces(user_id, created_at DESC);

-- === V46__species_taxonomy_sync_metadata.sql =====================================
ALTER TABLE species
    ADD COLUMN IF NOT EXISTS taxonomy_last_synced_at TIMESTAMP NULL;

ALTER TABLE species
    ADD COLUMN IF NOT EXISTS care_profile_source VARCHAR(60) NULL;

ALTER TABLE species
    ADD COLUMN IF NOT EXISTS care_profile_confidence NUMERIC(3,2) NULL;

SET statement_timeout = DEFAULT;

-- Verificacion opcional
SELECT 'partner_listings' AS t, to_regclass('public.partner_listings') IS NOT NULL AS ok
UNION ALL
SELECT 'partner_listing_sync_runs', to_regclass('public.partner_listing_sync_runs') IS NOT NULL
UNION ALL
SELECT 'notifications', to_regclass('public.notifications') IS NOT NULL;
