create table if not exists moderation_reports (
    id uuid primary key,
    reporter_user_id uuid null references users(id) on delete set null,
    target_type varchar(40) not null,
    target_id uuid null,
    target_ref varchar(120) null,
    reason varchar(80) not null,
    details text null,
    status varchar(20) not null default 'open',
    created_at timestamptz not null default now(),
    resolved_at timestamptz null,
    resolved_by uuid null references users(id) on delete set null,
    resolution_note text null
);

create index if not exists idx_moderation_reports_status_created_at
    on moderation_reports(status, created_at desc);
