ALTER TABLE species ADD COLUMN reference_photo_url VARCHAR(500) NULL;
ALTER TABLE species ADD COLUMN data_source VARCHAR(30) NOT NULL DEFAULT 'seed';

-- Mark the seeded species explicitly
UPDATE species SET data_source = 'seed' WHERE is_custom = false AND created_by IS NULL;
