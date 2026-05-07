-- Align legacy/local refresh_tokens schema with current JPA mapping.
alter table if exists public.refresh_tokens
    alter column token_hash type varchar(64);
