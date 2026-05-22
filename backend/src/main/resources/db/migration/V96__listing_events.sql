-- A1 — Vendor analytics: anonymous-session-scoped event log per marketplace listing.
-- Kept light: no foreign key onto users (events are anonymous by design), but a
-- cascading FK to marketplace_listings so dropping a listing cleans its events.

CREATE TABLE IF NOT EXISTS listing_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace_listings (id) ON DELETE CASCADE,
    kind varchar(32) NOT NULL,
    anon_session_id varchar(64),
    country varchar(8),
    referrer_host varchar(128),
    actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_events_listing_kind_occurred
    ON listing_events (listing_id, kind, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_events_occurred
    ON listing_events (occurred_at DESC);
