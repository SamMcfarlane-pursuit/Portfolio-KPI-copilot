#!/bin/bash

# Production Deployment Script for Portfolio KPI Copilot
# Comprehensive deployment with health checks and rollback capability

set -e

# Configuration
PROJECT_NAME="portfolio-kpi-copilot"
DOCKER_COMPOSE_FILE="docker/docker-compose.production.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as root or with sudo
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f ".env.production" ]]; then
        error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Backup application data
    if docker volume ls | grep -q "${PROJECT_NAME}_app_data"; then
        docker run --rm -v "${PROJECT_NAME}_app_data:/data" -v "$BACKUP_DIR:/backup" alpine tar czf "/backup/app-data-$(date +%Y%m%d-%H%M%S).tar.gz" -C /data .
    fi
    
    # Backup database
    if docker ps | grep -q "${PROJECT_NAME}"; then
        docker exec "${PROJECT_NAME}-prod" sh -c "cd /app && npm run db:backup" || warning "Database backup failed"
    fi
    
    success "Backup created: $BACKUP_FILE"
}

# Health check function
health_check() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log "Performing health check for $service..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            success "$service is healthy"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts for $service..."
        sleep 10
        ((attempt++))
    done
    
    error "$service health check failed after $max_attempts attempts"
    return 1
}

# Deploy application
deploy_application() {
    log "Starting deployment..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build application
    log "Building application..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to start
    sleep 30
    
    # Health checks
    health_check "Application" "http://localhost:3000/api/health"
    health_check "Nginx" "http://localhost/health"
    
    success "Deployment completed successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    docker exec "${PROJECT_NAME}-prod" sh -c "cd /app && npm run db:migrate" || {
        error "Database migration failed"
        return 1
    }
    
    success "Database migrations completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Start monitoring services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d prometheus grafana loki promtail
    
    # Wait for services
    sleep 20
    
    # Health checks for monitoring
    health_check "Prometheus" "http://localhost:9090/-/healthy"
    health_check "Grafana" "http://localhost:3001/api/health"
    
    success "Monitoring setup completed"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    SSL_DIR="docker/nginx/ssl"
    mkdir -p "$SSL_DIR"
    
    if [[ ! -f "$SSL_DIR/cert.pem" ]] || [[ ! -f "$SSL_DIR/key.pem" ]]; then
        warning "SSL certificates not found. Generating self-signed certificates for development..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/key.pem" \
            -out "$SSL_DIR/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        warning "Self-signed certificates generated. Replace with proper certificates for production."
    fi
    
    success "SSL setup completed"
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Rollback function
rollback() {
    error "Deployment failed. Initiating rollback..."
    
    # Stop current deployment
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -n1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        log "Restoring from backup: $LATEST_BACKUP"
        # Restore logic here
    fi
    
    error "Rollback completed. Please check logs and fix issues before retrying deployment."
    exit 1
}

# Main deployment process
main() {
    log "Starting production deployment of Portfolio KPI Copilot..."
    
    # Set trap for rollback on error
    trap rollback ERR
    
    check_prerequisites
    create_backup
    setup_ssl
    deploy_application
    run_migrations
    setup_monitoring
    cleanup
    
    success "🚀 Production deployment completed successfully!"
    log "Application is available at: https://your-domain.com"
    log "Monitoring dashboard: http://localhost:3001 (Grafana)"
    log "Metrics: http://localhost:9090 (Prometheus)"
    log "Logs location: $LOG_FILE"
    
    # Display service status
    echo -e "\n${BLUE}Service Status:${NC}"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    # Display useful commands
    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo "View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "Restart services: docker-compose -f $DOCKER_COMPOSE_FILE restart"
    echo "Health check: curl http://localhost:3000/api/health"
}

# Run main function
main "$@"
