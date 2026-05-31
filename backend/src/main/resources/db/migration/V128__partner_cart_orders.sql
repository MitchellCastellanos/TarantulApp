-- In-app TarantulApp checkout (beta, Canada only): orders a buyer pays for a
-- partner's cart directly inside TarantulApp instead of handing off to the
-- partner website. Funds settle either to the platform (owner-operated stores)
-- or, once Stripe Connect onboarding lands, to the partner minus our commission.
create table if not exists partner_cart_orders (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references official_vendors(id) on delete cascade,
    vendor_slug varchar(120) not null,
    buyer_user_id uuid references users(id) on delete set null,
    buyer_email varchar(255),
    currency varchar(8) not null,
    subtotal numeric(12,2) not null,
    commission_rate numeric(6,4) not null default 0,
    commission_amount numeric(12,2) not null default 0,
    partner_payout_amount numeric(12,2) not null default 0,
    payout_mode varchar(16) not null default 'platform',
    provider varchar(32) not null,
    provider_ref varchar(160),
    status varchar(32) not null default 'payment_pending',
    lines jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_partner_cart_orders_vendor_created
    on partner_cart_orders (vendor_id, created_at desc);

create index if not exists idx_partner_cart_orders_status
    on partner_cart_orders (status);
