-- Trust badge "Tienda verificada" — separate from vendor activation (verified_breeder = paid commercial tier).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS storefront_verified_at timestamptz;

COMMENT ON COLUMN users.storefront_verified_at IS 'Non-null when ops approved live/video or async self-verification; distinct from verified_breeder (vendor subscription).';
