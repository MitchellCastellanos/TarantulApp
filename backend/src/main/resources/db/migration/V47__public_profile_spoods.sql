create table if not exists tarantula_spoods (
    id uuid primary key,
    tarantula_id uuid not null references tarantulas(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uq_tarantula_spoods_tarantula_user unique (tarantula_id, user_id)
);

create index if not exists idx_tarantula_spoods_tarantula
    on tarantula_spoods(tarantula_id);

create table if not exists photo_spoods (
    id uuid primary key,
    photo_id uuid not null references photos(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uq_photo_spoods_photo_user unique (photo_id, user_id)
);

create index if not exists idx_photo_spoods_photo
    on photo_spoods(photo_id);
