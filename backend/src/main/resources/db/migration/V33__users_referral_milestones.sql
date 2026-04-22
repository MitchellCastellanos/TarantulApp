-- One-time referral milestone rewards (bitmask on users.referral_milestone_mask).
alter table users add column if not exists referral_milestone_mask integer not null default 0;
alter table users add column if not exists founder_keeper boolean not null default false;
