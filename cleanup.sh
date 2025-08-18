#!/bin/bash

echo "=== LaPatho Docker Cleanup & Restart Script ==="

# Stop all containers
echo "Stopping all Docker containers..."
docker-compose down -v

# Kill any processes using port 80
echo "Checking for processes using port 80..."
NGINX_PID=$(sudo lsof -ti:80)
if [ ! -z "$NGINX_PID" ]; then
    echo "Killing processes on port 80: $NGINX_PID"
    sudo kill -9 $NGINX_PID
    sleep 2
fi

# Remove any nginx processes
echo "Stopping nginx processes..."
sudo pkill nginx 2>/dev/null || echo "No nginx processes found"

# Clean up Docker resources
echo "Cleaning up Docker resources..."
docker system prune -f
docker volume prune -f

# Remove any orphaned containers
docker container prune -f

echo "=== Cleanup completed ==="
echo ""
echo "Now you can run: docker-compose up --build"
