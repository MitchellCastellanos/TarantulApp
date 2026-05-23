-- C2 — Top Vendor of the Month: monthly leaderboard snapshots.

CREATE TABLE IF NOT EXISTS top_vendors_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year varchar(7) NOT NULL,
    rank smallint NOT NULL,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    contact_tap_rate numeric(10, 6) NOT NULL DEFAULT 0,
    views_30d bigint NOT NULL DEFAULT 0,
    contact_taps_30d bigint NOT NULL DEFAULT 0,
    computed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_top_vendors_history_month_rank UNIQUE (month_year, rank),
    CONSTRAINT uq_top_vendors_history_month_user UNIQUE (month_year, user_id)
);

CREATE INDEX IF NOT EXISTS idx_top_vendors_history_month
    ON top_vendors_history (month_year, rank);
