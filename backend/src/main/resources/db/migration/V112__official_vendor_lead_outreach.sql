-- Admin partner outreach: qualification checklist, locale, Woo probe, notes.

ALTER TABLE official_vendor_leads
    ADD COLUMN IF NOT EXISTS outreach_locale VARCHAR(8) NOT NULL DEFAULT 'en';

ALTER TABLE official_vendor_leads
    ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE official_vendor_leads
    ADD COLUMN IF NOT EXISTS qualification JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE official_vendor_leads
    ADD COLUMN IF NOT EXISTS woo_probe_status VARCHAR(40);

ALTER TABLE official_vendor_leads
    ADD COLUMN IF NOT EXISTS woo_probe_detail VARCHAR(500);

ALTER TABLE official_vendor_leads
    ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ;

COMMENT ON COLUMN official_vendor_leads.qualification IS
    'Admin checklist: wooCommerce, catalogRelevant, shippingFit, legalSent, demoSent, readyToPromote (booleans).';
