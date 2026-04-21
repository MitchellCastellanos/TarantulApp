set statement_timeout = 0;

alter table users add column if not exists public_handle varchar(60);
alter table users add column if not exists bio varchar(500);
alter table users add column if not exists location varchar(140);
alter table users add column if not exists featured_collection varchar(180);
alter table users add column if not exists contact_whatsapp varchar(80);
alter table users add column if not exists contact_instagram varchar(80);

update users u
set
    public_handle = kp.handle,
    bio = kp.bio,
    location = kp.location,
    featured_collection = kp.featured_collection,
    contact_whatsapp = kp.contact_whatsapp,
    contact_instagram = kp.contact_instagram
from keeper_profiles kp
where kp.user_id = u.id
  and (
      u.public_handle is null
      or u.bio is null
      or u.location is null
      or u.featured_collection is null
      or u.contact_whatsapp is null
      or u.contact_instagram is null
  );

create unique index if not exists idx_users_public_handle_unique
    on users (lower(public_handle))
    where public_handle is not null and public_handle <> '';

set statement_timeout = default;
