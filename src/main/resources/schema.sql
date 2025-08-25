-- Database schema initialization for PostgreSQL
-- This will create the images table with proper auto-incrementing ID

DROP TABLE IF EXISTS images CASCADE;

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

-- Create index for better performance
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_name ON images(name);
