-- Per-user default for new tarantula visibility (Manus F1: unified collection privacy).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_tarantula_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.default_tarantula_public IS
    'When true, newly created tarantulas start with is_public=true for this keeper.';
