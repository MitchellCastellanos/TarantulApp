-- Funnel events (storefront views) and campaign attribution.

ALTER TABLE listing_events
    ALTER COLUMN listing_id DROP NOT NULL;

ALTER TABLE listing_events
    ADD COLUMN IF NOT EXISTS context_key varchar(128);

ALTER TABLE listing_events
    ADD COLUMN IF NOT EXISTS utm_source varchar(64);

ALTER TABLE listing_events
    ADD COLUMN IF NOT EXISTS utm_medium varchar(64);

ALTER TABLE listing_events
    ADD COLUMN IF NOT EXISTS utm_campaign varchar(96);

CREATE INDEX IF NOT EXISTS idx_listing_events_context_kind_occurred
    ON listing_events (context_key, kind, occurred_at DESC)
    WHERE context_key IS NOT NULL;
