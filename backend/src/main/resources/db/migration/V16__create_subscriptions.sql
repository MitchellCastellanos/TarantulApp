-- V16: subscriptions table for billing state
CREATE TABLE subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'stripe',
    provider_customer_id VARCHAR(255),
    provider_subscription_id VARCHAR(255),
    provider_price_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_subscriptions PRIMARY KEY (id),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_subscriptions_provider_subscription_id
    ON subscriptions(provider_subscription_id)
    WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

