set statement_timeout = 0;

-- Official/founding partners may be badge-only (no external site or catalog sync).
alter table official_vendors alter column website_url drop not null;

set statement_timeout = default;
