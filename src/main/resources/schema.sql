-- Database schema initialization for PostgreSQL
-- This will create both images and annotations tables ONLY if they don't exist

-- Images table - sadece yoksa oluştur
CREATE TABLE IF NOT EXISTS images (
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

-- Annotations table - sadece yoksa oluştur
CREATE TABLE IF NOT EXISTS annotations (
    id BIGSERIAL PRIMARY KEY,
    image_id BIGINT NOT NULL,
    creator VARCHAR(255),
    type VARCHAR(100),
    geometry TEXT,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- Create indexes for better performance - sadece yoksa oluştur
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_name ON images(name);
CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
