-- Brand logo on official_vendors (admin upload when no linked user account)
ALTER TABLE official_vendors
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS logo_bw_url TEXT;
