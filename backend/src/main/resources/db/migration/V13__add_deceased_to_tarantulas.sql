-- V13: soporte para tarántulas fallecidas
ALTER TABLE tarantulas ADD COLUMN deceased_at  TIMESTAMP NULL;
ALTER TABLE tarantulas ADD COLUMN death_notes  TEXT      NULL;
