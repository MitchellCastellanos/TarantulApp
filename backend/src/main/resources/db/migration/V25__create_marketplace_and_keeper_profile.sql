create table if not exists keeper_profiles (
    user_id uuid primary key references users(id) on delete cascade,
    handle varchar(60),
    bio varchar(500),
    location varchar(140),
    featured_collection varchar(180),
    contact_whatsapp varchar(80),
    contact_instagram varchar(80),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists idx_keeper_profiles_handle_unique
    on keeper_profiles (lower(handle))
    where handle is not null and handle <> '';

create table if not exists marketplace_listings (
    id uuid primary key,
    seller_user_id uuid not null references users(id) on delete cascade,
    title varchar(140) not null,
    description varchar(1000),
    species_name varchar(140),
    stage varchar(30),
    sex varchar(20),
    price_amount numeric(10,2),
    currency varchar(8) not null default 'MXN',
    status varchar(20) not null default 'active',
    city varchar(80),
    country varchar(80),
    image_url varchar(350),
    pedigree_ref varchar(180),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_listings_status_created
    on marketplace_listings(status, created_at desc);

create index if not exists idx_marketplace_listings_seller
    on marketplace_listings(seller_user_id, created_at desc);

create table if not exists seller_reviews (
    id uuid primary key,
    seller_user_id uuid not null references users(id) on delete cascade,
    reviewer_user_id uuid references users(id) on delete set null,
    listing_id uuid references marketplace_listings(id) on delete set null,
    rating smallint not null,
    comment varchar(500),
    created_at timestamptz not null default now(),
    constraint chk_seller_reviews_rating check (rating between 1 and 5)
);

create index if not exists idx_seller_reviews_seller_created
    on seller_reviews(seller_user_id, created_at desc);
