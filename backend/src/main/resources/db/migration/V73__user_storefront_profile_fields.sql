ALTER TABLE users
    ADD COLUMN IF NOT EXISTS storefront_name varchar(120),
    ADD COLUMN IF NOT EXISTS storefront_tagline varchar(180),
    ADD COLUMN IF NOT EXISTS storefront_shipping_policy varchar(1000),
    ADD COLUMN IF NOT EXISTS storefront_lag_policy varchar(1000);
