#!/bin/bash

# 🚀 Portfolio KPI Copilot - Vercel Deployment Script
# This script handles local to Vercel deployment integration

set -e

echo "🚀 Portfolio KPI Copilot - Vercel Deployment"
echo "=============================================="

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

# Check if user is logged in to Vercel
print_status "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please log in:"
    vercel login
fi

# Get current git branch
CURRENT_BRANCH=$(git branch --show-current)
print_status "Current branch: $CURRENT_BRANCH"

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes. Committing them now..."
    git add .
    read -p "Enter commit message: " commit_message
    git commit -m "$commit_message"
fi

# Push to GitHub (triggers automatic Vercel deployment)
print_status "Pushing to GitHub..."
git push origin $CURRENT_BRANCH

# Wait a moment for GitHub to process
sleep 2

# Check deployment status
print_status "Checking deployment status..."
vercel ls --limit 1

# Get the latest deployment URL
DEPLOYMENT_URL=$(vercel ls --limit 1 --format plain | head -n 1 | awk '{print $2}')

if [ -n "$DEPLOYMENT_URL" ]; then
    print_success "Deployment successful!"
    print_success "URL: $DEPLOYMENT_URL"
    
    # Test the deployment
    print_status "Testing deployment..."
    if curl -f "$DEPLOYMENT_URL/api/health" &> /dev/null; then
        print_success "Health check passed!"
    else
        print_warning "Health check failed. Deployment may still be in progress."
    fi
    
    # Open in browser (optional)
    read -p "Open deployment in browser? (y/n): " open_browser
    if [ "$open_browser" = "y" ] || [ "$open_browser" = "Y" ]; then
        open "$DEPLOYMENT_URL"
    fi
else
    print_error "Could not retrieve deployment URL"
fi

print_success "Deployment script completed!"
