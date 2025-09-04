#!/bin/bash

echo "Starting database migration to fix images table..."

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Find the database container
DB_CONTAINER=$(docker ps --filter "name=database" --format "{{.Names}}" | head -n1)

if [ -z "$DB_CONTAINER" ]; then
    echo "Error: No database container found. Looking for containers with 'postgres' in name..."
    DB_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -n1)
fi

if [ -z "$DB_CONTAINER" ]; then
    echo "Error: No database container found. Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    echo ""
    echo "Please start your database container first with: docker-compose up -d database"
    exit 1
fi

echo "Found database container: $DB_CONTAINER"

# Execute the database migration with correct credentials
echo "Running database migration..."
docker exec -i $DB_CONTAINER psql -U lapatho -d lapatho << 'EOF'
-- Enhanced database migration script with comprehensive metadata support
-- First, try to add columns to existing table
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

-- If that fails, recreate the table with all columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images' AND column_name = 'bit_depth'
    ) THEN
        -- Backup existing data
        CREATE TEMP TABLE images_backup AS SELECT * FROM images;

        -- Drop and recreate table with full schema
        DROP TABLE IF EXISTS images CASCADE;

        CREATE TABLE images (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255),
            width INTEGER,
            height INTEGER,
            tile_size INTEGER,
            max_level INTEGER,
            path VARCHAR(500),
            status VARCHAR(50) DEFAULT 'PENDING',
            created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            -- New metadata fields
            file_size BIGINT,
            format VARCHAR(50),
            pixel_size_x DOUBLE PRECISION,
            pixel_size_y DOUBLE PRECISION,
            bit_depth INTEGER,
            channels INTEGER,
            color_space VARCHAR(50),
            compression VARCHAR(50),
            magnification DOUBLE PRECISION,
            objective VARCHAR(100),
            scanner VARCHAR(100),
            scan_date VARCHAR(50)
        );

        -- Restore basic data
        INSERT INTO images (id, name, width, height, tile_size, max_level, path, status, created, updated)
        SELECT id, name, width, height, tile_size, max_level, path,
               COALESCE(status, 'PENDING'),
               COALESCE(created, CURRENT_TIMESTAMP),
               COALESCE(updated, CURRENT_TIMESTAMP)
        FROM images_backup;

        -- Reset sequence
        SELECT setval('images_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM images;

        DROP TABLE images_backup;

        RAISE NOTICE 'Table recreated with enhanced metadata support';
    END IF;
END $$;

-- Update existing records with sensible defaults
UPDATE images
SET
    format = COALESCE(format, 'TIFF'),
    bit_depth = COALESCE(bit_depth, 8),
    channels = COALESCE(channels, 3),
    color_space = COALESCE(color_space, 'RGB')
WHERE format IS NULL OR bit_depth IS NULL OR channels IS NULL OR color_space IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_format ON images(format);
CREATE INDEX IF NOT EXISTS idx_images_created ON images(created);

-- Verify the final schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'images'
ORDER BY ordinal_position;

RAISE NOTICE 'Database migration completed successfully!';
EOF

echo "Database migration completed!"
