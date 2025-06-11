#!/bin/bash

# ===================================================================
# PORTFOLIO KPI COPILOT - PRODUCTION DEPLOYMENT FIX
# Critical fixes for database and API routing issues
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

echo "🚀 Portfolio KPI Copilot - Production Deployment Fix"
echo "===================================================="
echo ""

# Step 1: Check current deployment status
print_status "INFO" "Checking current deployment status..."

# Test current API endpoints
echo "Testing API endpoints..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://portfolio-kpi-copilot.vercel.app/api/health" || echo "000")
PORTFOLIOS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://portfolio-kpi-copilot.vercel.app/api/portfolios" || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    print_status "SUCCESS" "Health endpoint responding"
else
    print_status "ERROR" "Health endpoint failing (Status: $HEALTH_STATUS)"
fi

if [ "$PORTFOLIOS_STATUS" = "401" ]; then
    print_status "WARNING" "Portfolios endpoint requires authentication (Status: $PORTFOLIOS_STATUS)"
elif [ "$PORTFOLIOS_STATUS" = "200" ]; then
    print_status "SUCCESS" "Portfolios endpoint responding"
else
    print_status "ERROR" "Portfolios endpoint failing (Status: $PORTFOLIOS_STATUS)"
fi

# Step 2: Generate Prisma client for PostgreSQL
print_status "INFO" "Generating Prisma client for PostgreSQL..."
npx prisma generate
print_status "SUCCESS" "Prisma client generated"

# Step 3: Create database migration SQL
print_status "INFO" "Creating database migration SQL..."

# Create migration directory
mkdir -p migrations/supabase

# Generate migration SQL
cat > migrations/supabase/001_initial_schema.sql << 'EOF'
-- Portfolio KPI Copilot - Initial Database Schema
-- Generated for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (NextAuth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    password TEXT,
    role TEXT DEFAULT 'ANALYST',
    department TEXT,
    title TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ,
    "loginAttempts" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    settings TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Organization users junction table
CREATE TABLE IF NOT EXISTS organization_users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "organizationId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'VIEWER',
    permissions TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("userId", "organizationId")
);

