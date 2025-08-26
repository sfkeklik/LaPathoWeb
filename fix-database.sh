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
-- Fix database migration script for existing installations
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

-- Grant necessary permissions to lapatho user
GRANT ALL PRIVILEGES ON TABLE images TO lapatho;
GRANT USAGE, SELECT ON SEQUENCE images_id_seq TO lapatho;

-- Verify the table structure
\d images;

-- Show current table contents (should be empty after migration)
SELECT COUNT(*) as row_count FROM images;
EOF

if [ $? -eq 0 ]; then
    echo "Database migration completed successfully!"
    echo "The images table now has a proper auto-incrementing ID column."
    echo ""
    echo "Next steps:"
    echo "1. Restart your application containers:"
    echo "   docker-compose restart backend"
    echo "2. Test file upload functionality"
    echo "3. Check application logs if needed:"
    echo "   docker-compose logs -f backend"
    echo ""
    echo "You can also check the database health with:"
    echo "   docker exec $DB_CONTAINER psql -U lapatho -d lapatho -c '\\d images;'"
else
    echo "Database migration failed. Please check the error messages above."
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Make sure the database container is running:"
    echo "   docker-compose ps database"
    echo "2. Check database logs:"
    echo "   docker-compose logs database"
    echo "3. Try connecting to the database manually:"
    echo "   docker exec -it $DB_CONTAINER psql -U lapatho -d lapatho"
    exit 1
fi
