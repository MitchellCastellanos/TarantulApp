alter table if exists sex_id_cases
    add column if not exists status varchar(20) not null default 'OPEN',
    add column if not exists voting_closes_at timestamptz not null default (now() + interval '72 hour'),
    add column if not exists locked_at timestamptz,
    add column if not exists resolved_at timestamptz,
    add column if not exists resolution_choice varchar(20),
    add column if not exists resolution_confidence double precision,
    add column if not exists resolution_confidence_label varchar(20),
    add column if not exists settled_at timestamptz;

create index if not exists idx_sex_id_cases_status_close
    on sex_id_cases (status, voting_closes_at)
    where hidden_at is null;

create table if not exists sex_id_point_awards (
    id uuid primary key,
    user_id uuid not null references users (id) on delete cascade,
    case_id uuid not null references sex_id_cases (id) on delete cascade,
    reason varchar(30) not null,
    points integer not null check (points > 0),
    created_at timestamptz not null default now(),
    constraint uq_sex_id_point_award unique (user_id, case_id, reason)
);

create index if not exists idx_sex_id_point_awards_user_created
    on sex_id_point_awards (user_id, created_at desc);
