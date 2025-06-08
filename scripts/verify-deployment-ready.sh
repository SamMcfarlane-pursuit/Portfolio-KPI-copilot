#!/bin/bash

# Portfolio KPI Copilot - Deployment Readiness Verification Script
# This script verifies that the application is ready for Vercel deployment

echo "🔍 Portfolio KPI Copilot - Deployment Readiness Check"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
print_status() {
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    elif [ "$1" = "FAIL" ]; then
        echo -e "${RED}❌ $2${NC}"
        ((FAILED++))
    elif [ "$1" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
        ((WARNINGS++))
    else
        echo -e "${BLUE}ℹ️  $2${NC}"
    fi
}

echo ""
echo "🔧 Checking Build Requirements..."

# Check Node.js version
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v21* ]] || [[ $NODE_VERSION == v22* ]]; then
    print_status "PASS" "Node.js version: $NODE_VERSION"
else
    print_status "FAIL" "Node.js version: $NODE_VERSION (requires v18+)"
fi

# Check npm version
NPM_VERSION=$(npm --version)
if [[ $NPM_VERSION == 8* ]] || [[ $NPM_VERSION == 9* ]] || [[ $NPM_VERSION == 10* ]]; then
    print_status "PASS" "npm version: $NPM_VERSION"
else
    print_status "WARN" "npm version: $NPM_VERSION (recommended 8+)"
fi

# Check if package.json exists
if [ -f "package.json" ]; then
    print_status "PASS" "package.json found"
else
    print_status "FAIL" "package.json not found"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "PASS" "Dependencies installed"
else
    print_status "FAIL" "Dependencies not installed (run npm install)"
fi

echo ""
echo "🏗️  Testing Build Process..."

# Test TypeScript compilation
if npm run type-check > /dev/null 2>&1; then
    print_status "PASS" "TypeScript compilation successful"
else
    print_status "FAIL" "TypeScript compilation failed"
fi

# Test linting
if npm run lint > /dev/null 2>&1; then
    print_status "PASS" "ESLint checks passed"
else
    print_status "WARN" "ESLint warnings found"
fi

# Test build
echo "Building application (this may take a moment)..."
if npm run build > /dev/null 2>&1; then
    print_status "PASS" "Next.js build successful"
else
    print_status "FAIL" "Next.js build failed"
fi

echo ""
echo "📁 Checking Required Files..."

# Check for required configuration files
required_files=(
    "next.config.js"
    "tailwind.config.js"
    "tsconfig.json"
    "vercel.json"
    "prisma/schema.prisma"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "PASS" "$file exists"
    else
        print_status "FAIL" "$file missing"
    fi
done

# Check for required directories
required_dirs=(
    "src/app"
    "src/components"
    "src/lib"
    "prisma"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_status "PASS" "$dir directory exists"
    else
        print_status "FAIL" "$dir directory missing"
    fi
done

echo ""
echo "🔐 Checking Environment Configuration..."

# Check for environment files
if [ -f ".env.example" ]; then
    print_status "PASS" ".env.example template exists"
else
    print_status "WARN" ".env.example template missing"
fi

if [ -f ".env.production" ]; then
    print_status "PASS" ".env.production template exists"
else
    print_status "WARN" ".env.production template missing"
fi

echo ""
echo "🚀 Vercel Configuration Check..."

# Check vercel.json configuration
if [ -f "vercel.json" ]; then
    if grep -q "portfolio-kpi-copilot" vercel.json; then
        print_status "PASS" "Vercel project name configured"
    else
        print_status "WARN" "Vercel project name not set"
    fi
    
    if grep -q "nextjs" vercel.json; then
        print_status "PASS" "Vercel framework set to Next.js"
    else
        print_status "WARN" "Vercel framework not specified"
    fi
else
    print_status "FAIL" "vercel.json configuration missing"
fi

echo ""
echo "📊 Database Configuration..."

# Check Prisma configuration
if [ -f "prisma/schema.prisma" ]; then
    if grep -q "sqlite" prisma/schema.prisma; then
        print_status "PASS" "SQLite database configured"
    elif grep -q "postgresql" prisma/schema.prisma; then
        print_status "PASS" "PostgreSQL database configured"
    else
        print_status "WARN" "Database provider not clearly configured"
    fi
else
    print_status "FAIL" "Prisma schema missing"
fi

echo ""
echo "🤖 AI Integration Check..."

# Check for AI-related files
ai_files=(
    "src/lib/ai/openai.ts"
    "src/lib/ai/llama.ts"
)

for file in "${ai_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "PASS" "$file exists"
    else
        print_status "WARN" "$file missing (AI features may be limited)"
    fi
done

echo ""
echo "📈 Summary Report"
echo "=================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 DEPLOYMENT READY!${NC}"
    echo "Your Portfolio KPI Copilot is ready for Vercel deployment."
    echo ""
    echo "Next steps:"
    echo "1. Fix the 2 environment variables in Vercel dashboard:"
    echo "   - NEXTAUTH_URL: https://portfolio-kpi-copilot-production.vercel.app"
    echo "   - PINECONE_API_KEY: disabled-for-now"
    echo "2. Click Deploy in Vercel"
    echo "3. Update OAuth redirect URIs"
    echo "4. Test your live application"
else
    echo -e "${RED}🚨 DEPLOYMENT BLOCKED${NC}"
    echo "Please fix the failed checks before deploying."
    echo ""
    echo "Common fixes:"
    echo "- Run 'npm install' to install dependencies"
    echo "- Run 'npm run build' to test build process"
    echo "- Check that all required files exist"
fi

echo ""
echo "🔗 Useful commands:"
echo "- npm run build          # Test build locally"
echo "- npm run type-check     # Check TypeScript"
echo "- npm run lint           # Check code style"
echo "- npm run dev            # Start development server"

exit $FAILED
