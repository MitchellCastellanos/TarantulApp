CREATE TABLE reminders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tarantula_id UUID        REFERENCES tarantulas(id) ON DELETE SET NULL,
    type         VARCHAR(30) NOT NULL DEFAULT 'custom',
    due_date     TIMESTAMPTZ NOT NULL,
    message      VARCHAR(500),
    is_done      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_user ON reminders(user_id, due_date);
