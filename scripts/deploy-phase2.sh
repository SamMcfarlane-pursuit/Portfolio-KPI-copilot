#!/bin/bash

# ===================================================================
# Portfolio KPI Copilot - Phase 2 Deployment Script
# Advanced AI Features + Natural Language Processing
# ===================================================================

set -e  # Exit on any error

echo "🤖 Starting Portfolio KPI Copilot Phase 2 Deployment..."
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

print_status "Phase 2 Deployment Configuration:"
echo "  ✅ All Phase 1 features (Core AI, portfolio management)"
echo "  ✅ Natural language KPI queries and processing"
echo "  ✅ Advanced AI orchestrator with provider management"
echo "  ✅ Streaming AI responses for real-time interactions"
echo "  ✅ AI analytics and performance tracking"
echo "  ✅ Enhanced caching and performance optimization"
echo "  ❌ Real financial data APIs (Phase 3)"
echo "  ❌ Supabase migration (Phase 4)"
echo ""

# Prompt for confirmation
read -p "Continue with Phase 2 deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled."
    exit 0
fi

# Step 1: Environment Setup
print_status "Step 1: Setting up Phase 2 environment variables..."

# Copy Phase 2 environment configuration
if [ -f ".env.production.phase2" ]; then
    cp .env.production.phase2 .env.production.temp
    print_success "Phase 2 environment configuration loaded"
else
    print_error "Phase 2 environment configuration not found!"
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
    print_warning "Please update .env.production.phase2 with real values and run the script again."
    rm -f .env.production.temp
    exit 1
fi

print_success "All required environment variables are configured"

# Step 3: Build verification
print_status "Step 3: Running Phase 2 build verification..."

# Set environment for build
export DEPLOYMENT_PHASE=2
export NODE_ENV=production

# Run build
if npm run build; then
    print_success "Phase 2 build completed successfully"
else
    print_error "Phase 2 build failed. Please fix build errors before deployment."
    rm -f .env.production.temp
    exit 1
fi

# Step 4: Set Vercel environment variables
print_status "Step 4: Setting Vercel environment variables for Phase 2..."

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

# Set Phase 2 specific variables
$VERCEL_CMD env add DEPLOYMENT_PHASE 2 production --force > /dev/null 2>&1 || true
$VERCEL_CMD env add ENABLE_NATURAL_LANGUAGE_QUERIES true production --force > /dev/null 2>&1 || true
$VERCEL_CMD env add ENABLE_ADVANCED_AI_ORCHESTRATOR true production --force > /dev/null 2>&1 || true
$VERCEL_CMD env add ENABLE_STREAMING_RESPONSES true production --force > /dev/null 2>&1 || true
$VERCEL_CMD env add ENABLE_AI_ANALYTICS true production --force > /dev/null 2>&1 || true

# Read and set other environment variables
while IFS='=' read -r key value; do
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
    fi
    
    value=$(echo "$value" | sed 's/^"//;s/"$//')
    
    if [[ ! $value =~ ^your-.+-here$ ]] && [[ ! $value =~ ^# ]]; then
        set_vercel_env "$key" "$value"
    fi
done < .env.production.temp

print_success "Vercel environment variables configured for Phase 2"

# Step 5: Deploy to Vercel
print_status "Step 5: Deploying Phase 2 to Vercel..."

if $VERCEL_CMD --prod --yes; then
    print_success "Phase 2 deployment completed successfully!"
else
    print_error "Phase 2 deployment failed. Check Vercel logs for details."
    rm -f .env.production.temp
    exit 1
fi

# Step 6: Post-deployment verification
print_status "Step 6: Running Phase 2 post-deployment verification..."

sleep 10

DEPLOYMENT_URL=$($VERCEL_CMD ls --scope=$($VERCEL_CMD whoami) | grep portfolio-kpi-copilot | head -1 | awk '{print $2}' 2>/dev/null || echo "")

if [ -z "$DEPLOYMENT_URL" ]; then
    DEPLOYMENT_URL="https://portfolio-kpi-copilot.vercel.app"
fi

print_status "Testing Phase 2 deployment at: $DEPLOYMENT_URL"

# Test health endpoint
if curl -s -f "$DEPLOYMENT_URL/api/health" > /dev/null; then
    print_success "Health check passed"
else
    print_warning "Health check failed - deployment may still be starting up"
fi

# Test natural language endpoint
if curl -s -f "$DEPLOYMENT_URL/api/ai/natural-language" > /dev/null; then
    print_success "Natural language API endpoint accessible"
else
    print_warning "Natural language API endpoint not accessible (may require authentication)"
fi

# Step 7: Cleanup
print_status "Step 7: Cleaning up temporary files..."
rm -f .env.production.temp
print_success "Cleanup completed"

# Step 8: Deployment summary
echo ""
echo "=================================================="
print_success "🎉 Phase 2 Deployment Complete!"
echo "=================================================="
echo ""
echo "📊 Deployment Details:"
echo "  🌐 URL: $DEPLOYMENT_URL"
echo "  📱 Dashboard: $DEPLOYMENT_URL/dashboard"
echo "  🔍 Health Check: $DEPLOYMENT_URL/api/health"
echo "  🤖 Natural Language API: $DEPLOYMENT_URL/api/ai/natural-language"
echo ""
echo "✅ Phase 2 Features Enabled:"
echo "  🗣️  Natural language KPI queries"
echo "  🤖 Advanced AI orchestrator"
echo "  ⚡ Streaming AI responses"
echo "  📊 AI analytics and performance tracking"
echo "  🔄 Enhanced caching and optimization"
echo ""
echo "🧪 Test Natural Language Queries:"
echo "  Try: 'Show me tech companies with ROE > 15%'"
echo "  Try: 'Compare revenue growth for Series A vs Series B'"
echo "  Try: 'Analyze EBITDA trends for healthcare portfolios'"
echo ""
echo "🔄 Next Steps:"
echo "  1. Test natural language query functionality"
echo "  2. Monitor AI performance and costs"
echo "  3. Set up financial data provider API keys"
echo "  4. Plan Phase 3 deployment (Financial Data Integration)"
echo ""
echo "📚 Documentation:"
echo "  📖 API Setup Guide: docs/FINANCIAL_API_SETUP.md"
echo "  🔧 Feature Flags: src/lib/config/feature-flags.ts"
echo "  ⚙️  Environment Config: .env.production.phase2"
echo ""
echo "🎯 Ready for Phase 3 when financial API keys are configured!"
echo "=================================================="

print_success "Phase 2 deployment script completed successfully! 🚀"
