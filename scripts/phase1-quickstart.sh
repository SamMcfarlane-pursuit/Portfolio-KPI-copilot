#!/bin/bash

# Phase 1 Quick Start Script
# Portfolio KPI Copilot - Production Infrastructure Setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# Main execution
main() {
    print_header "Phase 1 Quick Start: Production Infrastructure"
    
    echo "This script will guide you through setting up production infrastructure for"
    echo "the Portfolio KPI Copilot system in the correct order:"
    echo ""
    echo "1. 🗄️  Database Setup (Supabase PostgreSQL)"
    echo "2. ⚡ Caching Setup (Redis - Optional)"
    echo "3. 🔧 Environment Configuration"
    echo "4. 🚀 Production Deployment"
    echo "5. 📊 Health Monitoring"
    echo ""
    
    read -p "Ready to start Phase 1 setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Step 1: Database Setup
    setup_database
    
    # Step 2: Caching Setup (Optional)
    setup_caching
    
    # Step 3: Environment Configuration
    configure_environment
    
    # Step 4: Production Deployment
    deploy_production
    
    # Step 5: Health Monitoring
    setup_monitoring
    
    # Final validation
    final_validation
    
    print_success "Phase 1 setup completed successfully!"
    show_next_steps
}

# Step 1: Database Setup
setup_database() {
    print_header "Step 1: Database Setup (Supabase)"
    
    echo "You need to set up a Supabase PostgreSQL database."
    echo ""
    echo "📋 Prerequisites:"
    echo "  • Supabase account (free tier available)"
    echo "  • New Supabase project created"
    echo "  • Project URL, anon key, and service role key"
    echo ""
    
    read -p "Do you have a Supabase project ready? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Please complete these steps first:"
        echo "1. Go to https://supabase.com and create an account"
        echo "2. Create a new project"
        echo "3. Go to Settings > API to get your keys"
        echo "4. Go to Settings > Database to get your connection string"
        echo ""
        echo "Then run this script again."
        exit 0
    fi
    
    # Run Supabase setup
    print_status "Running Supabase setup script..."
    if [ -f "./scripts/phase1-supabase-setup.sh" ]; then
        ./scripts/phase1-supabase-setup.sh
        print_success "Database setup completed"
    else
        print_error "Supabase setup script not found"
        exit 1
    fi
}

# Step 2: Caching Setup
setup_caching() {
    print_header "Step 2: Caching Setup (Redis - Optional)"
    
    echo "Redis caching will improve performance but is optional for Phase 1."
    echo ""
    echo "📋 Redis Provider Options:"
    echo "  • Upstash (Recommended for Vercel) - Serverless Redis"
    echo "  • Railway - Simple setup with good pricing"
    echo "  • Redis Cloud - Managed by Redis Labs"
    echo "  • Skip for now - Can be added later"
    echo ""
    
    read -p "Do you want to set up Redis caching now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "📖 Please follow the Redis setup guide:"
        echo "   cat scripts/phase1-redis-setup.md"
        echo ""
        echo "After setting up Redis, add these to your .env.production:"
        echo "   REDIS_URL=\"your-redis-connection-string\""
        echo "   ENABLE_REDIS_CACHING=\"true\""
        echo ""
        read -p "Press Enter when Redis is configured..."
        
        # Validate Redis configuration
        if grep -q "REDIS_URL=" .env.production && ! grep -q "your-redis" .env.production; then
            print_success "Redis configuration found"
        else
            print_warning "Redis configuration not found - continuing without caching"
        fi
    else
        print_info "Skipping Redis setup - can be added later"
        
        # Disable Redis in environment
        if [ -f ".env.production" ]; then
            sed -i.bak 's/ENABLE_REDIS_CACHING="true"/ENABLE_REDIS_CACHING="false"/' .env.production
        fi
    fi
}

