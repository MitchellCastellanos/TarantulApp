-- Local/state-recovery guard: ensure ShedLock table exists for scheduled jobs.
create table if not exists public.shedlock (
    name        varchar(64) primary key,
    lock_until  timestamp not null,
    locked_at   timestamp not null,
    locked_by   varchar(255) not null
);
