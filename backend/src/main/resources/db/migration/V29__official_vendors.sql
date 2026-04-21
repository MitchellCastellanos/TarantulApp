set statement_timeout = 0;

create table if not exists official_vendors (
  id uuid primary key default gen_random_uuid(),
  slug varchar(120) not null unique,
  name varchar(140) not null,
  country varchar(80) not null,
  state varchar(80),
  city varchar(80),
  website_url varchar(350) not null,
  national_shipping boolean not null default false,
  ships_to_countries varchar(350),
  influence_score integer not null default 0,
  note varchar(200),
  badge varchar(80),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists official_vendor_leads (
  id uuid primary key default gen_random_uuid(),
  business_name varchar(140) not null,
  contact_name varchar(120),
  contact_email varchar(255) not null,
  website_url varchar(350),
  country varchar(80),
  state varchar(80),
  city varchar(80),
  shipping_scope varchar(80),
  note varchar(1200),
  status varchar(30) not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_official_vendors_enabled on official_vendors(enabled, influence_score desc);
create index if not exists idx_official_vendor_leads_created on official_vendor_leads(created_at desc);

set statement_timeout = default;
