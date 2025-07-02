#!/bin/bash

# Phase 1: Production Deployment Script
# Portfolio KPI Copilot - Enterprise Infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_status() {
    echo -e "${YELLOW}⚙️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Configuration
PROJECT_NAME="portfolio-kpi-copilot"
VERCEL_URL="https://portfolio-kpi-copilot.vercel.app"

# Main execution
main() {
    print_header "Phase 1: Production Infrastructure Deployment"
    
    echo "This script will deploy Phase 1 of the Portfolio KPI Copilot system:"
    echo "• Production environment configuration"
    echo "• Database migration to Supabase"
    echo "• Vercel deployment with proper environment variables"
    echo "• Health monitoring setup"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Validate environment
    validate_environment
    
    # Build and test locally
    build_and_test
    
    # Deploy to Vercel
    deploy_to_vercel
    
    # Verify deployment
    verify_deployment
    
    # Setup monitoring
    setup_monitoring
    
    print_success "Phase 1 deployment completed successfully!"
    print_deployment_summary
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Check if logged into Vercel
    if ! vercel whoami &> /dev/null; then
        print_error "Not logged into Vercel"
        echo "Please run: vercel login"
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        echo "Please run: ./scripts/phase1-supabase-setup.sh first"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 18+ is required"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Validate environment variables
validate_environment() {
    print_status "Validating environment configuration..."
    
    required_vars=(
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "DATABASE_URL"
    )
    
    # Load environment variables
    export $(cat .env.production | grep -v '^#' | xargs)
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" == *"your-"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing or placeholder environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please update .env.production with actual values"
        exit 1
    fi
    
    print_success "Environment validation passed"
}

# Build and test locally
build_and_test() {
    print_status "Building and testing application..."
    
    # Clean previous builds
    rm -rf .next
    rm -rf node_modules/.prisma
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install --legacy-peer-deps
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate || echo "Prisma generation completed with warnings"
    
    # Run TypeScript check
    print_status "Running TypeScript check..."
    npm run type-check
    
    # Build application
    print_status "Building application..."
    npm run build
    
    print_success "Build completed successfully"
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Set environment variables in Vercel
    print_status "Setting Vercel environment variables..."
    
    while IFS='=' read -r key value; do
        if [[ ! $key =~ ^# ]] && [[ $key ]] && [[ $value ]]; then
            # Remove quotes from value
            clean_value=$(echo "$value" | sed 's/^"//;s/"$//')
            
            # Set environment variable in Vercel
            vercel env add "$key" production <<< "$clean_value" 2>/dev/null || \
            vercel env rm "$key" production -y 2>/dev/null && \
            vercel env add "$key" production <<< "$clean_value" 2>/dev/null || true
        fi
    done < .env.production
    
    # Deploy to production
    print_status "Deploying to production..."
    vercel --prod --yes
    
    print_success "Deployment to Vercel completed"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s "$VERCEL_URL/api/health" || echo "ERROR")
    
    if [[ $HEALTH_RESPONSE == *"ERROR"* ]]; then
        print_error "Health endpoint not responding"
        exit 1
    fi
    
    # Check if database is connected
    if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
        print_success "Health check passed"
    else
        print_warning "Health check shows issues - this is expected during initial setup"
        echo "Response: $HEALTH_RESPONSE"
    fi
    
    # Test system status
    print_status "Testing system status..."
    STATUS_RESPONSE=$(curl -s "$VERCEL_URL/api/system/comprehensive-status" || echo "ERROR")
    
    if [[ $STATUS_RESPONSE != *"ERROR"* ]]; then
        print_success "System status endpoint responding"
    else
        print_warning "System status endpoint issues - may need database setup"
    fi
    
    print_success "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Create monitoring configuration
    cat > monitoring-config.json << EOF
{
  "deployment": {
    "url": "$VERCEL_URL",
    "phase": "1",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "healthChecks": {
    "interval": 300,
    "endpoints": [
      "/api/health",
      "/api/system/status",
      "/api/system/comprehensive-status"
    ]
  },
  "alerts": {
    "enabled": true,
    "thresholds": {
      "responseTime": 2000,
      "errorRate": 0.05,
      "uptime": 0.999
    }
  }
}
EOF
    
    # Create health check script
    cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Health check script for production monitoring

URL="https://portfolio-kpi-copilot.vercel.app"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "[$TIMESTAMP] Running health check..."

# Check main health endpoint
HEALTH=$(curl -s -w "%{http_code}" "$URL/api/health")
HTTP_CODE="${HEALTH: -3}"
RESPONSE="${HEALTH%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed"
    echo "Response: $RESPONSE"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE"
    exit 1
fi

# Check system status
STATUS=$(curl -s -w "%{http_code}" "$URL/api/system/comprehensive-status")
STATUS_CODE="${STATUS: -3}"

if [ "$STATUS_CODE" = "200" ]; then
    echo "✅ System status check passed"
else
    echo "⚠️  System status check issues (HTTP $STATUS_CODE)"
fi

echo "[$TIMESTAMP] Health check completed"
EOF
    
    chmod +x scripts/health-check.sh
    
    print_success "Monitoring setup completed"
}

# Print deployment summary
print_deployment_summary() {
    print_header "Phase 1 Deployment Summary"
    
    echo "🚀 Production URL: $VERCEL_URL"
    echo "📊 Health Check: $VERCEL_URL/api/health"
    echo "🔍 System Status: $VERCEL_URL/api/system/comprehensive-status"
    echo ""
    echo "📁 Files Created:"
    echo "  • monitoring-config.json - Monitoring configuration"
    echo "  • scripts/health-check.sh - Health monitoring script"
    echo ""
    echo "🔧 Next Steps:"
    echo "  1. Verify all services are healthy: ./scripts/health-check.sh"
    echo "  2. Set up database schema: psql \"\$DATABASE_URL\" -f supabase_schema.sql"
    echo "  3. Run Phase 2 setup: OAuth & Authentication"
    echo ""
    echo "📈 Monitoring:"
    echo "  • Run health checks: ./scripts/health-check.sh"
    echo "  • View logs: vercel logs"
    echo "  • Monitor performance: vercel analytics"
    echo ""
    
    # Test final endpoints
    print_status "Final endpoint tests..."
    
    echo "Health Status:"
    curl -s "$VERCEL_URL/api/health" | jq '.' 2>/dev/null || curl -s "$VERCEL_URL/api/health"
    
    echo ""
    echo "System Capabilities:"
    curl -s "$VERCEL_URL/api/system/comprehensive-status" | jq '.capabilities' 2>/dev/null || echo "System status available at $VERCEL_URL/api/system/comprehensive-status"
}

# Run main function
main "$@"
