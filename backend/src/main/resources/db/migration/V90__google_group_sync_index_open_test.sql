-- Google Group sync retries: index all pending users (open testing — not limited to beta flag).
DROP INDEX IF EXISTS idx_users_google_group_retry;
CREATE INDEX IF NOT EXISTS idx_users_google_group_retry
    ON users (google_group_sync_status)
    WHERE google_group_sync_status IS DISTINCT FROM 'synced';
