-- Local/state-recovery guard: ensure users.is_admin exists.
alter table if exists public.users
    add column if not exists is_admin boolean not null default false;
