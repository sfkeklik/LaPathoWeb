#!/bin/bash
# LaPatho Docker Deployment Script

echo "🚀 Starting LaPatho deployment with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images (optional - uncomment if you want to rebuild from scratch)
# docker-compose down --rmi all

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "📊 Service Status:"
docker-compose ps

# Show logs if something goes wrong
if [ "$(docker-compose ps -q | xargs docker inspect -f '{{.State.Status}}' | grep -v running | wc -l)" -gt 0 ]; then
    echo "⚠️  Some services are not running. Showing logs:"
    docker-compose logs --tail=50
else
    echo "✅ All services are running successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://localhost"
    echo "   Backend API: http://localhost:8080/api"
    echo "   Database: localhost:5432"
    echo ""
    echo "📝 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
fi
