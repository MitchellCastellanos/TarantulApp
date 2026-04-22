create table if not exists activity_post_likes (
    id uuid primary key,
    post_id uuid not null references activity_posts(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uq_activity_post_likes_post_user unique (post_id, user_id)
);

create index if not exists idx_activity_post_likes_post on activity_post_likes(post_id);

create table if not exists activity_post_comments (
    id uuid primary key,
    post_id uuid not null references activity_posts(id) on delete cascade,
    author_user_id uuid not null references users(id) on delete cascade,
    body varchar(1500) not null,
    hidden_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_activity_post_comments_post_created
    on activity_post_comments(post_id, created_at asc);
