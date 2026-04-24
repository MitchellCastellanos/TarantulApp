alter table users
    add column if not exists community_profile_visibility varchar(20) not null default 'preview_only';

alter table users
    drop constraint if exists chk_users_community_profile_visibility;

alter table users
    add constraint chk_users_community_profile_visibility
    check (community_profile_visibility in ('public_full', 'preview_only', 'private'));

alter table activity_posts
    drop constraint if exists chk_activity_posts_visibility;

alter table activity_posts
    add constraint chk_activity_posts_visibility
    check (visibility in ('private', 'public'));
