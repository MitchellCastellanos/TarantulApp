create table if not exists pickup_points (
    id uuid primary key default gen_random_uuid(),
    name varchar(140) not null,
    country varchar(80) not null default 'Canada',
    state varchar(80),
    city varchar(80),
    address_line1 varchar(220),
    postal_code varchar(30),
    timezone varchar(80) not null default 'America/Toronto',
    public_instructions varchar(1000),
    contact_phone varchar(80),
    contact_email varchar(255),
    hold_days integer not null default 3,
    active boolean not null default true,
    admin_notes varchar(1000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_pickup_points_hold_days check (hold_days between 1 and 30)
);

create table if not exists official_vendor_pickup_points (
    id uuid primary key default gen_random_uuid(),
    official_vendor_id uuid not null references official_vendors(id) on delete cascade,
    pickup_point_id uuid not null references pickup_points(id) on delete cascade,
    active boolean not null default true,
    default_for_vendor boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_official_vendor_pickup_point unique (official_vendor_id, pickup_point_id)
);

create table if not exists partner_listing_pickup_points (
    id uuid primary key default gen_random_uuid(),
    partner_listing_id uuid not null references partner_listings(id) on delete cascade,
    pickup_point_id uuid not null references pickup_points(id) on delete cascade,
    constraint uq_partner_listing_pickup_point unique (partner_listing_id, pickup_point_id)
);

alter table partner_cart_orders
    add column if not exists fulfillment_method varchar(32) not null default 'partner_site',
    add column if not exists pickup_point_id uuid references pickup_points(id) on delete set null,
    add column if not exists pickup_snapshot jsonb,
    add column if not exists pickup_hold_until timestamptz;

create index if not exists idx_official_vendor_pickup_points_vendor
    on official_vendor_pickup_points (official_vendor_id);

create index if not exists idx_partner_listing_pickup_points_listing
    on partner_listing_pickup_points (partner_listing_id);

create index if not exists idx_partner_cart_orders_pickup_point
    on partner_cart_orders (pickup_point_id)
    where pickup_point_id is not null;
