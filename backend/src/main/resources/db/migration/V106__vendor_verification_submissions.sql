CREATE TABLE IF NOT EXISTS vendor_verification_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    selfie_media_url VARCHAR(600),
    inventory_media_url VARCHAR(600),
    paper_media_url VARCHAR(600),
    reviewer_note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT chk_vendor_verification_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_verification_user_created
    ON vendor_verification_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_verification_status
    ON vendor_verification_submissions (status, created_at DESC);
