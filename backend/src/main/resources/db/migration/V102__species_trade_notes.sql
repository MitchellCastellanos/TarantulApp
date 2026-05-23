-- C4 — Species trade / shipping compliance notes by destination country.

CREATE TABLE IF NOT EXISTS species_trade_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id integer NOT NULL REFERENCES species (id) ON DELETE CASCADE,
    country varchar(64) NOT NULL,
    cites_appendix varchar(16),
    lacey_status varchar(32),
    notes_md text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_species_trade_notes_species_country UNIQUE (species_id, country)
);

CREATE INDEX IF NOT EXISTS idx_species_trade_notes_species
    ON species_trade_notes (species_id);
