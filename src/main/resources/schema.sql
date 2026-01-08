-- Database schema initialization for PostgreSQL
-- This will create all necessary tables ONLY if they don't exist

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'DOCTOR',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size BIGINT,
    format VARCHAR(100),
    pixel_size_x DOUBLE PRECISION,
    pixel_size_y DOUBLE PRECISION,
    bit_depth INTEGER,
    channels INTEGER,
    color_space VARCHAR(50),
    compression VARCHAR(100),
    magnification DOUBLE PRECISION,
    objective VARCHAR(100),
    scanner VARCHAR(255),
    scan_date VARCHAR(100)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    created_by BIGINT REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT true,
    grade_level INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project-Doctor relationship (many-to-many)
CREATE TABLE IF NOT EXISTS project_doctors (
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- Project-Image relationship (many-to-many)
CREATE TABLE IF NOT EXISTS project_images (
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, image_id)
);

-- Labels table - projeye özel etiketler
CREATE TABLE IF NOT EXISTS labels (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#ff0000',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- Annotations table - with user reference
CREATE TABLE IF NOT EXISTS annotations (
    id BIGSERIAL PRIMARY KEY,
    image_id BIGINT NOT NULL,
    user_id BIGINT REFERENCES users(id),
    creator VARCHAR(255),
    type VARCHAR(100),
    geometry TEXT,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_name ON images(name);
CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(active);
CREATE INDEX IF NOT EXISTS idx_labels_project_id ON labels(project_id);

-- Image Labeling Status table - Doktor bazlı etiketleme durumu takibi
CREATE TABLE IF NOT EXISTS image_labeling_status (
    id BIGSERIAL PRIMARY KEY,
    image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(image_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_labeling_status_image ON image_labeling_status(image_id);
CREATE INDEX IF NOT EXISTS idx_labeling_status_user ON image_labeling_status(user_id);
CREATE INDEX IF NOT EXISTS idx_labeling_status_status ON image_labeling_status(status);

-- Add grade_level column to existing projects table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'grade_level') THEN
        ALTER TABLE projects ADD COLUMN grade_level INTEGER NOT NULL DEFAULT 3;
    END IF;
END $$;

-- Insert default admin user if not exists (password: admin123)
INSERT INTO users (username, password, first_name, last_name, email, role, enabled)
SELECT 'admin', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOz0PTGCDk.O1FnLwRLbQjVuCk6vRdJKG', 'Admin', 'User', 'admin@lapatho.com', 'ADMIN', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Insert default doctor user if not exists (password: admin123)
INSERT INTO users (username, password, first_name, last_name, email, role, enabled)
SELECT 'doctor', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOz0PTGCDk.O1FnLwRLbQjVuCk6vRdJKG', 'Default', 'Doctor', 'doctor@lapatho.com', 'DOCTOR', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'doctor');

-- Insert default Pathology project if not exists
INSERT INTO projects (name, description, created_by, active, created_at, updated_at)
SELECT 'Pathology', 'Default pathology project for tissue analysis',
       (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Pathology');

-- Insert default Dental project if not exists
INSERT INTO projects (name, description, created_by, active, created_at, updated_at)
SELECT 'Dental', 'Default dental imaging project',
       (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Dental');

-- Assign default doctor to Pathology project if not already assigned
INSERT INTO project_doctors (project_id, user_id)
SELECT p.id, u.id
FROM projects p, users u
WHERE p.name = 'Pathology' AND u.username = 'doctor'
AND NOT EXISTS (
    SELECT 1 FROM project_doctors pd
    WHERE pd.project_id = p.id AND pd.user_id = u.id
);

-- Insert default Pathology labels if not exists
INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Nucleus', '#ff0000', 'Cell nucleus region', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Pathology'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Nucleus');

INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Tumor', '#00ff00', 'Tumor tissue region', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Pathology'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Tumor');

INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Necrosis', '#0000ff', 'Necrotic tissue region', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Pathology'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Necrosis');

INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Stroma', '#ffff00', 'Stromal tissue region', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Pathology'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Stroma');

INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Muscle', '#800080', 'Muscle tissue region', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Pathology'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Muscle');

-- Insert default Dental labels if not exists
INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Cavity', '#ff4444', 'Dental cavity region', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Dental'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Cavity');

INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Enamel', '#44ff44', 'Tooth enamel', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Dental'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Enamel');

INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Root Canal', '#4444ff', 'Root canal region', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Dental'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Root Canal');

INSERT INTO labels (project_id, name, color, description, created_at, updated_at)
SELECT p.id, 'Gum', '#ff88ff', 'Gum tissue', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p WHERE p.name = 'Dental'
AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = 'Gum');