-- Funds table
CREATE TABLE IF NOT EXISTS funds (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    "fundNumber" TEXT,
    vintage INTEGER,
    strategy TEXT,
    status TEXT DEFAULT 'ACTIVE',
    "totalSize" DOUBLE PRECISION,
    currency TEXT DEFAULT 'USD',
    "organizationId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    description TEXT,
    sector TEXT,
    geography TEXT,
    status TEXT DEFAULT 'ACTIVE',
    investment DOUBLE PRECISION,
    ownership DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    currency TEXT DEFAULT 'USD',
    "isActive" BOOLEAN DEFAULT true,
    "fundId" TEXT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    "createdBy" TEXT REFERENCES users(id),
    "updatedBy" TEXT REFERENCES users(id),
    "deletedBy" TEXT REFERENCES users(id),
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    symbol TEXT UNIQUE NOT NULL,
    sector TEXT,
    industry TEXT,
    "marketCap" DOUBLE PRECISION,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT REFERENCES users(id),
    "updatedBy" TEXT REFERENCES users(id),
    "deletedBy" TEXT REFERENCES users(id),
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- KPIs table
CREATE TABLE IF NOT EXISTS kpis (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT,
    period TIMESTAMPTZ NOT NULL,
    "periodType" TEXT DEFAULT 'quarterly',
    currency TEXT,
    source TEXT,
    confidence DOUBLE PRECISION,
    notes TEXT,
    description TEXT,
    "targetValue" DOUBLE PRECISION,
    "isActive" BOOLEAN DEFAULT true,
    metadata TEXT,
    "fundId" TEXT REFERENCES funds(id) ON DELETE SET NULL,
    "portfolioId" TEXT REFERENCES portfolios(id) ON DELETE SET NULL,
    "companyId" TEXT REFERENCES companies(id) ON DELETE SET NULL,
    "organizationId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "createdBy" TEXT REFERENCES users(id),
    "updatedBy" TEXT REFERENCES users(id),
    "deletedBy" TEXT REFERENCES users(id),
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "userEmail" TEXT NOT NULL,
    action TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    changes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    "ipAddress" TEXT,
    "userAgent" TEXT
);

-- NextAuth tables
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    UNIQUE(identifier, token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs("entityType");
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs("entityId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_kpis_organization_id ON kpis("organizationId");
CREATE INDEX IF NOT EXISTS idx_kpis_portfolio_id ON kpis("portfolioId");
CREATE INDEX IF NOT EXISTS idx_kpis_period ON kpis(period);

-- Insert default organization if none exists
INSERT INTO organizations (id, name, slug, description)
SELECT 'default-org-' || uuid_generate_v4()::text, 'Default Organization', 'default-org', 'Default organization for Portfolio KPI Copilot'
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

-- Insert default fund
INSERT INTO funds (id, name, "fundNumber", vintage, strategy, "totalSize", "organizationId")
SELECT 
    'default-fund-' || uuid_generate_v4()::text,
    'Growth Fund I',
    'GF-I',
    EXTRACT(YEAR FROM NOW())::INTEGER,
    'Growth Equity',
    1000000000,
    (SELECT id FROM organizations LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM funds LIMIT 1);
EOF

print_status "SUCCESS" "Database migration SQL created"

# Step 4: Create deployment verification script
print_status "INFO" "Creating deployment verification script..."

cat > scripts/verify-production-fix.sh << 'EOF'
#!/bin/bash

echo "🔍 Verifying Production Deployment Fix..."

# Test API endpoints
echo "Testing API endpoints..."

# Health check
HEALTH_RESPONSE=$(curl -s "https://portfolio-kpi-copilot.vercel.app/api/health")
echo "Health API: $HEALTH_RESPONSE"

# System status
STATUS_RESPONSE=$(curl -s "https://portfolio-kpi-copilot.vercel.app/api/system/status")
echo "System Status: $STATUS_RESPONSE"

# Auth verification
AUTH_RESPONSE=$(curl -s "https://portfolio-kpi-copilot.vercel.app/api/auth/verify-setup")
echo "Auth Setup: $AUTH_RESPONSE"

echo "✅ Verification complete"
EOF

chmod +x scripts/verify-production-fix.sh
print_status "SUCCESS" "Verification script created"

# Step 5: Create Vercel environment variables template
print_status "INFO" "Creating Vercel environment variables template..."

cat > VERCEL_ENV_VARIABLES.txt << 'EOF'
# ===================================================================
# VERCEL ENVIRONMENT VARIABLES - COPY TO VERCEL DASHBOARD
# Portfolio KPI Copilot Production Deployment
# ===================================================================

# CRITICAL: Replace these placeholder values with actual credentials

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]

# NextAuth Configuration
NEXTAUTH_URL=https://portfolio-kpi-copilot.vercel.app
NEXTAUTH_SECRET=knMDkhzRoqpySGulJY4qhE7sA1EuOqvZGCorD+605VQ=

# OAuth Providers (Already configured)
GOOGLE_CLIENT_ID=952865856234-p2ub78oa1udq8ng89146lri5pj1mdc7m.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[YOUR-GOOGLE-CLIENT-SECRET]
GITHUB_ID=[YOUR-GITHUB-CLIENT-ID]
GITHUB_SECRET=[YOUR-GITHUB-CLIENT-SECRET]
AZURE_AD_CLIENT_ID=[YOUR-AZURE-CLIENT-ID]
AZURE_AD_CLIENT_SECRET=[YOUR-AZURE-CLIENT-SECRET]
AZURE_AD_TENANT_ID=[YOUR-AZURE-TENANT-ID]

# AI Configuration
OPENAI_API_KEY=[YOUR-OPENAI-API-KEY]
OPENAI_MODEL=gpt-4o-mini
DISABLE_OPENAI=false

# Feature Flags
USE_SUPABASE_PRIMARY=true
FALLBACK_TO_SQLITE=false
ENABLE_REALTIME_SUBSCRIPTIONS=true

# Environment
NODE_ENV=production
EOF

print_status "SUCCESS" "Environment variables template created"

echo ""
echo "🎉 Production Deployment Fix Complete!"
echo "====================================="
echo ""
print_status "INFO" "Next Steps:"
echo "1. Create Supabase project at https://supabase.com"
echo "2. Run the SQL migration in Supabase SQL Editor:"
echo "   - Copy content from migrations/supabase/001_initial_schema.sql"
echo "3. Update Vercel environment variables:"
echo "   - Copy from VERCEL_ENV_VARIABLES.txt to Vercel dashboard"
echo "4. Redeploy on Vercel"
echo "5. Run verification: ./scripts/verify-production-fix.sh"
echo ""
print_status "WARNING" "Don't forget to replace all placeholder values with actual credentials!"
