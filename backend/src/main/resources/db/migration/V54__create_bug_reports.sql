CREATE TABLE IF NOT EXISTS bug_reports (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    severity VARCHAR(16) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    expected_behavior TEXT,
    current_url VARCHAR(500),
    user_agent VARCHAR(700),
    viewport VARCHAR(80),
    app_version VARCHAR(80),
    screenshot_url VARCHAR(700),
    status VARCHAR(24) NOT NULL DEFAULT 'open',
    resolution_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status_created_at
    ON bug_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bug_reports_user_created_at
    ON bug_reports(user_id, created_at DESC);
