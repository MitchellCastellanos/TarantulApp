-- Phase 4 — Taxonomy gaps: record species names referenced by the platform (e.g. partner
-- catalog sync) that are not yet in the taxonomic catalog, so an admin gets alerted and can
-- add them manually.

CREATE TABLE IF NOT EXISTS species_gap_reports (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    normalized_name  VARCHAR(180) NOT NULL,
    sample_raw_name  VARCHAR(180) NULL,
    source           VARCHAR(40)  NOT NULL DEFAULT 'partner_sync',
    occurrences      INT          NOT NULL DEFAULT 1,
    status           VARCHAR(20)  NOT NULL DEFAULT 'open',
    resolved_species_id INT       NULL,
    note             VARCHAR(500) NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_seen_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at      TIMESTAMPTZ  NULL,
    CONSTRAINT pk_species_gap_reports PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_species_gap_reports_name
    ON species_gap_reports (LOWER(normalized_name));
CREATE INDEX IF NOT EXISTS idx_species_gap_reports_status ON species_gap_reports (status);
