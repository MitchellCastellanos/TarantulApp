-- A3 — Vendor ships-to: per-user comma-separated list of ISO-3166-1 alpha-2
-- destinations the seller is willing to ship to (e.g. "MX,CA,US"). Null/empty
-- means unconfigured — we treat that as "show in all queries" so vendors that
-- have not yet set their reach are not hidden.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS ships_to varchar(512);

-- GIN-style search would be ideal once we move to a real array column; for now
-- the column is a CSV string and we filter in Java (capped result sets keep
-- this cheap). No index needed yet.
