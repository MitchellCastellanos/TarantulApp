CREATE TABLE IF NOT EXISTS beta_applications (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(120),
    country VARCHAR(80),
    experience_level VARCHAR(40),
    devices TEXT,
    notes TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    approved_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beta_applications_status_created_at
    ON beta_applications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_applications_email
    ON beta_applications(email);
