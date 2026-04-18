-- Clave GBIF (usageKey) para enlazar importaciones y evitar devolver otra fila por nombre coincidente.
ALTER TABLE species ADD COLUMN gbif_usage_key BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_species_gbif_usage_key ON species (gbif_usage_key)
    WHERE gbif_usage_key IS NOT NULL;
