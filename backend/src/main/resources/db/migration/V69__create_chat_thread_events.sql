CREATE TABLE IF NOT EXISTS chat_thread_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    event_type varchar(40) NOT NULL,
    event_status varchar(24),
    note varchar(1000),
    evidence_url varchar(500),
    created_by_user_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_events_thread_created
    ON chat_thread_events(thread_id, created_at DESC);
