-- App-wide usage analytics: one aggregated row per client session (a "visit").
-- Heartbeats from the client accumulate engaged time and page views onto the same
-- row (keyed by session_id), so the table stays small — one row per visit, not per
-- request. No raw IP is ever stored; country/city are resolved at write time from
-- edge geo headers when present, otherwise from the client IANA timezone.
--
-- user_id is nullable (anonymous visitors are counted too) and uses ON DELETE SET NULL
-- so deleting a user keeps the aggregate counts intact while dropping the linkage.

CREATE TABLE IF NOT EXISTS app_visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id varchar(64) NOT NULL,
    user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    duration_seconds bigint NOT NULL DEFAULT 0,
    page_views integer NOT NULL DEFAULT 1,
    country varchar(80),
    country_code varchar(8),
    city varchar(120),
    region varchar(120),
    timezone varchar(64),
    locale varchar(16),
    platform varchar(16),
    app_version varchar(40),
    landing_path varchar(300),
    referrer_host varchar(160),
    CONSTRAINT uq_app_visits_session UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_app_visits_first_seen ON app_visits (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_visits_last_seen ON app_visits (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_visits_country ON app_visits (country);
CREATE INDEX IF NOT EXISTS idx_app_visits_user ON app_visits (user_id);
