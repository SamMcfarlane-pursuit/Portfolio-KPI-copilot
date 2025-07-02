# Supabase Migration Guide
## Portfolio KPI Copilot Database Migration

### 🎯 Migration Overview
Migrate from SQLite development database to production Supabase PostgreSQL with real-time capabilities.

### 📋 Pre-Migration Checklist
- [ ] Create Supabase project at https://supabase.com
- [ ] Note down project URL and anon key
- [ ] Generate service role key for admin operations
- [ ] Backup current SQLite database

### 🔧 Step 1: Supabase Project Setup

#### Create New Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization and project name: "portfolio-kpi-copilot"
4. Select region closest to your users
5. Generate strong database password

#### Configure Project Settings
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### 🗄️ Step 2: Schema Migration

#### Update Prisma Schema
```prisma
// Update prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add Supabase-specific configurations
model User {
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique
  name          String?
  role          Role      @default(VIEWER)
  organizationId String?  @db.Uuid
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Supabase auth integration
  authId        String?   @unique // Supabase auth.users.id
  
  @@map("users")
}

model Organization {
  id          String    @id @default(uuid()) @db.Uuid
  name        String
  description String?
  industry    String
  size        OrgSize
  website     String?
  settings    Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  users       User[]
  portfolios  Portfolio[]
  
  @@map("organizations")
}

model Portfolio {
  id             String    @id @default(uuid()) @db.Uuid
  name           String
  description    String?
  sector         String
  geography      String
  stage          Stage
  investment     Decimal   @db.Decimal(15,2)
  ownership      Decimal   @db.Decimal(5,2)
  status         Status    @default(ACTIVE)
  tags           String[]
  organizationId String    @db.Uuid
  fundId         String?   @db.Uuid
  createdBy      String    @db.Uuid
  updatedBy      String    @db.Uuid
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  kpis          KPI[]
  
  @@map("portfolios")
}

model KPI {
  id           String    @id @default(uuid()) @db.Uuid
  name         String
  description  String?
  category     KPICategory
  value        Decimal   @db.Decimal(15,4)
  unit         String
  targetValue  Decimal?  @db.Decimal(15,4)
  period       DateTime
  portfolioId  String    @db.Uuid
  source       String?
  confidence   Int       @default(100)
  isPublic     Boolean   @default(false)
  metadata     Json?
  createdBy    String    @db.Uuid
  updatedBy    String    @db.Uuid
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  portfolio    Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  
  @@map("kpis")
}

enum Role {
  SUPER_ADMIN
  ORG_ADMIN
  MANAGER
  ANALYST
  VIEWER
}

enum OrgSize {
  STARTUP
  SMALL
  MEDIUM
  LARGE
  ENTERPRISE
}

enum Stage {
  SEED
  SERIES_A
  SERIES_B
  SERIES_C
  GROWTH
  MATURE
}

enum Status {
  ACTIVE
  MONITORING
  EXITED
}

enum KPICategory {
  FINANCIAL
  OPERATIONAL
  GROWTH
  EFFICIENCY
  RISK
  CUSTOMER
  PRODUCT
}
```

#### Run Migration
```bash
# Update environment variables
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Generate and run migration
npx prisma migrate dev --name init_supabase
npx prisma generate
```

### 🔐 Step 3: Row Level Security (RLS)

#### Enable RLS on Tables
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = auth_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = auth_id);

-- Organization access based on membership
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE auth_id = auth.uid()::text
    )
  );

-- Portfolio access based on organization membership
CREATE POLICY "Users can view organization portfolios" ON portfolios
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_id = auth.uid()::text
    )
  );

-- KPI access based on portfolio access
CREATE POLICY "Users can view portfolio KPIs" ON kpis
  FOR SELECT USING (
    portfolio_id IN (
      SELECT p.id FROM portfolios p
      JOIN users u ON p.organization_id = u.organization_id
      WHERE u.auth_id = auth.uid()::text
    )
  );
```

### 🔄 Step 4: Real-time Subscriptions

#### Configure Real-time
```sql
-- Enable real-time for tables
ALTER PUBLICATION supabase_realtime ADD TABLE portfolios;
ALTER PUBLICATION supabase_realtime ADD TABLE kpis;

-- Create real-time functions
CREATE OR REPLACE FUNCTION notify_portfolio_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'portfolio_changes',
    json_build_object(
      'operation', TG_OP,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER portfolio_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION notify_portfolio_change();
```

### 🔧 Step 5: Update Application Code

#### Update Environment Variables
```bash
# .env.local
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"

# Feature flags
USE_SUPABASE_PRIMARY="true"
ENABLE_REALTIME_SUBSCRIPTIONS="true"
ENABLE_VECTOR_SEARCH="true"
```

#### Update Hybrid Data Layer
```typescript
// src/lib/data/hybrid-data-layer.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Update initialization
export async function initializeHybridData() {
  if (process.env.USE_SUPABASE_PRIMARY === 'true') {
    try {
      // Test Supabase connection
      const { data, error } = await supabase.from('users').select('count').limit(1)
      if (error) throw error
      
      return {
        activeSource: 'supabase',
        available: true,
        features: {
          realtime: true,
          vectorSearch: true,
          auth: true
        }
      }
    } catch (error) {
      console.error('Supabase connection failed:', error)
      // Fallback to SQLite if enabled
      if (process.env.FALLBACK_TO_SQLITE === 'true') {
        return initializeSQLite()
      }
      throw error
    }
  }
  
  return initializeSQLite()
}
```

### 📊 Step 6: Data Migration

#### Export SQLite Data
```bash
# Create migration script
node scripts/export-sqlite-data.js
```

#### Import to Supabase
```bash
# Run data import
node scripts/import-to-supabase.js
```

### ✅ Step 7: Testing & Validation

#### Test Checklist
- [ ] Database connection successful
- [ ] User authentication working
- [ ] Portfolio CRUD operations
- [ ] KPI management
- [ ] Real-time updates
- [ ] RLS policies enforcing security
- [ ] Performance acceptable

#### Performance Testing
```bash
# Test database performance
npm run test:db-performance

# Test real-time subscriptions
npm run test:realtime

# Test RLS policies
npm run test:security
```

### 🚀 Step 8: Production Deployment

#### Update Production Environment
```bash
# Vercel deployment
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy
vercel --prod
```

### 🔍 Step 9: Monitoring & Optimization

#### Set up Monitoring
- Supabase dashboard monitoring
- Database performance metrics
- Real-time connection monitoring
- Query performance analysis

#### Optimization
- Index optimization for frequent queries
- Connection pooling configuration
- Cache strategy implementation
- Query optimization based on usage patterns

### 🆘 Rollback Plan

#### Emergency Rollback
```bash
# Switch back to SQLite
USE_SUPABASE_PRIMARY="false"
FALLBACK_TO_SQLITE="true"

# Redeploy
vercel --prod
```

#### Data Recovery
- Supabase automatic backups
- Point-in-time recovery
- Manual backup restoration
- Data export capabilities

### 📈 Post-Migration Optimization

#### Week 1: Monitoring
- Monitor performance metrics
- Track error rates
- Analyze query performance
- User feedback collection

#### Week 2: Optimization
- Index optimization
- Query performance tuning
- Real-time subscription optimization
- Cache strategy refinement

#### Month 1: Advanced Features
- Vector search implementation
- Advanced analytics
- Multi-tenant optimization
- Backup strategy refinement
