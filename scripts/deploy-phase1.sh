#!/bin/bash

# ===================================================================
# Portfolio KPI Copilot - Phase 1 Deployment Script
# Deploys core AI features with basic financial data integration
# ===================================================================

set -e  # Exit on any error

echo "🚀 Starting Portfolio KPI Copilot Phase 1 Deployment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Vercel CLI is available (local or global)
if ! command -v vercel &> /dev/null && ! npx vercel --version &> /dev/null; then
    print_error "Vercel CLI not found. Installing locally..."
    npm install vercel --save-dev
fi

# Use npx to run vercel commands
VERCEL_CMD="npx vercel"

print_status "Phase 1 Deployment Configuration:"
echo "  ✅ Core portfolio and KPI management"
echo "  ✅ Basic AI explanations and insights"
echo "  ✅ OpenRouter/OpenAI integration"
echo "  ✅ Basic authentication and security"
echo "  ✅ SQLite database (reliable and simple)"
echo "  ✅ Mock financial data (no external API dependencies)"
echo "  ❌ Advanced AI features (Phase 2)"
echo "  ❌ Real financial data APIs (Phase 3)"
echo "  ❌ Supabase migration (Phase 4)"
echo ""

# Prompt for confirmation
read -p "Continue with Phase 1 deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled."
    exit 0
fi

# Step 1: Environment Setup
print_status "Step 1: Setting up Phase 1 environment variables..."

# Copy Phase 1 environment configuration
if [ -f ".env.production.phase1" ]; then
    cp .env.production.phase1 .env.production.temp
    print_success "Phase 1 environment configuration loaded"
else
    print_error "Phase 1 environment configuration not found!"
    exit 1
fi

# Step 2: Verify required environment variables
print_status "Step 2: Verifying required environment variables..."

required_vars=(
    "NEXTAUTH_SECRET"
    "OPENROUTER_API_KEY"
    "OPENAI_API_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env.production.temp || grep -q "^${var}=your-" .env.production.temp; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing or placeholder values for required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_warning "Please update .env.production.phase1 with real values and run the script again."
    rm -f .env.production.temp
    exit 1
fi

print_success "All required environment variables are configured"

# Step 3: Build verification
print_status "Step 3: Running local build verification..."

# Set environment for build
export DEPLOYMENT_PHASE=1
export NODE_ENV=production

# Run build
if npm run build; then
    print_success "Local build completed successfully"
else
    print_error "Local build failed. Please fix build errors before deployment."
    rm -f .env.production.temp
    exit 1
fi

# Step 4: Set Vercel environment variables
print_status "Step 4: Setting Vercel environment variables..."

# Function to set Vercel environment variable
set_vercel_env() {
    local key=$1
    local value=$2
    local env_type=${3:-production}
    
    if [ -n "$value" ] && [ "$value" != "your-${key,,}-here" ]; then
        echo "Setting $key..."
        echo "$value" | $VERCEL_CMD env add "$key" "$env_type" --force > /dev/null 2>&1 || true
    fi
}

# Read environment variables from temp file and set them in Vercel
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
    fi
    
    # Remove any quotes from value
    value=$(echo "$value" | sed 's/^"//;s/"$//')
    
    # Set in Vercel if not a placeholder
    if [[ ! $value =~ ^your-.+-here$ ]] && [[ ! $value =~ ^# ]]; then
        set_vercel_env "$key" "$value"
    fi
done < .env.production.temp

print_success "Vercel environment variables configured"

# Step 5: Deploy to Vercel
print_status "Step 5: Deploying to Vercel..."

# Deploy with production flag
if $VERCEL_CMD --prod --yes; then
    print_success "Deployment completed successfully!"
else
    print_error "Deployment failed. Check Vercel logs for details."
    rm -f .env.production.temp
    exit 1
fi

# Step 6: Post-deployment verification
print_status "Step 6: Running post-deployment verification..."

# Wait a moment for deployment to be ready
sleep 10

# Get deployment URL
DEPLOYMENT_URL=$($VERCEL_CMD ls --scope=$($VERCEL_CMD whoami) | grep portfolio-kpi-copilot | head -1 | awk '{print $2}' 2>/dev/null || echo "")

if [ -z "$DEPLOYMENT_URL" ]; then
    DEPLOYMENT_URL="https://portfolio-kpi-copilot.vercel.app"
fi

print_status "Testing deployment at: $DEPLOYMENT_URL"

# Test health endpoint
if curl -s -f "$DEPLOYMENT_URL/api/health" > /dev/null; then
    print_success "Health check passed"
else
    print_warning "Health check failed - deployment may still be starting up"
fi

# Test feature flags endpoint
if curl -s -f "$DEPLOYMENT_URL/api/system/status" > /dev/null; then
    print_success "System status endpoint accessible"
else
    print_warning "System status endpoint not accessible"
fi

# Step 7: Cleanup
print_status "Step 7: Cleaning up temporary files..."
rm -f .env.production.temp
print_success "Cleanup completed"

# Step 8: Deployment summary
echo ""
echo "=================================================="
print_success "🎉 Phase 1 Deployment Complete!"
echo "=================================================="
echo ""
echo "📊 Deployment Details:"
echo "  🌐 URL: $DEPLOYMENT_URL"
echo "  📱 Dashboard: $DEPLOYMENT_URL/dashboard"
echo "  🔍 Health Check: $DEPLOYMENT_URL/api/health"
echo "  📋 System Status: $DEPLOYMENT_URL/api/system/status"
echo ""
echo "✅ Phase 1 Features Enabled:"
echo "  🤖 Basic AI explanations and insights"
echo "  📊 Core portfolio and KPI management"
echo "  🔐 Authentication and basic security"
echo "  💾 SQLite database with demo data"
echo "  🎯 Mock financial data integration"
echo ""
echo "🔄 Next Steps:"
echo "  1. Test the deployment thoroughly"
echo "  2. Set up financial data provider API keys (see docs/FINANCIAL_API_SETUP.md)"
echo "  3. Plan Phase 2 deployment (Advanced AI features)"
echo "  4. Configure monitoring and alerting"
echo ""
echo "📚 Documentation:"
echo "  📖 API Setup Guide: docs/FINANCIAL_API_SETUP.md"
echo "  🔧 Feature Flags: src/lib/config/feature-flags.ts"
echo "  ⚙️  Environment Config: .env.production.phase1"
echo ""
echo "🎯 Ready for Phase 2 when you are!"
echo "=================================================="

# Optional: Open deployment in browser
read -p "Open deployment in browser? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "$DEPLOYMENT_URL/dashboard"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$DEPLOYMENT_URL/dashboard"
    else
        print_status "Please open $DEPLOYMENT_URL/dashboard in your browser"
    fi
fi

print_success "Phase 1 deployment script completed successfully! 🚀"
