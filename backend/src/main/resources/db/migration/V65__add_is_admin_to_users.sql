-- V65: switch admin gating from APP_ADMIN_EMAILS env (CSV) to a per-user DB flag.
-- AdminAccessService keeps APP_ADMIN_EMAILS only as bootstrap: if a user logs in
-- with an email in that list and is_admin=false, AuthService promotes them once.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_admin
    ON users (is_admin)
    WHERE is_admin = true;
