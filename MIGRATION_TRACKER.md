# 🚀 Database Migration Tracker - Live Progress

## ⏱️ **15-MINUTE MIGRATION TO 100% PRODUCTION**

**Start Time**: $(date)
**Target**: 90%+ stability and full API functionality

---

## 📋 **STEP-BY-STEP CHECKLIST**

### **Step 1: Create Supabase Project (5 minutes)**
- [ ] **Navigate to Supabase**: https://supabase.com ✅ OPENED
- [ ] **Click "New Project"**
- [ ] **Fill Project Details**:
  - Organization: Your organization
  - Name: `portfolio-kpi-copilot`
  - Database Password: **GENERATE STRONG PASSWORD** (save it!)
  - Region: Choose closest to your location
- [ ] **Click "Create new project"**
- [ ] **Wait for creation** (2-3 minutes)

### **Step 2: Get Connection Details (2 minutes)**
- [ ] **Go to Settings → API** (in Supabase dashboard)
- [ ] **Copy Project URL**: `https://[PROJECT-REF].supabase.co`
- [ ] **Copy anon public key**: `eyJ...` (starts with eyJ)
- [ ] **Copy service_role key**: `eyJ...` (different from anon)
- [ ] **Note Database Password**: From Step 1

### **Step 3: Run Database Migration (3 minutes)**
- [ ] **Go to SQL Editor** (in Supabase dashboard)
- [ ] **Copy SQL** (provided below)
- [ ] **Paste into SQL Editor**
- [ ] **Click "Run"**
- [ ] **Verify Success**: Check for "Migration completed" message

### **Step 4: Update Vercel Environment (5 minutes)**
- [ ] **Go to Vercel**: https://vercel.com/dashboard
- [ ] **Select Project**: `portfolio-kpi-copilot`
- [ ] **Go to Settings → Environment Variables**
- [ ] **Add/Update Variables** (provided below)
- [ ] **Save All Variables**
- [ ] **Wait for Deployment** (3-5 minutes)

---

## 📊 **COMPLETE MIGRATION SQL**

Copy this entire SQL script into Supabase SQL Editor:

```sql
-- Portfolio KPI Copilot - Complete Database Migration
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (NextAuth compatible)
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

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_kpis_organization_id ON kpis("organizationId");
CREATE INDEX IF NOT EXISTS idx_kpis_portfolio_id ON kpis("portfolioId");
CREATE INDEX IF NOT EXISTS idx_kpis_period ON kpis(period);
CREATE INDEX IF NOT EXISTS idx_portfolios_fund_id ON portfolios("fundId");
CREATE INDEX IF NOT EXISTS idx_funds_organization_id ON funds("organizationId");

-- Insert default data
INSERT INTO organizations (id, name, slug, description)
SELECT 'default-org-' || uuid_generate_v4()::text, 'Portfolio KPI Demo', 'portfolio-kpi-demo', 'Demo organization for Portfolio KPI Copilot'
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

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

-- Insert sample portfolio
INSERT INTO portfolios (id, name, description, sector, geography, investment, ownership, "totalValue", "fundId")
SELECT 
    'sample-portfolio-' || uuid_generate_v4()::text,
    'TechCorp Solutions',
    'Leading SaaS platform for enterprise analytics',
    'Technology',
    'North America',
    25000000,
    35.5,
    45000000,
    (SELECT id FROM funds LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM portfolios LIMIT 1);

-- Insert sample KPIs
INSERT INTO kpis (name, category, value, unit, period, "portfolioId", "organizationId")
SELECT 
    'Annual Recurring Revenue',
    'Revenue',
    12500000,
    'USD',
    NOW() - INTERVAL '1 month',
    (SELECT id FROM portfolios LIMIT 1),
    (SELECT id FROM organizations LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM kpis WHERE name = 'Annual Recurring Revenue');

INSERT INTO kpis (name, category, value, unit, period, "portfolioId", "organizationId")
SELECT 
    'Customer Growth Rate',
    'Growth',
    25.5,
    'percent',
    NOW() - INTERVAL '1 month',
    (SELECT id FROM portfolios LIMIT 1),
    (SELECT id FROM organizations LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM kpis WHERE name = 'Customer Growth Rate');

-- Success confirmation
SELECT 'Database migration completed successfully! Tables created and sample data inserted.' as status;
```

---

## ⚙️ **VERCEL ENVIRONMENT VARIABLES**

Add these variables in Vercel Dashboard → Settings → Environment Variables:

```bash
# Database Configuration (CRITICAL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Migration Settings
USE_SUPABASE_PRIMARY=true
FALLBACK_TO_SQLITE=false
ENABLE_REALTIME_SUBSCRIPTIONS=true

# Ensure these are set (should already exist)
NEXTAUTH_URL=https://portfolio-kpi-copilot.vercel.app
NEXTAUTH_SECRET=knMDkhzRoqpySGulJY4qhE7sA1EuOqvZGCorD+605VQ=
NODE_ENV=production
```

**Replace placeholders**:
- `[YOUR-PASSWORD]`: Database password from Step 1
- `[PROJECT-REF]`: Project reference from Supabase URL
- `[YOUR-ANON-KEY]`: anon public key from Step 2
- `[YOUR-SERVICE-ROLE-KEY]`: service_role key from Step 2

---

## ✅ **VALIDATION CHECKLIST**

After completing all steps, test these URLs:

- [ ] **Health Check**: https://portfolio-kpi-copilot.vercel.app/api/health
  - **Expected**: `200` status (not 503)

- [ ] **System Status**: https://portfolio-kpi-copilot.vercel.app/api/system/status
  - **Expected**: `"database": {"status": "healthy"}`

- [ ] **Portfolios API**: https://portfolio-kpi-copilot.vercel.app/api/portfolios
  - **Expected**: `401` status (not 307 redirect)

- [ ] **Run Full Test**:
  ```bash
  ./scripts/complete-production-deployment.sh
  ```
  - **Expected**: 90%+ stability score

---

## 🎯 **SUCCESS CRITERIA**

Migration is successful when:
- ✅ All SQL executes without errors
- ✅ Sample data is inserted
- ✅ Health check returns 200
- ✅ APIs return 401 (not 307)
- ✅ System status shows database as "healthy"
- ✅ Stability score reaches 90%+

---

## 📞 **NEXT STEPS AFTER MIGRATION**

1. **Verify Full Functionality**: Test all 19 APIs
2. **Set Up Monitoring**: Configure alerts and dashboards
3. **User Training**: Prepare team for production use
4. **Performance Monitoring**: Track usage and optimize
5. **Backup Verification**: Ensure automated backups work

**Expected Result**: 🎉 **100% PRODUCTION READY**
