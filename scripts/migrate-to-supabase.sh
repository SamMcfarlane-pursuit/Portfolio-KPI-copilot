#!/bin/bash

# ===================================================================
# PORTFOLIO KPI COPILOT - SUPABASE MIGRATION SCRIPT
# Critical Database Migration for Production Fix
# ===================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

echo "🚀 Portfolio KPI Copilot - Supabase Migration"
echo "=============================================="
echo ""

# Step 1: Check prerequisites
print_status "INFO" "Checking prerequisites..."

if ! command -v npx &> /dev/null; then
    print_status "ERROR" "npx is required but not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_status "ERROR" "Node.js is required but not installed"
    exit 1
fi

if [ ! -f "package.json" ]; then
    print_status "ERROR" "package.json not found. Run from project root."
    exit 1
fi

print_status "SUCCESS" "Prerequisites check passed"

# Step 2: Install Supabase CLI if not present
print_status "INFO" "Checking Supabase CLI..."

if ! command -v supabase &> /dev/null; then
    print_status "WARNING" "Supabase CLI not found. Installing locally..."
    npm install supabase --save-dev
    print_status "SUCCESS" "Supabase CLI installed locally"
else
    print_status "SUCCESS" "Supabase CLI found"
fi

# Step 3: Update Prisma schema (already done)
print_status "INFO" "Verifying Prisma schema for PostgreSQL..."

if grep -q "provider = \"postgresql\"" prisma/schema.prisma; then
    print_status "SUCCESS" "Prisma schema configured for PostgreSQL"
else
    print_status "ERROR" "Prisma schema not configured for PostgreSQL"
    exit 1
fi

# Step 4: Generate Prisma client
print_status "INFO" "Generating Prisma client..."
npx prisma generate
print_status "SUCCESS" "Prisma client generated"

# Step 5: Create Supabase migration
print_status "INFO" "Creating Supabase migration files..."

# Create migration directory if it doesn't exist
mkdir -p supabase/migrations

# Generate SQL migration from Prisma schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > supabase/migrations/$(date +%Y%m%d%H%M%S)_initial_migration.sql

print_status "SUCCESS" "Migration files created"

# Step 6: Create deployment script
print_status "INFO" "Creating deployment script..."

cat > scripts/deploy-supabase-migration.sh << 'EOF'
#!/bin/bash

# Supabase Migration Deployment Script
set -e

echo "🚀 Deploying Supabase Migration..."

# Check if Supabase URL and keys are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Supabase environment variables not set"
    echo "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Run Prisma migration
echo "📊 Running Prisma migration..."
npx prisma migrate deploy

# Seed initial data if needed
echo "🌱 Seeding initial data..."
if [ -f "scripts/seed-data.ts" ]; then
    npx tsx scripts/seed-data.ts
fi

echo "✅ Supabase migration completed successfully!"
EOF

chmod +x scripts/deploy-supabase-migration.sh
print_status "SUCCESS" "Deployment script created"

# Step 7: Create environment setup guide
print_status "INFO" "Creating environment setup guide..."

cat > SUPABASE_SETUP_GUIDE.md << 'EOF'
# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Note down your project URL and API keys

## 2. Configure Environment Variables

Update these variables in Vercel dashboard:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]

# Migration settings
USE_SUPABASE_PRIMARY=true
FALLBACK_TO_SQLITE=false
```

## 3. Deploy Migration

```bash
# Run migration deployment
./scripts/deploy-supabase-migration.sh
```

## 4. Verify Deployment

```bash
# Test database connection
curl "https://portfolio-kpi-copilot.vercel.app/api/health"
```
EOF

print_status "SUCCESS" "Setup guide created"

# Step 8: Update package.json scripts
print_status "INFO" "Updating package.json scripts..."

# Add migration scripts to package.json
npm pkg set scripts.migrate="prisma migrate deploy"
npm pkg set scripts.migrate:dev="prisma migrate dev"
npm pkg set scripts.migrate:reset="prisma migrate reset"
npm pkg set scripts.db:seed="tsx scripts/seed-data.ts"
npm pkg set scripts.supabase:deploy="./scripts/deploy-supabase-migration.sh"

print_status "SUCCESS" "Package.json scripts updated"

echo ""
echo "🎉 Supabase Migration Setup Complete!"
echo "======================================"
echo ""
print_status "INFO" "Next Steps:"
echo "1. Create Supabase project at https://supabase.com"
echo "2. Update environment variables in Vercel dashboard"
echo "3. Run: npm run supabase:deploy"
echo "4. Test deployment: curl https://portfolio-kpi-copilot.vercel.app/api/health"
echo ""
print_status "WARNING" "Don't forget to update .env.production.supabase with your actual Supabase credentials!"
