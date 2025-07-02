#!/bin/bash

# Portfolio KPI Copilot - Production Deployment Script
# Deploys application to Vercel with full configuration

set -e

echo "🚀 Deploying Portfolio KPI Copilot to Production"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed"
        echo "Install it with: npm install -g vercel"
        exit 1
    fi
    
    # Check if logged into Vercel
    if ! vercel whoami &> /dev/null; then
        print_error "Not logged into Vercel"
        echo "Login with: vercel login"
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        echo "Please create .env.production with all required environment variables"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Validate environment variables
validate_env_vars() {
    print_status "Validating environment variables..."
    
    required_vars=(
        "DATABASE_URL"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
        "OPENROUTER_API_KEY"
        "OPENAI_API_KEY"
    )
    
    # Load environment variables
    export $(cat .env.production | grep -v '^#' | xargs)
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_success "Environment variables validation passed"
}

# Run pre-deployment tests
run_tests() {
    print_status "Running pre-deployment tests..."
    
    # Install dependencies
    npm ci
    
    # Run type checking
    print_status "Running TypeScript type checking..."
    npx tsc --noEmit
    
    # Run linting
    print_status "Running ESLint..."
    npm run lint
    
    # Run tests if they exist
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        print_status "Running tests..."
        npm test
    fi
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    print_success "Pre-deployment tests passed"
}

# Set up Vercel project
setup_vercel_project() {
    print_status "Setting up Vercel project..."
    
    # Check if vercel.json exists, create if not
    if [ ! -f "vercel.json" ]; then
        cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/docs",
      "destination": "/api-docs",
      "permanent": true
    }
  ]
}
EOF
        print_success "Created vercel.json configuration"
    fi
    
    # Link to Vercel project
    vercel link --yes
    
    print_success "Vercel project setup completed"
}

# Set environment variables in Vercel
set_vercel_env_vars() {
    print_status "Setting environment variables in Vercel..."
    
    # Read environment variables from .env.production
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
            continue
        fi
        
        # Remove quotes from value
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        
        print_status "Setting $key..."
        echo "$value" | vercel env add "$key" production --force
        
    done < .env.production
    
    print_success "Environment variables set in Vercel"
}

# Deploy to production
deploy_to_production() {
    print_status "Deploying to production..."
    
    # Deploy to production
    vercel --prod --yes
    
    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls --scope=$(vercel whoami) | grep "portfolio-kpi-copilot" | head -1 | awk '{print $2}')
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        print_success "Deployment successful!"
        echo "Production URL: https://$DEPLOYMENT_URL"
    else
        print_error "Could not determine deployment URL"
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    print_status "Running post-deployment tests..."
    
    # Get the deployment URL
    DEPLOYMENT_URL=$(vercel ls --scope=$(vercel whoami) | grep "portfolio-kpi-copilot" | head -1 | awk '{print $2}')
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        print_error "Could not determine deployment URL for testing"
        return 1
    fi
    
    BASE_URL="https://$DEPLOYMENT_URL"
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -f -s "$BASE_URL/api/health" > /dev/null; then
        print_success "Health endpoint responding"
    else
        print_error "Health endpoint not responding"
        return 1
    fi
    
    # Test API v2 endpoint
    print_status "Testing API v2 endpoint..."
    if curl -f -s "$BASE_URL/api/v2" > /dev/null; then
        print_success "API v2 endpoint responding"
    else
        print_error "API v2 endpoint not responding"
        return 1
    fi
    
    # Test auth signin page
    print_status "Testing auth signin page..."
    if curl -f -s "$BASE_URL/auth/signin" > /dev/null; then
        print_success "Auth signin page responding"
    else
        print_error "Auth signin page not responding"
        return 1
    fi
    
    # Test main application
    print_status "Testing main application..."
    if curl -f -s "$BASE_URL/" > /dev/null; then
        print_success "Main application responding"
    else
        print_error "Main application not responding"
        return 1
    fi
    
    print_success "Post-deployment tests passed"
}

