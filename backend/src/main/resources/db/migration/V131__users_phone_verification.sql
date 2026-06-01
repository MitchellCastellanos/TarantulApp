-- Phone verification (Twilio Verify) + batch-issuer terms acceptance.
-- Required for users who issue branded labels in batch or anything other than a P2P transfer.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_e164                     VARCHAR(20)  NULL,
    ADD COLUMN IF NOT EXISTS phone_verified_at              TIMESTAMP    NULL,
    ADD COLUMN IF NOT EXISTS phone_verify_attempts          INT          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS phone_verify_last_sent_at      TIMESTAMP    NULL,
    ADD COLUMN IF NOT EXISTS batch_issuer_terms_accepted_at TIMESTAMP    NULL;
