#!/bin/bash

# Grow Monitoring System - Backup Script
# Creates backups of MongoDB database, configuration files, and timelapse images

set -e  # Exit on error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MONGODB_CONTAINER="grow-mongodb"
MONGODB_USER="admin"
MONGODB_PASSWORD="${MONGO_INITDB_ROOT_PASSWORD}"
MONGODB_DATABASE="growMonitoring"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directories
create_backup_dirs() {
    log "Creating backup directories..."
    mkdir -p "${BACKUP_DIR}/mongodb"
    mkdir -p "${BACKUP_DIR}/config"
    mkdir -p "${BACKUP_DIR}/timelapse"
    mkdir -p "${BACKUP_DIR}/logs"
}

# Backup MongoDB
backup_mongodb() {
    log "Starting MongoDB backup..."

    MONGODB_BACKUP_DIR="${BACKUP_DIR}/mongodb/backup_${DATE}"

    docker exec ${MONGODB_CONTAINER} mongodump \
        --username="${MONGODB_USER}" \
        --password="${MONGODB_PASSWORD}" \
        --authenticationDatabase=admin \
        --db=${MONGODB_DATABASE} \
        --out=/backups/mongodb/backup_${DATE}

    # Compress backup
    cd "${BACKUP_DIR}/mongodb"
    tar -czf "mongodb_backup_${DATE}.tar.gz" "backup_${DATE}"
    rm -rf "backup_${DATE}"

    log "MongoDB backup completed: mongodb_backup_${DATE}.tar.gz"
}

# Backup configuration files
backup_config() {
    log "Backing up configuration files..."

    CONFIG_BACKUP_DIR="${BACKUP_DIR}/config/config_${DATE}"
    mkdir -p "${CONFIG_BACKUP_DIR}"

    # Backup important config files
    cp .env.production "${CONFIG_BACKUP_DIR}/" 2>/dev/null || warning ".env.production not found"
    cp -r mosquitto/config "${CONFIG_BACKUP_DIR}/mosquitto" 2>/dev/null || warning "mosquitto config not found"
    cp -r nginx/conf.d "${CONFIG_BACKUP_DIR}/nginx" 2>/dev/null || warning "nginx config not found"

    # Compress backup
    cd "${BACKUP_DIR}/config"
    tar -czf "config_backup_${DATE}.tar.gz" "config_${DATE}"
    rm -rf "config_${DATE}"

    log "Configuration backup completed: config_backup_${DATE}.tar.gz"
}

# Backup timelapse images (last 7 days only to save space)
backup_timelapse() {
    log "Backing up timelapse images (last 7 days)..."

    TIMELAPSE_BACKUP_DIR="${BACKUP_DIR}/timelapse/timelapse_${DATE}"
    mkdir -p "${TIMELAPSE_BACKUP_DIR}"

    # Find and copy timelapse images from last 7 days
    find backend/timelapse -type f -mtime -7 -exec cp {} "${TIMELAPSE_BACKUP_DIR}/" \; 2>/dev/null || warning "No timelapse images found"

    # Compress backup
    cd "${BACKUP_DIR}/timelapse"
    tar -czf "timelapse_backup_${DATE}.tar.gz" "timelapse_${DATE}"
    rm -rf "timelapse_${DATE}"

    log "Timelapse backup completed: timelapse_backup_${DATE}.tar.gz"
}

# Backup application logs
backup_logs() {
    log "Backing up application logs..."

    LOGS_BACKUP_DIR="${BACKUP_DIR}/logs/logs_${DATE}"
    mkdir -p "${LOGS_BACKUP_DIR}"

    # Copy logs
    cp -r backend/logs/* "${LOGS_BACKUP_DIR}/" 2>/dev/null || warning "No logs found"

    # Compress backup
    cd "${BACKUP_DIR}/logs"
    tar -czf "logs_backup_${DATE}.tar.gz" "logs_${DATE}"
    rm -rf "logs_${DATE}"

    log "Logs backup completed: logs_backup_${DATE}.tar.gz"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."

    find "${BACKUP_DIR}/mongodb" -name "mongodb_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}/config" -name "config_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}/timelapse" -name "timelapse_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}/logs" -name "logs_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

    log "Cleanup completed"
}

# Calculate backup size
calculate_backup_size() {
    TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
    log "Total backup size: ${TOTAL_SIZE}"
}

# Main backup function
main() {
    log "=== Starting Grow Monitoring System Backup ==="
    log "Backup directory: ${BACKUP_DIR}"
    log "Retention period: ${RETENTION_DAYS} days"

    create_backup_dirs
    backup_mongodb
    backup_config
    backup_timelapse
    backup_logs
    cleanup_old_backups
    calculate_backup_size

    log "=== Backup completed successfully ==="
}

# Run main function
main "$@"
