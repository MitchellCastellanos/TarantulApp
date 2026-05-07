create table if not exists marketplace_orders (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null unique references chat_threads(id) on delete cascade,
    listing_id uuid not null references marketplace_listings(id) on delete cascade,
    buyer_user_id uuid not null references users(id) on delete cascade,
    seller_user_id uuid not null references users(id) on delete cascade,
    currency varchar(8) not null,
    subtotal numeric(12,2) not null,
    commission_rate numeric(6,4) not null,
    commission_amount numeric(12,2) not null,
    seller_payout_amount numeric(12,2) not null,
    status varchar(32) not null,
    hold_release_at timestamptz,
    provider varchar(32),
    provider_ref varchar(120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_orders_buyer_created
    on marketplace_orders (buyer_user_id, created_at desc);

create index if not exists idx_marketplace_orders_seller_created
    on marketplace_orders (seller_user_id, created_at desc);

create index if not exists idx_marketplace_orders_status
    on marketplace_orders (status);
