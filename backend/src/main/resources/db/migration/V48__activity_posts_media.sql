alter table activity_posts
    add column if not exists media_url varchar(600);

alter table activity_posts
    add column if not exists media_type varchar(20);

alter table activity_posts
    drop constraint if exists chk_activity_posts_media_type;

alter table activity_posts
    add constraint chk_activity_posts_media_type
    check (media_type is null or media_type in ('image', 'video'));
