-- V67: ShedLock fallback when Redis is not configured. The provider takes a row-level lock
-- with usingDbTime() so clock skew between replicas does not cause double-firing.

CREATE TABLE IF NOT EXISTS public.shedlock (
    name        VARCHAR(64) PRIMARY KEY,
    lock_until  TIMESTAMP NOT NULL,
    locked_at   TIMESTAMP NOT NULL,
    locked_by   VARCHAR(255) NOT NULL
);
