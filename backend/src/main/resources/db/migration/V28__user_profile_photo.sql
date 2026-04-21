set statement_timeout = 0;

alter table users add column if not exists profile_photo varchar(500);

set statement_timeout = default;
