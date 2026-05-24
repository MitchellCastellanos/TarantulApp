-- Public-by-default policy for keeper specimens + spotlight timestamp for community carousel.

ALTER TABLE tarantulas
    ADD COLUMN IF NOT EXISTS spotlight_at TIMESTAMP;

COMMENT ON COLUMN tarantulas.spotlight_at IS
    'Updated when a photo is added; used to prioritize the community spotlight carousel.';

ALTER TABLE tarantulas
    ALTER COLUMN is_public SET DEFAULT TRUE;

ALTER TABLE users
    ALTER COLUMN default_tarantula_public SET DEFAULT TRUE;

UPDATE tarantulas SET is_public = TRUE WHERE is_public = FALSE;

UPDATE users SET default_tarantula_public = TRUE WHERE default_tarantula_public = FALSE;

UPDATE tarantulas t
SET spotlight_at = t.created_at
WHERE spotlight_at IS NULL
  AND (
    (t.profile_photo IS NOT NULL AND LENGTH(TRIM(t.profile_photo)) > 0)
    OR EXISTS (SELECT 1 FROM photos p WHERE p.tarantula_id = t.id)
  );
