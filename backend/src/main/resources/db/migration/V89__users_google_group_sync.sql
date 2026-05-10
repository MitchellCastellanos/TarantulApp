-- Play Store closed-testing Google Group sync (Admin SDK Directory API).
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_group_sync_status varchar(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_group_sync_last_error varchar(500);

CREATE INDEX IF NOT EXISTS idx_users_google_group_retry
    ON users (is_beta_tester, google_group_sync_status)
    WHERE is_beta_tester = true
      AND google_group_sync_status IS DISTINCT FROM 'synced';
