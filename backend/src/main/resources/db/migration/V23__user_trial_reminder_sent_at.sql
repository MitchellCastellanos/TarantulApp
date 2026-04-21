CREATE TABLE IF NOT EXISTS trial_email_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_trial_email_events PRIMARY KEY (id),
    CONSTRAINT uq_trial_email_events_user_event UNIQUE (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_trial_email_events_user_id
    ON trial_email_events(user_id);
