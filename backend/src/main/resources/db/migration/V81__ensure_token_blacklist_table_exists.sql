-- Local/state-recovery guard: ensure token_blacklist exists for schema validation.
create extension if not exists pgcrypto;

create table if not exists public.token_blacklist (
    id          uuid primary key default gen_random_uuid(),
    token_hash  varchar(64) not null unique,
    user_id     uuid references public.users(id) on delete cascade,
    expires_at  timestamptz not null,
    created_at  timestamptz not null default now()
);

alter table if exists public.token_blacklist
    alter column token_hash type varchar(64);

create index if not exists idx_token_blacklist_expires_at
    on public.token_blacklist (expires_at);

create index if not exists idx_token_blacklist_user_id
    on public.token_blacklist (user_id)
    where user_id is not null;
