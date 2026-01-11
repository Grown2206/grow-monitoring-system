#!/bin/bash

# Grow Monitoring System - Production Build Script
# Builds all Docker images for production deployment

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker ist nicht installiert. Bitte installieren: https://docs.docker.com/get-docker/"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose ist nicht installiert. Bitte installieren: https://docs.docker.com/compose/install/"
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    warning ".env.production nicht gefunden. Erstelle aus .env.production.example..."
    if [ -f .env.production.example ]; then
        cp .env.production.example .env.production
        warning "Bitte .env.production bearbeiten und Passwörter setzen!"
        exit 1
    else
        error ".env.production.example nicht gefunden!"
    fi
fi

log "=== Starting Production Build ==="

# Build Frontend
log "Building Frontend..."
docker build -t grow-frontend:latest ./frontend
if [ $? -eq 0 ]; then
    log "✅ Frontend build successful"
else
    error "Frontend build failed"
fi

# Build Backend
log "Building Backend..."
docker build -t grow-backend:latest ./backend
if [ $? -eq 0 ]; then
    log "✅ Backend build successful"
else
    error "Backend build failed"
fi

# Build Nginx
log "Building Nginx..."
docker build -t grow-nginx:latest ./nginx
if [ $? -eq 0 ]; then
    log "✅ Nginx build successful"
else
    error "Nginx build failed"
fi

# Build Mosquitto
log "Building Mosquitto..."
docker build -t grow-mosquitto:latest ./mosquitto
if [ $? -eq 0 ]; then
    log "✅ Mosquitto build successful"
else
    error "Mosquitto build failed"
fi

# Pull external images
log "Pulling external images..."
docker pull mongo:7.0
docker pull grafana/grafana:latest
docker pull prom/prometheus:latest

log "=== Build Summary ==="
docker images | grep -E 'grow-|mongo|grafana|prometheus' || true

log "=== Build completed successfully ==="
log ""
log "Next steps:"
log "1. Review .env.production and set all passwords"
log "2. Start containers: docker-compose -f docker-compose.production.yml up -d"
log "3. Check logs: docker-compose -f docker-compose.production.yml logs -f"
log "4. Open Web UI: http://localhost:8080"
