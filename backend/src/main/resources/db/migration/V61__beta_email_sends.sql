-- Log outbound beta campaign emails (welcome, weekly missions, etc.) for admin audit and UI status.

CREATE TABLE beta_email_sends (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    campaign_key VARCHAR(64) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locale VARCHAR(8)
);

CREATE INDEX idx_beta_email_sends_user_id ON beta_email_sends (user_id);
CREATE INDEX idx_beta_email_sends_campaign ON beta_email_sends (campaign_key);
