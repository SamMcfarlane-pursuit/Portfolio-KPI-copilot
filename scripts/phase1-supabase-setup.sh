#!/bin/bash

# Phase 1: Supabase Setup for Portfolio KPI Copilot
# Production Infrastructure & Database Migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_status() {
    echo -e "${YELLOW}⚙️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Main execution
main() {
    print_header "Phase 1: Supabase Production Setup"
    
    echo "This script will help you set up Supabase for production deployment."
    echo "You'll need to have a Supabase account and project ready."
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Get Supabase project details
    get_supabase_details
    
    # Create database schema
    setup_database_schema
    
    # Configure environment variables
    configure_environment
    
    # Test connection
    test_connection
    
    # Generate migration script
    generate_migration_script
    
    print_success "Phase 1 Supabase setup completed successfully!"
    print_next_steps
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Installing..."
        npm install -g supabase
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Get Supabase project details
get_supabase_details() {
    print_status "Getting Supabase project details..."
    
    echo "Please provide your Supabase project details:"
    echo ""
    
    read -p "Supabase Project URL (https://your-project.supabase.co): " SUPABASE_URL
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    read -s -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY
    echo ""
    read -s -p "Database Password: " DB_PASSWORD
    echo ""
    
    # Extract project reference from URL
    PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')
    
    # Construct database URL
    DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
    
    print_success "Supabase details collected"
}

# Setup database schema
setup_database_schema() {
    print_status "Setting up database schema..."
    
    # Create SQL schema file
    cat > supabase_schema.sql << 'EOF'
-- Portfolio KPI Copilot - Production Schema
-- Phase 1: Core Tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    role VARCHAR(50) DEFAULT 'user',
    organization_id UUID REFERENCES organizations(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sector VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    investment_amount DECIMAL(15,2),
    current_value DECIMAL(15,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPIs table
CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    portfolio_id UUID REFERENCES portfolios(id),
    value DECIMAL(15,4),
    target DECIMAL(15,4),
    unit VARCHAR(50),
    period_start DATE,
    period_end DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolios_organization ON portfolios(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_kpis_portfolio ON kpis(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view portfolios in their organization" ON portfolios
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view KPIs for accessible portfolios" ON kpis
    FOR SELECT USING (portfolio_id IN (
        SELECT id FROM portfolios WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON kpis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF

    print_success "Database schema file created"
}

# Configure environment variables
configure_environment() {
    print_status "Configuring environment variables..."
    
    # Update .env.production with actual values
    sed -i.bak \
        -e "s|NEXT_PUBLIC_SUPABASE_URL=\".*\"|NEXT_PUBLIC_SUPABASE_URL=\"${SUPABASE_URL}\"|" \
        -e "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=\".*\"|NEXT_PUBLIC_SUPABASE_ANON_KEY=\"${SUPABASE_ANON_KEY}\"|" \
        -e "s|SUPABASE_SERVICE_ROLE_KEY=\".*\"|SUPABASE_SERVICE_ROLE_KEY=\"${SUPABASE_SERVICE_KEY}\"|" \
        -e "s|DATABASE_URL=\".*\"|DATABASE_URL=\"${DATABASE_URL}\"|" \
        .env.production
    
    print_success "Environment variables configured"
}

# Test connection
test_connection() {
    print_status "Testing database connection..."
    
    # Create a simple test script
    cat > test_connection.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Connection failed:', error.message);
            process.exit(1);
        }
        
        console.log('✅ Database connection successful');
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
EOF

    # Load environment and test
    export $(cat .env.production | grep -v '^#' | xargs)
    
    if node test_connection.js; then
        print_success "Database connection test passed"
    else
        print_error "Database connection test failed"
        exit 1
    fi
    
    # Clean up
    rm test_connection.js
}

# Generate migration script
generate_migration_script() {
    print_status "Generating migration script..."
    
    cat > migrate_to_production.sh << 'EOF'
#!/bin/bash

# Migration script from SQLite to Supabase
# Run this after setting up Supabase schema

echo "🚀 Starting migration to production database..."

# Apply schema
echo "📋 Applying database schema..."
psql "$DATABASE_URL" -f supabase_schema.sql

# Migrate existing data (if any)
echo "📊 Migrating existing data..."
npm run db:migrate

echo "✅ Migration completed successfully!"
EOF

    chmod +x migrate_to_production.sh
    
    print_success "Migration script generated"
}

# Print next steps
print_next_steps() {
    print_header "Next Steps"
    
    echo "1. Apply the database schema:"
    echo "   psql \"\$DATABASE_URL\" -f supabase_schema.sql"
    echo ""
    echo "2. Run the migration script:"
    echo "   ./migrate_to_production.sh"
    echo ""
    echo "3. Deploy to Vercel with new environment variables:"
    echo "   vercel --prod"
    echo ""
    echo "4. Test the production deployment:"
    echo "   curl https://portfolio-kpi-copilot.vercel.app/api/health"
    echo ""
    echo "Environment file updated: .env.production"
    echo "Schema file created: supabase_schema.sql"
    echo "Migration script: migrate_to_production.sh"
}

# Run main function
main "$@"