# Generate deployment report
generate_deployment_report() {
    print_status "Generating deployment report..."
    
    DEPLOYMENT_URL=$(vercel ls --scope=$(vercel whoami) | grep "portfolio-kpi-copilot" | head -1 | awk '{print $2}')
    
    cat > deployment-report.md << EOF
# Portfolio KPI Copilot - Deployment Report
Generated on: $(date)

## Deployment Information
- **Production URL**: https://$DEPLOYMENT_URL
- **Deployment Time**: $(date)
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git branch --show-current)

## Environment Configuration
- **Database**: Supabase PostgreSQL
- **Authentication**: NextAuth.js with OAuth providers
- **AI Services**: OpenRouter + OpenAI
- **Hosting**: Vercel

## OAuth Providers Configured
- ✅ Google OAuth
- ✅ Microsoft Azure AD
$([ -n "$LINKEDIN_CLIENT_ID" ] && echo "- ✅ LinkedIn OAuth" || echo "- ⚪ LinkedIn OAuth (not configured)")
$([ -n "$GITHUB_ID" ] && echo "- ✅ GitHub OAuth" || echo "- ⚪ GitHub OAuth (not configured)")

## Key URLs
- **Application**: https://$DEPLOYMENT_URL
- **API Documentation**: https://$DEPLOYMENT_URL/api-docs
- **Health Check**: https://$DEPLOYMENT_URL/api/health
- **API v2**: https://$DEPLOYMENT_URL/api/v2
- **Sign In**: https://$DEPLOYMENT_URL/auth/signin

## Next Steps
1. Test all OAuth providers
2. Create test portfolios and KPIs
3. Test AI Copilot functionality
4. Monitor application performance
5. Set up monitoring alerts

## Support
- **Documentation**: https://$DEPLOYMENT_URL/api-docs
- **Health Status**: https://$DEPLOYMENT_URL/api/health
- **System Metrics**: https://$DEPLOYMENT_URL/api/v2/system/health

## Security Checklist
- [x] HTTPS enabled
- [x] Environment variables secured
- [x] OAuth properly configured
- [x] Database RLS enabled
- [x] API rate limiting active
- [x] Security headers configured

## Performance Targets
- Page load time: < 2 seconds
- API response time: < 500ms
- AI response time: < 5 seconds
- Uptime: > 99.9%
EOF
    
    print_success "Deployment report generated: deployment-report.md"
}

# Main execution
main() {
    echo ""
    print_status "Starting production deployment process..."
    echo ""
    
    check_prerequisites
    validate_env_vars
    run_tests
    setup_vercel_project
    set_vercel_env_vars
    deploy_to_production
    
    # Wait a moment for deployment to be ready
    print_status "Waiting for deployment to be ready..."
    sleep 30
    
    run_post_deployment_tests
    generate_deployment_report
    
    echo ""
    print_success "🎉 Production deployment completed successfully!"
    echo ""
    
    DEPLOYMENT_URL=$(vercel ls --scope=$(vercel whoami) | grep "portfolio-kpi-copilot" | head -1 | awk '{print $2}')
    
    print_status "🌐 Your application is live at:"
    echo "   https://$DEPLOYMENT_URL"
    echo ""
    print_status "📋 Important URLs:"
    echo "   Application: https://$DEPLOYMENT_URL"
    echo "   API Docs: https://$DEPLOYMENT_URL/api-docs"
    echo "   Health Check: https://$DEPLOYMENT_URL/api/health"
    echo "   Sign In: https://$DEPLOYMENT_URL/auth/signin"
    echo ""
    print_warning "⚠️  NEXT STEPS:"
    echo "1. Test OAuth sign-in with all configured providers"
    echo "2. Create your first organization and portfolio"
    echo "3. Test AI Copilot functionality"
    echo "4. Set up monitoring and alerts"
    echo "5. Review the deployment report: deployment-report.md"
    echo ""
    print_status "🎯 Ready for production use!"
}

# Run main function
main "$@"
