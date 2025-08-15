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

# Build the application for production
RUN npm run build

# Debug: List the contents of dist directory to see the actual structure
RUN ls -la dist/
RUN ls -la dist/web-ui/ || echo "dist/web-ui not found"
RUN find dist/ -type f -name "*.html" || echo "No HTML files found"

# Production stage with Nginx
FROM nginx:alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
# Angular v17+ yeni yapısında browser klasörü altında dosyalar oluşuyor
COPY --from=builder /app/dist/web-ui/browser /usr/share/nginx/html

# Debug: Verify the files were copied correctly
RUN ls -la /usr/share/nginx/html/
RUN test -f /usr/share/nginx/html/index.html && echo "index.html found" || echo "index.html NOT found"

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
