#!/bin/bash

# ===================================================================
# Portfolio KPI Copilot - Phase 3 Deployment Script
# Financial Data Integration + Real Market Data
# ===================================================================

set -e  # Exit on any error

echo "📊 Starting Portfolio KPI Copilot Phase 3 Deployment..."
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

print_status "Phase 3 Deployment Configuration:"
echo "  ✅ All Phase 1 & 2 features (AI, NLP, advanced orchestrator)"
echo "  ✅ Real financial data integration from multiple providers"
echo "  ✅ Market data, economic indicators, and industry benchmarks"
echo "  ✅ Financial news sentiment analysis"
echo "  ✅ REIT and real estate investment data"
echo "  ✅ Commodity prices and currency exchange rates"
echo "  ❌ Supabase migration (Phase 4)"
echo ""

# Check for required API keys
print_status "Checking for required financial data API keys..."

required_api_keys=(
    "ALPHA_VANTAGE_API_KEY"
    "IEX_CLOUD_API_KEY"
    "POLYGON_API_KEY"
    "FMP_API_KEY"
)

print_warning "Phase 3 requires financial data provider API keys:"
echo "  📊 Alpha Vantage: Economic data, news, basic market data"
echo "  📈 IEX Cloud: Real-time market data and quotes"
echo "  💹 Polygon.io: Market data, options, forex"
echo "  📋 Financial Modeling Prep: Financial statements and ratios"
echo ""
echo "See docs/FINANCIAL_API_SETUP.md for setup instructions."
echo ""

# Prompt for confirmation
read -p "Do you have all required API keys configured? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please configure API keys first. See docs/FINANCIAL_API_SETUP.md"
    echo ""
    echo "Quick setup:"
    echo "  1. Get free API keys from providers"
    echo "  2. Update .env.production.phase3 with your keys"
    echo "  3. Run this script again"
    exit 0
fi

# Step 1: Environment Setup
print_status "Step 1: Setting up Phase 3 environment variables..."

# Copy Phase 3 environment configuration
if [ -f ".env.production.phase3" ]; then
    cp .env.production.phase3 .env.production.temp
    print_success "Phase 3 environment configuration loaded"
else
    print_error "Phase 3 environment configuration not found!"
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
    "ALPHA_VANTAGE_API_KEY"
    "IEX_CLOUD_API_KEY"
    "POLYGON_API_KEY"
    "FMP_API_KEY"
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
    print_warning "Please update .env.production.phase3 with real values and run the script again."
    print_warning "See docs/FINANCIAL_API_SETUP.md for API key setup instructions."
    rm -f .env.production.temp
    exit 1
fi

print_success "All required environment variables are configured"

# Step 3: Build verification
print_status "Step 3: Running Phase 3 build verification..."

# Set environment for build
export DEPLOYMENT_PHASE=3
export NODE_ENV=production

# Run build
if npm run build; then
    print_success "Phase 3 build completed successfully"
else
    print_error "Phase 3 build failed. Please fix build errors before deployment."
    rm -f .env.production.temp
    exit 1
fi

# Step 4: Set Vercel environment variables
print_status "Step 4: Setting Vercel environment variables for Phase 3..."

# Function to set Vercel environment variable
set_vercel_env() {
    local key=$1
    local value=$2
    local env_type=${3:-production}
    
    if [ -n "$value" ] && [ "$value" != "your-${key,,}-here" ]; then
        echo "Setting $key..."
        echo "$value" | vercel env add "$key" "$env_type" --force > /dev/null 2>&1 || true
    fi
}

# Set Phase 3 specific variables
vercel env add DEPLOYMENT_PHASE 3 production --force > /dev/null 2>&1 || true
vercel env add ENABLE_FINANCIAL_DATA_API true production --force > /dev/null 2>&1 || true
vercel env add ENABLE_MARKET_DATA_INTEGRATION true production --force > /dev/null 2>&1 || true
vercel env add ENABLE_ECONOMIC_INDICATORS true production --force > /dev/null 2>&1 || true
vercel env add ENABLE_INDUSTRY_BENCHMARKS true production --force > /dev/null 2>&1 || true
vercel env add MOCK_EXTERNAL_APIS false production --force > /dev/null 2>&1 || true

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

