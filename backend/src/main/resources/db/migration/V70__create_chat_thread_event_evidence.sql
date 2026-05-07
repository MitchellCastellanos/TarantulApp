CREATE TABLE IF NOT EXISTS chat_thread_event_evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES chat_thread_events(id) ON DELETE CASCADE,
    evidence_url varchar(500) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_event_evidence_event
    ON chat_thread_event_evidence(event_id, created_at ASC);
