CREATE TABLE newsletter_drafts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID NOT NULL REFERENCES users (id),
    title           VARCHAR(200) NOT NULL,
    body_html       TEXT NOT NULL,
    listing_ids     JSONB,
    sent_at         TIMESTAMPTZ,
    recipient_count INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_drafts_admin ON newsletter_drafts (admin_user_id, created_at DESC);

CREATE TABLE newsletter_subscriptions (
    user_id          UUID PRIMARY KEY REFERENCES users (id),
    subscribed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at  TIMESTAMPTZ
);

CREATE INDEX idx_newsletter_subscriptions_active
    ON newsletter_subscriptions (subscribed_at DESC)
    WHERE unsubscribed_at IS NULL;
