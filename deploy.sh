#!/bin/bash

# Portfolio KPI Copilot - Production Deployment Script
# This script deploys your application to Vercel

echo "🚀 Starting Portfolio KPI Copilot Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Ensure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Run final build check
echo "🔍 Running final build check..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Generate Prisma client for production
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "🎉 Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Set up your environment variables in Vercel dashboard"
echo "2. Configure your OAuth providers"
echo "3. Set up your OpenAI API key"
echo "4. Test your deployment"
echo ""
echo "🔗 Your app will be available at: https://your-app-name.vercel.app"