# Step 3: Environment Configuration
configure_environment() {
    print_header "Step 3: Environment Configuration"
    
    print_status "Validating environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        echo "The Supabase setup should have created this file."
        exit 1
    fi
    
    # Check for placeholder values
    PLACEHOLDER_COUNT=$(grep -c "your-" .env.production || true)
    
    if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
        print_warning "Found $PLACEHOLDER_COUNT placeholder values in .env.production"
        echo ""
        echo "Please update these placeholder values:"
        grep "your-" .env.production || true
        echo ""
        read -p "Press Enter after updating the placeholder values..."
        
        # Re-check
        PLACEHOLDER_COUNT=$(grep -c "your-" .env.production || true)
        if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
            print_error "Placeholder values still found. Please update all 'your-*' values."
            exit 1
        fi
    fi
    
    print_success "Environment configuration validated"
}

# Step 4: Production Deployment
deploy_production() {
    print_header "Step 4: Production Deployment"
    
    echo "This will deploy your application to Vercel with the production configuration."
    echo ""
    
    read -p "Ready to deploy to production? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Skipping deployment - you can run it later with:"
        echo "   ./scripts/phase1-deploy.sh"
        return
    fi
    
    # Run deployment script
    print_status "Running production deployment..."
    if [ -f "./scripts/phase1-deploy.sh" ]; then
        ./scripts/phase1-deploy.sh
        print_success "Production deployment completed"
    else
        print_error "Deployment script not found"
        exit 1
    fi
}

# Step 5: Health Monitoring
setup_monitoring() {
    print_header "Step 5: Health Monitoring"
    
    print_status "Setting up health monitoring..."
    
    # Create monitoring script if it doesn't exist
    if [ ! -f "./scripts/health-check.sh" ]; then
        print_status "Creating health check script..."
        
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
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "[$TIMESTAMP] Health check completed"
EOF
        
        chmod +x scripts/health-check.sh
    fi
    
    # Run initial health check
    print_status "Running initial health check..."
    if ./scripts/health-check.sh; then
        print_success "Health monitoring setup completed"
    else
        print_warning "Health check issues detected - this may be normal during initial setup"
    fi
}

# Final validation
final_validation() {
    print_header "Final Validation"
    
    print_status "Running final system validation..."
    
    # Check deployment URL
    URL="https://portfolio-kpi-copilot.vercel.app"
    
    print_status "Testing production endpoints..."
    
    # Test health endpoint
    if curl -s "$URL/api/health" > /dev/null; then
        print_success "Health endpoint responding"
    else
        print_error "Health endpoint not responding"
    fi
    
    # Test system status
    if curl -s "$URL/api/system/comprehensive-status" > /dev/null; then
        print_success "System status endpoint responding"
    else
        print_warning "System status endpoint issues"
    fi
    
    print_success "Final validation completed"
}

# Show next steps
show_next_steps() {
    print_header "Phase 1 Complete - Next Steps"
    
    echo "🎉 Congratulations! Phase 1 infrastructure setup is complete."
    echo ""
    echo "📊 Your production system is now running at:"
    echo "   https://portfolio-kpi-copilot.vercel.app"
    echo ""
    echo "🔍 Monitor your system:"
    echo "   Health Check: ./scripts/health-check.sh"
    echo "   System Status: https://portfolio-kpi-copilot.vercel.app/api/system/comprehensive-status"
    echo ""
    echo "📋 Phase 1 Checklist:"
    echo "   Review: cat PHASE1_EXECUTION_CHECKLIST.md"
    echo ""
    echo "🚀 Ready for Phase 2?"
    echo "   Phase 2 will set up:"
    echo "   • OAuth authentication (Google, LinkedIn, GitHub)"
    echo "   • Role-based access control (RBAC)"
    echo "   • Security hardening"
    echo "   • User management system"
    echo ""
    echo "📞 Need help?"
    echo "   • Check logs: vercel logs"
    echo "   • View metrics: vercel analytics"
    echo "   • Documentation: docs/ directory"
    echo ""
    
    read -p "Would you like to start Phase 2 setup now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Phase 2 setup will be available soon!"
        echo "For now, verify Phase 1 is working correctly and review the checklist."
    else
        print_info "Phase 1 complete! Run Phase 2 setup when ready."
    fi
}

# Run main function
main "$@"
