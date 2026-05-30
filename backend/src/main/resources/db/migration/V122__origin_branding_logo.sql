-- Phase 1 — Origin/Partner branding: logo storage for non-individual accounts
-- (Verified Origin breeders/stores/vendors/sellers and Official Partners). The
-- monochrome variant is what gets composited onto QR labels emitted by the
-- account; the color logo is used on storefronts and shared item cards.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS logo_bw_url TEXT,
    ADD COLUMN IF NOT EXISTS logo_uploaded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS logo_uploaded_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS logo_use_bw_on_labels BOOLEAN NOT NULL DEFAULT TRUE;
