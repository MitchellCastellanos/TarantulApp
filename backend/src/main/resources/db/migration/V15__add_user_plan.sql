-- V15: Add plan column to users (FREE / PRO)
ALTER TABLE users
    ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'FREE';

