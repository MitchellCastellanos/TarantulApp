-- Peer vendor onboarding: admin sends invite link; user accepts while logged in before verified_breeder is set.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS vendor_invite_token UUID UNIQUE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS vendor_invite_sent_at TIMESTAMPTZ;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS vendor_invite_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_vendor_invite_token
    ON users (vendor_invite_token)
    WHERE vendor_invite_token IS NOT NULL;
