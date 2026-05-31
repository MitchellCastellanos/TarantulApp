-- Pickup points trust gate.
-- Admins authorize which sellers/partners may use pickup-point fulfillment.
-- The actual pickup partner/location hold days live on pickup-point records in
-- the follow-up fulfillment schema; this user flag is the prerequisite.
alter table users
    add column if not exists pickup_authorized_at timestamptz,
    add column if not exists pickup_authorization_note varchar(500);

create index if not exists idx_users_pickup_authorized_at
    on users (pickup_authorized_at)
    where pickup_authorized_at is not null;
