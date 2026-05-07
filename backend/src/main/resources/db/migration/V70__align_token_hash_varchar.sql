-- V70: align token_hash columns with the JPA mapping.
--
-- V66 (token_blacklist) and V69 (refresh_tokens) both created token_hash as char(64). When the
-- entities started declaring columnDefinition="char(64)", Hibernate kept its internal JDBC type
-- as VARCHAR (the default for String) while Postgres reports bpchar/CHAR — that mismatch made
-- ddl-auto=validate fail at boot.
--
-- VARCHAR(64) is the natural shape for a fixed-length hex hash on Postgres and matches Hibernate's
-- default JDBC mapping with no extra annotations. ALTER COLUMN is a metadata-only change for
-- char→varchar of the same length; no data migration cost.

ALTER TABLE public.token_blacklist
    ALTER COLUMN token_hash TYPE varchar(64);

ALTER TABLE public.refresh_tokens
    ALTER COLUMN token_hash TYPE varchar(64);
