-- Optional paid visibility window for peer listings (checkout at create time only in UI)
alter table marketplace_listings
    add column if not exists boosted_until timestamptz;
