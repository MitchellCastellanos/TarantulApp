-- V63: Pre-molt signs checklist and complication tracking on molt logs
ALTER TABLE molt_logs
  ADD COLUMN successful        BOOLEAN      NULL,
  ADD COLUMN complication_type VARCHAR(50)  NULL,
  ADD COLUMN duration_minutes  INTEGER      NULL,
  ADD COLUMN pre_molt_signs    TEXT         NULL;

COMMENT ON COLUMN molt_logs.successful        IS 'true = clean molt, false = had complications, null = not recorded';
COMMENT ON COLUMN molt_logs.complication_type IS 'dysecdysis | limb_loss | partial_shed | prolonged | other';
COMMENT ON COLUMN molt_logs.duration_minutes  IS 'How long the molt process took in minutes';
COMMENT ON COLUMN molt_logs.pre_molt_signs    IS 'JSON array of observed pre-molt signs, e.g. ["dark_abdomen","refused_food"]';
