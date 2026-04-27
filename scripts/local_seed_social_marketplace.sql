-- Local seed data for marketplace/community behavior testing.
-- Safe to run multiple times: uses deterministic emails/handles and cleans old seed rows.
-- For dense partner + peer demo rows (screenshots), run: local_seed_marketplace_screenshots.sql
--
-- Listing/post images: Unsplash CDN (tarantula search — local dev only; attribute photographers in real marketing).

begin;

-- 1) Ensure a baseline password hash exists from local dev user.
with base as (
    select password_hash
    from users
    where email = 'dev@tarantulapp.local'
    limit 1
)
insert into users (
    id, email, password_hash, display_name, plan, public_handle, bio, location,
    featured_collection, profile_country, profile_state, profile_city,
    search_visible, community_profile_visibility, created_at
)
select
    gen_random_uuid(), v.email, b.password_hash, v.display_name, 'PRO', v.handle, v.bio, v.location,
    v.featured_collection, v.country, v.state, v.city,
    true, 'public_full', now() - (v.created_days || ' days')::interval
from base b
cross join (
    values
      ('seed.alex@tarantulapp.local',   'Alex Rivera',  'alexkeeper',   'Collector focused on New World terrestrials.', 'Mexico City, Mexico', 'Brachypelma project', 'Mexico', 'CDMX', 'Mexico City', 42),
      ('seed.sofia@tarantulapp.local',  'Sofia Luna',   'sofiat8',      'Arboreal enclosures and humidity logs every week.', 'Guadalajara, Mexico', 'Arboreal line', 'Mexico', 'Jalisco', 'Guadalajara', 38),
      ('seed.mateo@tarantulapp.local',  'Mateo Cruz',   'mateocruz',    'Old World temperament notes and molt tracking.', 'Monterrey, Mexico', 'Old world benchmark', 'Mexico', 'Nuevo Leon', 'Monterrey', 30),
      ('seed.valeria@tarantulapp.local','Valeria Stone','val.stone',    'Community-first keeper, likes detailed feed updates.', 'Montreal, Canada', 'Beginner ambassador', 'Canada', 'Quebec', 'Montreal', 22),
      ('seed.nolan@tarantulapp.local',  'Nolan Pierce', 'nolan.keeper', 'Marketplace power user. Clean listings and quick replies.', 'Austin, USA', 'Marketplace curation', 'United States', 'Texas', 'Austin', 19),
      ('seed.camila@tarantulapp.local', 'Camila Voss',  'camivoss',     'Focus on sling growth curves and enclosure check-ins.', 'Bogota, Colombia', 'Sling lab', 'Colombia', 'Bogota', 'Bogota', 14)
) as v(email, display_name, handle, bio, location, featured_collection, country, state, city, created_days)
on conflict (email) do update
set
    display_name = excluded.display_name,
    plan = 'PRO',
    public_handle = excluded.public_handle,
    bio = excluded.bio,
    location = excluded.location,
    featured_collection = excluded.featured_collection,
    profile_country = excluded.profile_country,
    profile_state = excluded.profile_state,
    profile_city = excluded.profile_city,
    search_visible = true,
    community_profile_visibility = 'public_full';

-- 2) Reset previous seed social/marketplace rows.
delete from activity_post_comments
where post_id in (select id from activity_posts where body like '[SEED]%');

delete from activity_post_likes
where post_id in (select id from activity_posts where body like '[SEED]%');

delete from activity_posts
where body like '[SEED]%';

delete from seller_reviews
where comment like '[SEED]%';

delete from marketplace_listings
where title like '[SEED]%';

