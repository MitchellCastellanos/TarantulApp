ALTER TABLE marketplace_orders
    ADD COLUMN IF NOT EXISTS buyer_policy_accepted_at timestamptz;
