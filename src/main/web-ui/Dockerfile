# Multi-stage build for Angular application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install ALL dependencies including devDependencies (Angular CLI is needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application for production (updated syntax)
RUN npm run build

# Debug: Check what was built
RUN ls -la dist/
RUN ls -la dist/web-ui/ || echo "web-ui directory not found"
RUN find dist/ -name "index.html" -type f

# Production stage with Nginx
FROM nginx:alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist/web-ui /usr/share/nginx/html

# Debug: Verify files were copied
RUN ls -la /usr/share/nginx/html/
RUN cat /usr/share/nginx/html/index.html | head -10 || echo "index.html not found"

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
