ALTER TABLE seller_reviews
    ADD COLUMN IF NOT EXISTS chat_thread_id UUID REFERENCES chat_threads (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_reviews_chat_thread
    ON seller_reviews (chat_thread_id)
    WHERE chat_thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seller_reviews_thread
    ON seller_reviews (chat_thread_id);
