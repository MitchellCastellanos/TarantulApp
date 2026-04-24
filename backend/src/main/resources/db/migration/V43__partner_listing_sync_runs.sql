set statement_timeout = 0;

create table if not exists partner_listing_sync_runs (
    id uuid primary key default gen_random_uuid(),
    official_vendor_id uuid not null references official_vendors(id) on delete cascade,
    trigger_source varchar(40) not null,
    status varchar(20) not null,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    processed_count integer not null default 0,
    upserted_count integer not null default 0,
    stale_count integer not null default 0,
    failed_count integer not null default 0,
    skipped_count integer not null default 0,
    error_message varchar(1500),
    created_at timestamptz not null default now(),
    constraint chk_partner_sync_runs_status check (status in ('running', 'success', 'partial', 'failed')),
    constraint chk_partner_sync_runs_trigger check (trigger_source in ('scheduler', 'manual'))
);

create index if not exists idx_partner_sync_runs_vendor_started
    on partner_listing_sync_runs(official_vendor_id, started_at desc);

create index if not exists idx_partner_sync_runs_status_started
    on partner_listing_sync_runs(status, started_at desc);

set statement_timeout = default;
