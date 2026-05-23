-- Vendor referral codes grant listing boost credits instead of (or in addition to) keeper trial days.

alter table referral_codes
    add column if not exists vendor_code boolean not null default false;

update referral_codes rc
set vendor_code = true
from users u
where rc.user_id = u.id
  and coalesce(u.verified_breeder, false) = true;

create table if not exists vendor_boost_credits (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    source varchar(40) not null,
    referral_redemption_id uuid null references referral_redemptions(id) on delete set null,
    granted_at timestamptz not null default now(),
    consumed_at timestamptz null,
    listing_id uuid null references marketplace_listings(id) on delete set null,
    constraint chk_vendor_boost_credits_source check (source in ('vendor_referral_signup'))
);

create index if not exists idx_vendor_boost_credits_user_available
    on vendor_boost_credits(user_id, granted_at desc)
    where consumed_at is null;

create unique index if not exists uq_vendor_boost_credits_redemption
    on vendor_boost_credits(referral_redemption_id)
    where referral_redemption_id is not null;