-- 3) Seed marketplace listings.
with seed_users as (
    select id, email, profile_city, profile_state, profile_country
    from users
    where email like 'seed.%@tarantulapp.local'
),
listing_rows as (
    select *
    from (
        values
          ('seed.alex@tarantulapp.local',    '[SEED] Brachypelma hamorii juvenile trio', 'Healthy juveniles feeding weekly, clean molt records and verified husbandry notes.', 'Brachypelma hamorii', 'juvenile', 'unsexed', 85.00, 'USD'),
          ('seed.sofia@tarantulapp.local',   '[SEED] Caribena versicolor juveniles',      'Captive-bred juveniles. Good eater response and clear photo updates.',               'Caribena versicolor', 'juvenile', 'unsexed', 92.00, 'USD'),
          ('seed.mateo@tarantulapp.local',   '[SEED] P. murinus subadult female',         'Defensive but stable feeder. Shipping with insulated pack available.',               'Pterinochilus murinus', 'subadult', 'female', 140.00, 'USD'),
          ('seed.valeria@tarantulapp.local', '[SEED] Tliltocatl albopilosus beginner pair','Great temperament for newer keepers. Includes lineage notes.',                       'Tliltocatl albopilosus', 'juvenile', 'unsexed', 70.00, 'USD'),
          ('seed.nolan@tarantulapp.local',   '[SEED] Aphonopelma chalcodes adult female', 'Proven feeder, low-stress handling history, public profile references available.',    'Aphonopelma chalcodes', 'adult', 'female', 210.00, 'USD'),
          ('seed.camila@tarantulapp.local',  '[SEED] GBB sling batch (5)',                 'Fresh sling batch, active growth logs, grouped sale preferred.',                      'Chromatopelma cyaneopubescens', 'sling', 'unsexed', 60.00, 'USD')
    ) as x(email, title, description, species_name, stage, sex, price_amount, currency)
)
insert into marketplace_listings (
    id, seller_user_id, title, description, species_name, stage, sex,
    price_amount, currency, status, city, state, country, image_url, pedigree_ref, created_at, updated_at
)
select
    gen_random_uuid(),
    u.id,
    r.title,
    r.description,
    r.species_name,
    r.stage,
    r.sex,
    r.price_amount,
    r.currency,
    'active',
    coalesce(u.profile_city, 'Unknown city'),
    coalesce(u.profile_state, 'Unknown state'),
    coalesce(u.profile_country, 'Unknown country'),
    case row_number() over(order by r.title)
        when 1 then 'https://images.unsplash.com/photo-1564398042875-dddb3c722039?w=1200&q=80&auto=format&fit=crop'
        when 2 then 'https://images.unsplash.com/photo-1752810228770-d866aee13158?w=1200&q=80&auto=format&fit=crop'
        when 3 then 'https://images.unsplash.com/photo-1771223050567-8659c6e2a762?w=1200&q=80&auto=format&fit=crop'
        when 4 then 'https://images.unsplash.com/photo-1579222741606-ecaab2d4bb16?w=1200&q=80&auto=format&fit=crop'
        when 5 then 'https://images.unsplash.com/photo-1597215675000-0420736f4ccc?w=1200&q=80&auto=format&fit=crop'
        when 6 then 'https://images.unsplash.com/photo-1567939973912-f499537375bd?w=1200&q=80&auto=format&fit=crop'
    end,
    '[SEED] lineage reference',
    now() - (row_number() over(order by r.title) || ' hours')::interval,
    now() - (row_number() over(order by r.title) || ' hours')::interval
from listing_rows r
join seed_users u on u.email = r.email;

-- 4) Seed public activity posts.
with seed_users as (
    select id, email
    from users
    where email like 'seed.%@tarantulapp.local'
),
post_rows as (
    select *
    from (
        values
          ('seed.alex@tarantulapp.local',    '[SEED] Enclosure check: adjusted substrate depth and cross ventilation today.', 'enclosure_check'),
          ('seed.sofia@tarantulapp.local',   '[SEED] Meet my Ts: juvenile C. versicolor finally webbed full corner overnight.', 'meet_my_ts'),
          ('seed.mateo@tarantulapp.local',   '[SEED] Is my spider okay? Refused food after premolt signs, monitoring posture.', 'spider_okay'),
          ('seed.valeria@tarantulapp.local', '[SEED] Weekly update: humidity tuned from 68% to 62% and behavior stabilized.', null),
          ('seed.nolan@tarantulapp.local',   '[SEED] Marketplace prep: standardized listing photos and seller profile notes.', null),
          ('seed.camila@tarantulapp.local',  '[SEED] Sling growth log: +0.3cm this cycle with tighter feeding intervals.', null),
          ('seed.alex@tarantulapp.local',    '[SEED] Community prompt: what prey cadence works best for your juveniles?', null),
          ('seed.sofia@tarantulapp.local',   '[SEED] Enclosure check: switched water dish position and reduced stress pacing.', 'enclosure_check'),
          ('seed.mateo@tarantulapp.local',   '[SEED] Meet my Ts: old world setup complete with secure anchor points.', 'meet_my_ts'),
          ('seed.valeria@tarantulapp.local', '[SEED] Is my spider okay? sudden fasting but still active in evening rounds.', 'spider_okay'),
          ('seed.nolan@tarantulapp.local',   '[SEED] Feed recap: 5/6 accepted, one refused after molt prep.', null),
          ('seed.camila@tarantulapp.local',  '[SEED] Trying a cleaner card-style post format for clearer husbandry notes.', null)
    ) as x(email, body, milestone_kind)
),
post_img(idx, url) as (
    values
      (1, 'https://images.unsplash.com/photo-1564398042875-dddb3c722039?w=900&q=80&auto=format&fit=crop'),
      (2, 'https://images.unsplash.com/photo-1763493323940-0c3323d8beea?w=900&q=80&auto=format&fit=crop'),
      (3, 'https://images.unsplash.com/photo-1598356918644-7a5af992f40c?w=900&q=80&auto=format&fit=crop'),
      (4, 'https://images.unsplash.com/photo-1596535403955-8216afaacc99?w=900&q=80&auto=format&fit=crop'),
      (5, 'https://images.unsplash.com/photo-1635495672951-314b0d4e6d28?w=900&q=80&auto=format&fit=crop'),
      (6, 'https://images.unsplash.com/photo-1580681157234-58dbf3fe9370?w=900&q=80&auto=format&fit=crop'),
      (7, 'https://images.unsplash.com/photo-1705931037230-928f91e63a5f?w=900&q=80&auto=format&fit=crop'),
      (8, 'https://images.unsplash.com/photo-1527101760592-3a603b32b08a?w=900&q=80&auto=format&fit=crop'),
      (9, 'https://images.unsplash.com/photo-1747738305505-66f6e3781265?w=900&q=80&auto=format&fit=crop'),
      (10, 'https://images.unsplash.com/photo-1609531084358-f09af256ffcb?w=900&q=80&auto=format&fit=crop'),
      (11, 'https://images.unsplash.com/photo-1635171379225-e820401ad961?w=900&q=80&auto=format&fit=crop'),
      (12, 'https://images.unsplash.com/photo-1583870549158-10e557c83f11?w=900&q=80&auto=format&fit=crop')
),
posts_numbered as (
    select p.body, p.milestone_kind, u.id as author_user_id,
           row_number() over(order by p.body) as rn
    from post_rows p
    join seed_users u on u.email = p.email
)
insert into activity_posts (
    id, author_user_id, body, visibility, milestone_kind, image_url, tarantula_id, hidden_at, created_at
)
select
    gen_random_uuid(),
    pn.author_user_id,
    pn.body,
    'public',
    pn.milestone_kind,
    pi.url,
    null,
    null,
    now() - (pn.rn * interval '47 minutes')
