-- Public-by-default for keeper profiles and collection grids (/u/:handle).

ALTER TABLE users
    ALTER COLUMN community_profile_visibility SET DEFAULT 'public_full';

UPDATE users
SET community_profile_visibility = 'public_full'
WHERE community_profile_visibility IS DISTINCT FROM 'public_full';
