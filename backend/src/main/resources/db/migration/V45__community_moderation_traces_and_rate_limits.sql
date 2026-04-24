create table if not exists community_moderation_traces (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    target_type varchar(30) not null,
    action varchar(20) not null,
    reason varchar(80) not null,
    content_preview varchar(240),
    created_at timestamptz not null default now()
);

create index if not exists idx_comm_mod_traces_user_created
    on community_moderation_traces(user_id, created_at desc);
