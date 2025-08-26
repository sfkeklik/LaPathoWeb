# PostgreSQL Setup for LaPatho

This project now uses PostgreSQL for both development and deployment. Here's how to set it up:

## For Development (Local)

### Option 1: Install PostgreSQL Locally

1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, set the superuser password
3. Create the development database and user:

```sql
-- Connect as postgres superuser
CREATE DATABASE lapatho;
CREATE USER lapatho WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE lapatho TO lapatho;
```

### Option 2: Use Docker for Development Database

If you prefer to use Docker for the database only during development:

```bash
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=lapatho \
  -e POSTGRES_USER=lapatho \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

## For Deployment

Use the existing Docker Compose setup:

```bash
docker-compose up -d
```

## Database Configuration

The application is configured to use:
- **Host**: localhost (development) / database (Docker)
- **Port**: 5432
- **Database**: lapatho
- **Username**: lapatho
- **Password**: password

## Schema Initialization

The database schema will be automatically created from `src/main/resources/schema.sql` when the application starts.

## Connecting to Database

- **Development**: Use any PostgreSQL client to connect to localhost:5432
- **Docker**: Use the included pgAdmin at http://localhost:5050 (admin@lapatho.com / admin)

## Changes Made

- Removed H2 database dependency from pom.xml
- Updated application.properties to use PostgreSQL for development
- Both development and deployment now use the same PostgreSQL configuration
