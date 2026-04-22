-- Supabase/PostgreSQL-safe baseline for community profile discoverability + social notifications.
create extension if not exists pgcrypto;

alter table if exists users
    add column if not exists search_visible boolean not null default true;

create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    actor_user_id uuid references users(id) on delete set null,
    type varchar(40) not null,
    title varchar(160),
    body varchar(600),
    data jsonb not null default '{}'::jsonb,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
    on notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
    on notifications (user_id, created_at desc)
    where read_at is null;
