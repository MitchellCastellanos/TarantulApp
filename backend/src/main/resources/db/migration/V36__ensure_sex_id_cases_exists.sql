-- Safety migration: ensure Sex ID MVP tables exist on environments where V34 was skipped/missed.
create table if not exists sex_id_cases (
    id uuid primary key,
    author_user_id uuid not null references users (id),
    title varchar(200),
    image_url varchar(500) not null,
    species_hint varchar(200),
    hidden_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_sex_id_cases_author_created
    on sex_id_cases (author_user_id, created_at desc);

create index if not exists idx_sex_id_cases_public_feed
    on sex_id_cases (created_at desc)
    where hidden_at is null;

create table if not exists sex_id_case_votes (
    id uuid primary key,
    case_id uuid not null references sex_id_cases (id) on delete cascade,
    voter_user_id uuid not null references users (id) on delete cascade,
    choice varchar(20) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_sex_id_case_votes_one_per_user unique (case_id, voter_user_id),
    constraint chk_sex_id_case_votes_choice check (choice in ('MALE', 'FEMALE', 'UNCERTAIN'))
);

create index if not exists idx_sex_id_case_votes_case on sex_id_case_votes (case_id);
