#!/bin/bash

# Portfolio KPI Copilot - Database Migration Script
# Migrates from SQLite to Supabase PostgreSQL

set -e

echo "🚀 Starting Portfolio KPI Copilot Database Migration"
echo "=================================================="

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

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    required_vars=(
        "DATABASE_URL"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please set these variables in your .env.local file:"
        echo "DATABASE_URL=\"postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres\""
        echo "NEXT_PUBLIC_SUPABASE_URL=\"https://[PROJECT_REF].supabase.co\""
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=\"[ANON_KEY]\""
        echo "SUPABASE_SERVICE_ROLE_KEY=\"[SERVICE_ROLE_KEY]\""
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Backup existing SQLite database
backup_sqlite() {
    if [ -f "prisma/dev.db" ]; then
        print_status "Backing up existing SQLite database..."
        cp prisma/dev.db "prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
        print_success "SQLite database backed up"
    else
        print_warning "No existing SQLite database found"
    fi
}

# Install required dependencies
install_dependencies() {
    print_status "Installing Supabase dependencies..."
    npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
    print_success "Dependencies installed"
}

# Update Prisma schema for PostgreSQL
update_prisma_schema() {
    print_status "Updating Prisma schema for PostgreSQL..."
    
    # Create backup of current schema
    cp prisma/schema.prisma "prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update schema file
    cat > prisma/schema.prisma << 'EOF'
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(uuid()) @db.Uuid
  email          String    @unique
  name           String?
  role           Role      @default(VIEWER)
  organizationId String?   @db.Uuid
  authId         String?   @unique // Supabase auth.users.id
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  organization   Organization? @relation(fields: [organizationId], references: [id])
  createdPortfolios Portfolio[] @relation("PortfolioCreatedBy")
  updatedPortfolios Portfolio[] @relation("PortfolioUpdatedBy")
  createdKPIs    KPI[]     @relation("KPICreatedBy")
  updatedKPIs    KPI[]     @relation("KPIUpdatedBy")

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
  createdByUser  User      @relation("PortfolioCreatedBy", fields: [createdBy], references: [id])
  updatedByUser  User      @relation("PortfolioUpdatedBy", fields: [updatedBy], references: [id])
  kpis           KPI[]

  @@map("portfolios")
}

model KPI {
  id           String      @id @default(uuid()) @db.Uuid
  name         String
  description  String?
  category     KPICategory
  value        Decimal     @db.Decimal(15,4)
  unit         String
  targetValue  Decimal?    @db.Decimal(15,4)
  period       DateTime
  portfolioId  String      @db.Uuid
  source       String?
  confidence   Int         @default(100)
  isPublic     Boolean     @default(false)
  metadata     Json?
  createdBy    String      @db.Uuid
  updatedBy    String      @db.Uuid
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  portfolio    Portfolio   @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  createdByUser User       @relation("KPICreatedBy", fields: [createdBy], references: [id])
  updatedByUser User       @relation("KPIUpdatedBy", fields: [updatedBy], references: [id])

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
EOF
    
    print_success "Prisma schema updated for PostgreSQL"
}

# Test database connection
test_connection() {
    print_status "Testing database connection..."
    
    # Create a simple test script
    cat > test_connection.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
EOF
    
    if node test_connection.js; then
        print_success "Database connection test passed"
        rm test_connection.js
    else
        print_error "Database connection test failed"
        rm test_connection.js
        exit 1
    fi
}

# Run Prisma migration
run_migration() {
    print_status "Running Prisma migration..."
    
    # Generate migration
    npx prisma migrate dev --name init_postgresql --skip-seed
    
    # Generate Prisma client
    npx prisma generate
    
    print_success "Prisma migration completed"
}

# Set up Row Level Security
setup_rls() {
    print_status "Setting up Row Level Security policies..."
    
    cat > setup_rls.sql << 'EOF'
-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kpis" ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON "users"
  FOR SELECT USING (auth.uid()::text = "authId");

CREATE POLICY "Users can update own profile" ON "users"
  FOR UPDATE USING (auth.uid()::text = "authId");

-- Organization access based on membership
CREATE POLICY "Users can view own organization" ON "organizations"
  FOR SELECT USING (
    id IN (
      SELECT "organizationId" FROM "users" 
      WHERE "authId" = auth.uid()::text
    )
  );

-- Portfolio access based on organization membership
CREATE POLICY "Users can view organization portfolios" ON "portfolios"
  FOR SELECT USING (
    "organizationId" IN (
      SELECT "organizationId" FROM "users" 
      WHERE "authId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage organization portfolios" ON "portfolios"
  FOR ALL USING (
    "organizationId" IN (
      SELECT "organizationId" FROM "users" 
      WHERE "authId" = auth.uid()::text
      AND role IN ('ORG_ADMIN', 'MANAGER')
    )
  );

-- KPI access based on portfolio access
CREATE POLICY "Users can view portfolio KPIs" ON "kpis"
  FOR SELECT USING (
    "portfolioId" IN (
      SELECT p.id FROM "portfolios" p
      JOIN "users" u ON p."organizationId" = u."organizationId"
      WHERE u."authId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage portfolio KPIs" ON "kpis"
  FOR ALL USING (
    "portfolioId" IN (
      SELECT p.id FROM "portfolios" p
      JOIN "users" u ON p."organizationId" = u."organizationId"
      WHERE u."authId" = auth.uid()::text
      AND u.role IN ('ORG_ADMIN', 'MANAGER', 'ANALYST')
    )
  );
EOF
    
    print_warning "RLS policies created in setup_rls.sql"
    print_warning "Please run these SQL commands in your Supabase SQL Editor"
    print_warning "File location: $(pwd)/setup_rls.sql"
}

# Create indexes for performance
create_indexes() {
    print_status "Creating database indexes..."
    
    cat > create_indexes.sql << 'EOF'
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON "users"("authId");
CREATE INDEX IF NOT EXISTS idx_users_organization ON "users"("organizationId");
CREATE INDEX IF NOT EXISTS idx_portfolios_organization ON "portfolios"("organizationId");
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON "portfolios"("status");
CREATE INDEX IF NOT EXISTS idx_portfolios_sector ON "portfolios"("sector");
CREATE INDEX IF NOT EXISTS idx_kpis_portfolio ON "kpis"("portfolioId");
CREATE INDEX IF NOT EXISTS idx_kpis_period ON "kpis"("period");
CREATE INDEX IF NOT EXISTS idx_kpis_category ON "kpis"("category");
CREATE INDEX IF NOT EXISTS idx_kpis_created_at ON "kpis"("createdAt");
EOF
    
    print_warning "Database indexes created in create_indexes.sql"
    print_warning "Please run these SQL commands in your Supabase SQL Editor"
    print_warning "File location: $(pwd)/create_indexes.sql"
}

# Verify migration
verify_migration() {
    print_status "Verifying migration..."
    
    cat > verify_migration.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

async function verifyMigration() {
  const prisma = new PrismaClient();
  
  try {
    // Test basic operations
    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();
    const portfolioCount = await prisma.portfolio.count();
    const kpiCount = await prisma.kPI.count();
    
    console.log('📊 Database Statistics:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Organizations: ${orgCount}`);
    console.log(`  Portfolios: ${portfolioCount}`);
    console.log(`  KPIs: ${kpiCount}`);
    
    console.log('✅ Migration verification successful');
    return true;
  } catch (error) {
    console.error('❌ Migration verification failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration().then(success => {
  process.exit(success ? 0 : 1);
});
EOF
    
    if node verify_migration.js; then
        print_success "Migration verification passed"
        rm verify_migration.js
    else
        print_error "Migration verification failed"
        rm verify_migration.js
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    print_status "Starting database migration process..."
    echo ""
    
    check_env_vars
    backup_sqlite
    install_dependencies
    update_prisma_schema
    test_connection
    run_migration
    setup_rls
    create_indexes
    verify_migration
    
    echo ""
    print_success "🎉 Database migration completed successfully!"
    echo ""
    print_warning "⚠️  IMPORTANT NEXT STEPS:"
    echo "1. Run the SQL commands in setup_rls.sql in your Supabase SQL Editor"
    echo "2. Run the SQL commands in create_indexes.sql in your Supabase SQL Editor"
    echo "3. Test your application with the new database"
    echo "4. Update your production environment variables"
    echo ""
    print_status "Migration files created:"
    echo "  - setup_rls.sql (Row Level Security policies)"
    echo "  - create_indexes.sql (Performance indexes)"
    echo "  - prisma/schema.prisma.backup.* (Schema backup)"
    echo ""
}

# Run main function
main "$@"
