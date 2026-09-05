create table if not exists partner_feature_requests (
    id uuid primary key default gen_random_uuid(),
    requester_user_id uuid not null references users(id) on delete cascade,
    official_vendor_id uuid not null references official_vendors(id) on delete cascade,
    request_type varchar(40) not null,
    status varchar(30) not null default 'open',
    message varchar(1200),
    admin_note varchar(1200),
    response_message varchar(1200),
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index if not exists idx_partner_feature_requests_vendor_created
    on partner_feature_requests (official_vendor_id, created_at desc);

create index if not exists idx_partner_feature_requests_status_created
    on partner_feature_requests (status, created_at desc);
