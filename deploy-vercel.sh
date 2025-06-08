#!/bin/bash

# Portfolio KPI Copilot - Vercel Deployment Script
# This script prepares and deploys the application to Vercel

echo "🚀 Portfolio KPI Copilot - Vercel Deployment"
echo "============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build to check for errors
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check environment variables
echo "🔍 Checking environment variables..."

required_vars=(
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "GITHUB_ID"
    "GITHUB_SECRET"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "⚠️  Warning: The following environment variables are not set locally:"
    printf '%s\n' "${missing_vars[@]}"
    echo "Make sure to set them in Vercel Dashboard!"
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo "Make sure you have:"
echo "1. ✅ Set all environment variables in Vercel Dashboard"
echo "2. ✅ Updated OAuth redirect URIs"
echo "3. ✅ Configured custom domain (if needed)"

read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "📱 Your app is now live!"
        echo "🔗 Check your Vercel dashboard for the URL"
        echo ""
        echo "🧪 Next steps:"
        echo "1. Test authentication flows"
        echo "2. Verify API endpoints"
        echo "3. Check system health"
        echo "4. Test KPI functionality"
    else
        echo "❌ Deployment failed!"
        echo "Check Vercel logs for details"
    fi
else
    echo "❌ Deployment cancelled"
fi

echo "============================================="
