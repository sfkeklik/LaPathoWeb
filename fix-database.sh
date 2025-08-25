#!/bin/bash

# Database migration script to fix the images table ID sequence issue
# Run this script on your remote server

echo "Starting database migration to fix images table..."

# Connect to PostgreSQL and run the migration
docker exec -i lapatho-database-1 psql -U lapatho -d lapatho << 'EOF'

-- Drop the existing table if it exists and recreate with proper sequence
DROP TABLE IF EXISTS images CASCADE;

-- Create the images table with proper auto-incrementing ID
CREATE TABLE images (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    width INTEGER,
    height INTEGER,
    tile_size INTEGER,
    max_level INTEGER,
    path VARCHAR(500),
    status VARCHAR(50),
    created TIMESTAMP,
    updated TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_name ON images(name);

-- Verify the table was created correctly
\d images;

EOF

echo "Database migration completed!"
echo "The images table now has a proper auto-incrementing ID column."
echo "Please restart your application containers."
