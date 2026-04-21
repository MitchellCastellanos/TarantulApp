set statement_timeout = 0;

alter table marketplace_listings add column if not exists state varchar(80);

alter table users add column if not exists profile_country varchar(80);
alter table users add column if not exists profile_state varchar(80);
alter table users add column if not exists profile_city varchar(80);
alter table users add column if not exists qr_print_exports integer not null default 0;

set statement_timeout = default;
