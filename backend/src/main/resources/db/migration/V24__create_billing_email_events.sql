CREATE TABLE IF NOT EXISTS billing_email_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_key VARCHAR(255) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_billing_email_events PRIMARY KEY (id),
    CONSTRAINT uq_billing_email_events_event_key UNIQUE (event_key)
);

CREATE INDEX IF NOT EXISTS idx_billing_email_events_user_id
    ON billing_email_events(user_id);
