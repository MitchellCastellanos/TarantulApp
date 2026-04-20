create table if not exists device_push_tokens (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    platform varchar(20) not null,
    token varchar(512) not null unique,
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index if not exists idx_device_push_tokens_user_id on device_push_tokens(user_id);
