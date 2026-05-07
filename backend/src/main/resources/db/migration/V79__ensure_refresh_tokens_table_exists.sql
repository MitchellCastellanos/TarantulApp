-- Local/state-recovery guard: ensure refresh_tokens exists even if prior history drifted.
create extension if not exists pgcrypto;

create table if not exists public.refresh_tokens (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    token_hash    char(64) not null unique,
    device_label  varchar(120),
    expires_at    timestamptz not null,
    last_used_at  timestamptz,
    revoked_at    timestamptz,
    created_at    timestamptz not null default now()
);

alter table if exists public.refresh_tokens
    alter column token_hash type varchar(64);

create index if not exists idx_refresh_tokens_user_active
    on public.refresh_tokens (user_id, expires_at desc)
    where revoked_at is null;

create index if not exists idx_refresh_tokens_expires_at
    on public.refresh_tokens (expires_at);
