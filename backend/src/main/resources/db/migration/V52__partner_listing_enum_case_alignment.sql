set statement_timeout = 0;

-- Drop legacy lowercase checks first so uppercase values can be written safely.
alter table partner_listings
    drop constraint if exists chk_partner_listings_availability;

alter table partner_listings
    drop constraint if exists chk_partner_listings_status;

-- Align legacy lowercase values with JPA EnumType.STRING names.
update partner_listings
set availability = case lower(availability)
    when 'in_stock' then 'IN_STOCK'
    when 'out_of_stock' then 'OUT_OF_STOCK'
    else 'UNKNOWN'
end
where availability is not null;

update partner_listings
set status = case lower(status)
    when 'active' then 'ACTIVE'
    when 'stale' then 'STALE'
    else 'HIDDEN'
end
where status is not null;

alter table partner_listings
    add constraint chk_partner_listings_availability
        check (availability in ('IN_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'));

alter table partner_listings
    add constraint chk_partner_listings_status
        check (status in ('ACTIVE', 'STALE', 'HIDDEN'));

set statement_timeout = default;
