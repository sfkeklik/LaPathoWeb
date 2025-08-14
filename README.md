# LaPatho - Pathology Image Annotation System

## Overview
LaPatho is a web-based pathology image annotation system built with Spring Boot backend and Angular frontend.

## Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- Maven 3.6+

### Backend Setup
```bash
mvn clean install
mvn spring-boot:run
```
Backend will run on http://localhost:8080

### Frontend Setup
```bash
cd src/main/web-ui
npm install
ng serve
```
Frontend will run on http://localhost:4200

## Features
- Large pathology image viewer (OpenSeadragon)
- Image annotation with Annotorious
- Image upload and management
- REST API for annotations

## Technology Stack
- **Backend**: Spring Boot, Java
- **Frontend**: Angular, TypeScript
- **Image Viewer**: OpenSeadragon
- **Annotations**: Annotorious

## API Endpoints
- `GET /api/images` - List all images
- `POST /api/images` - Upload new image
- `GET /api/annotations/{imageId}` - Get image annotations
- `POST /api/annotations` - Save annotation

## Development
- Backend runs on port 8080
- Frontend runs on port 4200 with proxy to backend
- Uploaded images stored in `uploads/` directory
