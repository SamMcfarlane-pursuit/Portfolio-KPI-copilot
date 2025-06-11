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
