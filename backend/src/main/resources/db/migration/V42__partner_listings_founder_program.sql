set statement_timeout = 0;

alter table official_vendors
    add column if not exists partner_program_tier varchar(40),
    add column if not exists listing_import_enabled boolean not null default false;

create index if not exists idx_official_vendors_partner_program
    on official_vendors(partner_program_tier, listing_import_enabled, enabled);

create table if not exists partner_listings (
    id uuid primary key default gen_random_uuid(),
    official_vendor_id uuid not null references official_vendors(id) on delete cascade,
    external_id varchar(180) not null,
    title varchar(180) not null,
    description varchar(2000),
    species_name_raw varchar(180),
    species_normalized varchar(180),
    species_id integer references species(id) on delete set null,
    price_amount numeric(10,2),
    currency varchar(8) not null default 'USD',
    stock_quantity integer,
    availability varchar(30) not null default 'unknown',
    image_url varchar(600),
    product_canonical_url varchar(600) not null,
    country varchar(80),
    state varchar(80),
    city varchar(80),
    last_synced_at timestamptz not null default now(),
    status varchar(20) not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_partner_listings_vendor_external unique (official_vendor_id, external_id),
    constraint chk_partner_listings_availability check (availability in ('in_stock', 'out_of_stock', 'unknown')),
    constraint chk_partner_listings_status check (status in ('active', 'stale', 'hidden'))
);

create index if not exists idx_partner_listings_vendor_status_synced
    on partner_listings(official_vendor_id, status, last_synced_at desc);

create index if not exists idx_partner_listings_status_synced
    on partner_listings(status, last_synced_at desc);

create index if not exists idx_partner_listings_species_id
    on partner_listings(species_id);

set statement_timeout = default;
