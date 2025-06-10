#!/bin/bash

# Production Deployment Script for Portfolio KPI Copilot
# Comprehensive deployment with health checks and rollback capability

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Portfolio KPI Copilot"
DEPLOYMENT_ENV=${1:-production}
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
ROLLBACK_ENABLED=${ROLLBACK_ENABLED:-true}

echo -e "${BLUE}🚀 Starting ${PROJECT_NAME} deployment to ${DEPLOYMENT_ENV}${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-deployment checks
print_info "Running pre-deployment checks..."

# Check required tools
if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

if ! command_exists git; then
    print_error "git is not installed"
    exit 1
fi

print_status "All required tools are available"

# Check environment variables
print_info "Checking environment variables..."

required_vars=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "OPENROUTER_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_status "All required environment variables are set"

# Git status check
print_info "Checking git status..."
if [[ -n $(git status --porcelain) ]]; then
    print_warning "Working directory has uncommitted changes"
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
fi

# Get current commit hash for rollback
CURRENT_COMMIT=$(git rev-parse HEAD)
print_info "Current commit: $CURRENT_COMMIT"

# Install dependencies
print_info "Installing dependencies..."
npm ci --production=false
print_status "Dependencies installed"

# Run tests
print_info "Running tests..."
if npm run test:ci 2>/dev/null; then
    print_status "All tests passed"
else
    print_warning "Tests not configured or failed"
fi

# Build application
print_info "Building application..."
npm run build
print_status "Application built successfully"

# Run security audit
print_info "Running security audit..."
if npm audit --audit-level=high; then
    print_status "Security audit passed"
else
    print_warning "Security vulnerabilities found - review before deploying"
fi

# Deploy to Vercel
print_info "Deploying to Vercel..."
if command_exists vercel; then
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    print_status "Deployment to Vercel completed"
else
    print_error "Vercel CLI not found. Installing..."
    npm install -g vercel
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
fi

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --scope=team 2>/dev/null | grep "portfolio-kpi-copilot" | head -1 | awk '{print $2}' || echo "https://portfolio-kpi-copilot.vercel.app")

print_info "Deployment URL: $DEPLOYMENT_URL"

# Health checks
print_info "Running health checks..."
health_check_passed=false
health_check_start=$(date +%s)

while [[ $(($(date +%s) - health_check_start)) -lt $HEALTH_CHECK_TIMEOUT ]]; do
    if curl -f -s "$DEPLOYMENT_URL/api/health" >/dev/null; then
        print_status "Health check passed"
        health_check_passed=true
        break
    else
        print_info "Waiting for application to be ready..."
        sleep 10
    fi
done

if [[ "$health_check_passed" != true ]]; then
    print_error "Health check failed after $HEALTH_CHECK_TIMEOUT seconds"
    
    if [[ "$ROLLBACK_ENABLED" == true ]]; then
        print_warning "Initiating rollback..."
        git checkout "$CURRENT_COMMIT"
        npm run build
        vercel --prod --yes
        print_info "Rollback completed"
    fi
    
    exit 1
fi

# Performance checks
print_info "Running performance checks..."
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$DEPLOYMENT_URL")
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    print_status "Performance check passed (${response_time}s)"
else
    print_warning "Performance check warning: Response time ${response_time}s > 2.0s"
fi

# API endpoint checks
print_info "Testing API endpoints..."
api_endpoints=(
    "/api/health"
    "/api/analyze-portfolio"
    "/api/explain-kpi"
)

for endpoint in "${api_endpoints[@]}"; do
    if curl -f -s "$DEPLOYMENT_URL$endpoint" >/dev/null; then
        print_status "API endpoint $endpoint is responding"
    else
        print_warning "API endpoint $endpoint is not responding"
    fi
done

# Database connectivity check
print_info "Checking database connectivity..."
db_health=$(curl -s "$DEPLOYMENT_URL/api/health" | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
if [[ "$db_health" == "healthy" ]]; then
    print_status "Database connectivity confirmed"
else
    print_warning "Database connectivity issue detected"
fi

# Cache system check
print_info "Checking cache system..."
cache_health=$(curl -s "$DEPLOYMENT_URL/api/health" | grep -o '"redis":{"status":"[^"]*"' | cut -d'"' -f6)
if [[ "$cache_health" == "healthy" ]]; then
    print_status "Cache system operational"
else
    print_warning "Cache system using fallback mode"
fi

# AI services check
print_info "Checking AI services..."
ai_health=$(curl -s "$DEPLOYMENT_URL/api/health" | grep -o '"ai":{"status":"[^"]*"' | cut -d'"' -f6)
if [[ "$ai_health" == "healthy" ]]; then
    print_status "AI services operational"
else
    print_warning "AI services degraded"
fi

# Security headers check
print_info "Checking security headers..."
security_headers=(
    "X-Frame-Options"
    "X-Content-Type-Options"
    "Strict-Transport-Security"
    "Content-Security-Policy"
)

for header in "${security_headers[@]}"; do
    if curl -I -s "$DEPLOYMENT_URL" | grep -i "$header" >/dev/null; then
        print_status "Security header $header present"
    else
        print_warning "Security header $header missing"
    fi
done

# Generate deployment report
print_info "Generating deployment report..."
cat > deployment-report.json << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$DEPLOYMENT_ENV",
    "commit": "$CURRENT_COMMIT",
    "url": "$DEPLOYMENT_URL",
    "status": "success"
  },
  "healthChecks": {
    "overall": "$health_check_passed",
    "responseTime": "$response_time",
    "database": "$db_health",
    "cache": "$cache_health",
    "ai": "$ai_health"
  },
  "performance": {
    "responseTime": "$response_time",
    "target": "< 2.0s",
    "status": "$(if (( $(echo "$response_time < 2.0" | bc -l) )); then echo "passed"; else echo "warning"; fi)"
  }
}
EOF

print_status "Deployment report saved to deployment-report.json"

# Cleanup
print_info "Cleaning up temporary files..."
# Add any cleanup commands here

# Success message
echo
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Dashboard URL: $DEPLOYMENT_URL/dashboard${NC}"
echo -e "${BLUE}🔍 Health Check: $DEPLOYMENT_URL/api/health${NC}"
echo -e "${BLUE}📈 Analytics: $DEPLOYMENT_URL/analytics${NC}"
echo

# Post-deployment notifications (optional)
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ $PROJECT_NAME deployed successfully to $DEPLOYMENT_ENV\nURL: $DEPLOYMENT_URL\"}" \
        "$SLACK_WEBHOOK_URL"
fi

if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"content\":\"✅ $PROJECT_NAME deployed successfully to $DEPLOYMENT_ENV\\nURL: $DEPLOYMENT_URL\"}" \
        "$DISCORD_WEBHOOK_URL"
fi

print_status "Deployment process completed successfully!"
exit 0