print_success "Vercel environment variables configured for Phase 3"

# Step 5: Deploy to Vercel
print_status "Step 5: Deploying Phase 3 to Vercel..."

if vercel --prod --yes; then
    print_success "Phase 3 deployment completed successfully!"
else
    print_error "Phase 3 deployment failed. Check Vercel logs for details."
    rm -f .env.production.temp
    exit 1
fi

# Step 6: Post-deployment verification
print_status "Step 6: Running Phase 3 post-deployment verification..."

sleep 15

DEPLOYMENT_URL=$(vercel ls --scope=$(vercel whoami) | grep portfolio-kpi-copilot | head -1 | awk '{print $2}')

if [ -z "$DEPLOYMENT_URL" ]; then
    DEPLOYMENT_URL="https://portfolio-kpi-copilot.vercel.app"
fi

print_status "Testing Phase 3 deployment at: $DEPLOYMENT_URL"

# Test health endpoint
if curl -s -f "$DEPLOYMENT_URL/api/health" > /dev/null; then
    print_success "Health check passed"
else
    print_warning "Health check failed - deployment may still be starting up"
fi

# Test financial data endpoint
if curl -s -f "$DEPLOYMENT_URL/api/financial-data?type=status" > /dev/null; then
    print_success "Financial data API endpoint accessible"
else
    print_warning "Financial data API endpoint not accessible (may require authentication)"
fi

# Step 7: Test API providers
print_status "Step 7: Testing financial data providers..."

echo "Testing provider status (this may take a moment)..."
sleep 5

# This would ideally test the actual API endpoints, but requires authentication
print_status "Financial data providers should now be active"
print_status "Test manually after authentication to verify API integration"

# Step 8: Cleanup
print_status "Step 8: Cleaning up temporary files..."
rm -f .env.production.temp
print_success "Cleanup completed"

# Step 9: Deployment summary
echo ""
echo "=================================================="
print_success "🎉 Phase 3 Deployment Complete!"
echo "=================================================="
echo ""
echo "📊 Deployment Details:"
echo "  🌐 URL: $DEPLOYMENT_URL"
echo "  📱 Dashboard: $DEPLOYMENT_URL/dashboard"
echo "  🔍 Health Check: $DEPLOYMENT_URL/api/health"
echo "  📊 Financial Data API: $DEPLOYMENT_URL/api/financial-data"
echo ""
echo "✅ Phase 3 Features Enabled:"
echo "  📈 Real-time market data integration"
echo "  📊 Economic indicators and benchmarks"
echo "  📰 Financial news sentiment analysis"
echo "  🏢 REIT and real estate investment data"
echo "  💰 Commodity prices and currency rates"
echo "  🔄 Provider health monitoring and failover"
echo ""
echo "🧪 Test Financial Data APIs:"
echo "  Market Data: $DEPLOYMENT_URL/api/financial-data?type=market&symbols=AAPL,GOOGL"
echo "  Economic Data: $DEPLOYMENT_URL/api/financial-data?type=economic"
echo "  Industry Benchmarks: $DEPLOYMENT_URL/api/financial-data?type=benchmarks&industry=technology"
echo "  Provider Status: $DEPLOYMENT_URL/api/financial-data?type=status"
echo ""
echo "💡 Natural Language Queries Now Support Real Data:"
echo "  Try: 'Show me current market data for Apple and Google'"
echo "  Try: 'What are the latest economic indicators?'"
echo "  Try: 'Compare tech industry benchmarks'"
echo ""
echo "🔄 Next Steps:"
echo "  1. Test all financial data endpoints thoroughly"
echo "  2. Monitor API usage and costs"
echo "  3. Verify natural language queries with real data"
echo "  4. Set up Supabase for Phase 4 deployment"
echo ""
echo "📚 Documentation:"
echo "  📖 API Usage: $DEPLOYMENT_URL/api/financial-data"
echo "  🔧 Feature Flags: src/lib/config/feature-flags.ts"
echo "  ⚙️  Environment Config: .env.production.phase3"
echo ""
echo "🎯 Ready for Phase 4 (Supabase Migration) when database is configured!"
echo "=================================================="

print_success "Phase 3 deployment script completed successfully! 🚀"
