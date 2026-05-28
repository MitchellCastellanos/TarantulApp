-- Allow listing_events for partner_listings (same UUID column, tagged by source).

ALTER TABLE listing_events
    DROP CONSTRAINT IF EXISTS listing_events_listing_id_fkey;

ALTER TABLE listing_events
    ADD COLUMN IF NOT EXISTS listing_source varchar(16) NOT NULL DEFAULT 'peer';

UPDATE listing_events SET listing_source = 'peer' WHERE listing_source IS NULL OR listing_source = '';

CREATE INDEX IF NOT EXISTS idx_listing_events_listing_source_kind_occurred
    ON listing_events (listing_id, listing_source, kind, occurred_at DESC);
