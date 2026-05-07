ALTER TABLE chat_threads
    ADD COLUMN IF NOT EXISTS transaction_status varchar(24),
    ADD COLUMN IF NOT EXISTS transaction_status_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS transaction_status_updated_by_user_id uuid;
