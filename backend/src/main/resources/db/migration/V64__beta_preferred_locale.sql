ALTER TABLE beta_applications
    ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(8);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS beta_preferred_locale VARCHAR(8);
