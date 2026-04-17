-- Optional per-locale narratives (temperament, substrate, careNotes) as JSON object-of-maps.
ALTER TABLE species ADD COLUMN narrative_i18n TEXT NULL;