from posts_numbered pn
join post_img pi on pi.idx = ((pn.rn - 1) % 12) + 1;

-- 4b) Avatar-style profile photos for seed users (marketplace cards / handles).
update users u set profile_photo = x.url
from (
    values
      ('seed.alex@tarantulapp.local', 'https://images.unsplash.com/photo-1564398042875-dddb3c722039?w=400&h=400&q=80&auto=format&fit=crop'),
      ('seed.sofia@tarantulapp.local', 'https://images.unsplash.com/photo-1752810228770-d866aee13158?w=400&h=400&q=80&auto=format&fit=crop'),
      ('seed.mateo@tarantulapp.local', 'https://images.unsplash.com/photo-1771223050567-8659c6e2a762?w=400&h=400&q=80&auto=format&fit=crop'),
      ('seed.valeria@tarantulapp.local', 'https://images.unsplash.com/photo-1579222741606-ecaab2d4bb16?w=400&h=400&q=80&auto=format&fit=crop'),
      ('seed.nolan@tarantulapp.local', 'https://images.unsplash.com/photo-1597215675000-0420736f4ccc?w=400&h=400&q=80&auto=format&fit=crop'),
      ('seed.camila@tarantulapp.local', 'https://images.unsplash.com/photo-1567939973912-f499537375bd?w=400&h=400&q=80&auto=format&fit=crop')
) as x(email, url)
where u.email = x.email;

-- 5) Seed "spoods" (likes): each post gets likes from several other seed users.
with seed_users as (
    select id
    from users
    where email like 'seed.%@tarantulapp.local'
),
seed_posts as (
    select id, author_user_id
    from activity_posts
    where body like '[SEED]%'
),
candidates as (
    select
        p.id as post_id,
        u.id as user_id,
        row_number() over (partition by p.id order by u.id) as rn
    from seed_posts p
    join seed_users u on u.id <> p.author_user_id
)
insert into activity_post_likes (id, post_id, user_id, created_at)
select
    gen_random_uuid(),
    c.post_id,
    c.user_id,
    now() - (c.rn * interval '9 minutes')
from candidates c
where c.rn <= 4
on conflict (post_id, user_id) do nothing;

-- 6) Seed comments: two comments per post from non-authors.
with seed_users as (
    select id
    from users
    where email like 'seed.%@tarantulapp.local'
),
seed_posts as (
    select id, author_user_id
    from activity_posts
    where body like '[SEED]%'
),
commenters as (
    select
        p.id as post_id,
        u.id as author_user_id,
        row_number() over (partition by p.id order by u.id) as rn
    from seed_posts p
    join seed_users u on u.id <> p.author_user_id
)
insert into activity_post_comments (id, post_id, author_user_id, body, hidden_at, created_at)
select
    gen_random_uuid(),
    c.post_id,
    c.author_user_id,
    case
        when c.rn = 1 then '[SEED] Clean setup, nice parameter tracking.'
        when c.rn = 2 then '[SEED] Looks solid. Keep posting updates next feeding cycle.'
        else '[SEED] Great update.'
    end,
    null,
    now() - (c.rn * interval '6 minutes')
from commenters c
where c.rn <= 2;

commit;

-- Quick checks
select count(*) as seed_marketplace_listings
from marketplace_listings
where title like '[SEED]%';

select count(*) as seed_posts
from activity_posts
where body like '[SEED]%';

select count(*) as seed_spoods
from activity_post_likes l
join activity_posts p on p.id = l.post_id
where p.body like '[SEED]%';

select count(*) as seed_comments
from activity_post_comments c
join activity_posts p on p.id = c.post_id
where p.body like '[SEED]%';
