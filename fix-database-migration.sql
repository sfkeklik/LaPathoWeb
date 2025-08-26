-- Fix database migration script for existing installations
-- Run this on your remote server to fix the images table

-- Drop existing table and constraints
DROP TABLE IF EXISTS images CASCADE;

-- Recreate the table with proper structure
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
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_name ON images(name);

-- Create a function to update the updated timestamp
CREATE OR REPLACE FUNCTION update_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated timestamp
CREATE TRIGGER update_images_updated
    BEFORE UPDATE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_column();

-- Grant necessary permissions (adjust as needed for your user)
GRANT ALL PRIVILEGES ON TABLE images TO postgres;
GRANT USAGE, SELECT ON SEQUENCE images_id_seq TO postgres;
