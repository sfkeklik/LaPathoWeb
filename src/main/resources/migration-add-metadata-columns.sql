-- Migration script to add new metadata columns to images table
-- Run this script to update your existing database schema

ALTER TABLE images
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS format VARCHAR(50),
ADD COLUMN IF NOT EXISTS pixel_size_x DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS pixel_size_y DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS bit_depth INTEGER,
ADD COLUMN IF NOT EXISTS channels INTEGER,
ADD COLUMN IF NOT EXISTS color_space VARCHAR(50),
ADD COLUMN IF NOT EXISTS compression VARCHAR(50),
ADD COLUMN IF NOT EXISTS magnification DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS objective VARCHAR(100),
ADD COLUMN IF NOT EXISTS scanner VARCHAR(100),
ADD COLUMN IF NOT EXISTS scan_date VARCHAR(50);

-- Update existing records with default values where appropriate
UPDATE images
SET
    format = 'TIFF' WHERE format IS NULL,
    bit_depth = 8 WHERE bit_depth IS NULL,
    channels = 3 WHERE channels IS NULL,
    color_space = 'RGB' WHERE color_space IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'images'
ORDER BY ordinal_position;
