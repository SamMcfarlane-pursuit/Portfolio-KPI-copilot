#!/bin/bash

# Portfolio KPI Copilot - Vercel Deployment Script
# This script handles the complete deployment process to Vercel

set -e

echo "🚀 Portfolio KPI Copilot - Vercel Deployment"
echo "============================================="

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
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

print_status "Step 1: Pre-deployment checks..."

# Check if build passes
print_status "Running build check..."
if npm run build; then
    print_success "Build successful!"
else
    print_error "Build failed. Please fix errors before deploying."
    exit 1
fi

print_status "Step 2: Preparing for deployment..."

# Add all changes to git
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    print_status "No changes to commit."
else
    print_status "Committing changes..."
    git commit -m "feat: optimized build for production deployment

- Fixed all TypeScript errors and build issues
- Optimized API routes and error handling
- Enhanced security and performance features
- Updated Vercel configuration for new routes
- Ready for production deployment"
fi

print_status "Step 3: Pushing to repository..."
git push origin main

print_status "Step 4: Deploying to Vercel..."

# Deploy to production
if vercel --prod --yes; then
    print_success "Deployment successful!"
    echo ""
    print_success "🎉 Portfolio KPI Copilot deployed successfully!"
    print_status "URL: https://portfolio-kpi-copilot.vercel.app"
    echo ""
    print_status "Next steps:"
    echo "1. Configure environment variables in Vercel dashboard"
    echo "2. Set up OAuth providers (Google, GitHub, etc.)"
    echo "3. Configure Supabase connection"
    echo "4. Set up AI service API keys"
    echo "5. Test the deployment"
    echo ""
    print_status "Environment variables to configure:"
    echo "- NEXTAUTH_SECRET"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_ANON_KEY"
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo "- OPENROUTER_API_KEY"
    echo "- OPENAI_API_KEY"
    echo "- GOOGLE_CLIENT_ID"
    echo "- GOOGLE_CLIENT_SECRET"
    echo ""
else
    print_error "Deployment failed!"
    exit 1
fi

print_success "Deployment process completed!"
