-- Social posts (marketplace profile visibility is separate)
create table if not exists activity_posts (
    id uuid primary key,
    author_user_id uuid not null references users(id) on delete cascade,
    body varchar(2000) not null,
    visibility varchar(20) not null default 'private',
    milestone_kind varchar(40),
    image_url varchar(500),
    tarantula_id uuid references tarantulas(id) on delete set null,
    hidden_at timestamptz,
    created_at timestamptz not null default now(),
    constraint chk_activity_posts_visibility check (visibility in ('private', 'followers', 'public'))
);

create index if not exists idx_activity_posts_author_created
    on activity_posts(author_user_id, created_at desc);

create index if not exists idx_activity_posts_public_feed
    on activity_posts(created_at desc)
    where visibility = 'public' and hidden_at is null;

-- Chat 1:1 (Spood / DM); optional listing_id for marketplace context
create table if not exists chat_threads (
    id uuid primary key,
    user_low uuid not null references users(id) on delete cascade,
    user_high uuid not null references users(id) on delete cascade,
    listing_id uuid references marketplace_listings(id) on delete set null,
    created_at timestamptz not null default now(),
    constraint chk_chat_threads_distinct check (user_low <> user_high),
    constraint chk_chat_threads_order check (user_low::text < user_high::text)
);

create unique index if not exists uq_chat_threads_pair_dm
    on chat_threads(user_low, user_high)
    where listing_id is null;

create unique index if not exists uq_chat_threads_pair_listing
    on chat_threads(user_low, user_high, listing_id)
    where listing_id is not null;

create table if not exists chat_messages (
    id uuid primary key,
    thread_id uuid not null references chat_threads(id) on delete cascade,
    sender_user_id uuid not null references users(id) on delete cascade,
    body varchar(4000) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_thread_created
    on chat_messages(thread_id, created_at desc);

-- Referrals (code + redemptions; grant logic in BillingService later)
alter table users add column if not exists referred_by_user_id uuid null references users(id) on delete set null;

create table if not exists referral_codes (
    user_id uuid primary key references users(id) on delete cascade,
    code varchar(24) not null,
    created_at timestamptz not null default now()
);

create unique index if not exists uq_referral_codes_code_lower
    on referral_codes(lower(code));

create table if not exists referral_redemptions (
    id uuid primary key,
    referrer_user_id uuid not null references users(id) on delete cascade,
    referee_user_id uuid not null unique references users(id) on delete cascade,
    code_snapshot varchar(24) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_referral_redemptions_referrer
    on referral_redemptions(referrer_user_id, created_at desc);
