CREATE TABLE IF NOT EXISTS marketplace_order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES marketplace_orders (id) ON DELETE CASCADE,
    actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    event_type varchar(48) NOT NULL,
    from_status varchar(32),
    to_status varchar(32),
    payload text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_order_events_order_created
    ON marketplace_order_events (order_id, created_at ASC);
