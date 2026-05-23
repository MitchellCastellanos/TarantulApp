-- A4 — Species wishlist: per-user opt-in to be alerted when a marketplace
-- listing matching the species name appears. One row per (user, species).
-- last_notified_at is updated when a push fires so we can de-dupe inside a
-- rolling window in code (avoid pinging the same watcher repeatedly for the
-- same species when a vendor uploads a batch).

CREATE TABLE IF NOT EXISTS species_watches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    species_id integer NOT NULL REFERENCES species (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_notified_at timestamptz,
    CONSTRAINT uq_species_watches_user_species UNIQUE (user_id, species_id)
);

CREATE INDEX IF NOT EXISTS idx_species_watches_species
    ON species_watches (species_id);

CREATE INDEX IF NOT EXISTS idx_species_watches_user_created
    ON species_watches (user_id, created_at DESC);
