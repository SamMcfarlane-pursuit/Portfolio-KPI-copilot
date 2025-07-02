#!/bin/bash

# Phase 2: OAuth & Authentication Setup
# Portfolio KPI Copilot - Enterprise Authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# Main execution
main() {
    print_header "Phase 2: OAuth & Authentication Setup"
    
    echo "This script will set up enterprise-grade authentication for"
    echo "the Portfolio KPI Copilot system:"
    echo ""
    echo "🔐 OAuth Integration (Google, LinkedIn, GitHub)"
    echo "👥 Role-Based Access Control (RBAC)"
    echo "🛡️ Security Hardening"
    echo "📊 User Management System"
    echo ""
    
    read -p "Ready to start Phase 2 setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Check Phase 1 completion
    check_phase1_status
    
    # Step 1: OAuth Provider Configuration
    configure_oauth_providers
    
    # Step 2: Database Schema Updates
    update_database_schema
    
    # Step 3: Security Configuration
    configure_security
    
    # Step 4: RBAC Setup
    setup_rbac
    
    # Step 5: Deploy Updates
    deploy_phase2
    
    # Step 6: Verify Authentication
    verify_authentication
    
    print_success "Phase 2 setup completed successfully!"
    show_phase2_summary
}

# Check Phase 1 completion
check_phase1_status() {
    print_header "Step 1: Verifying Phase 1 Completion"
    
    print_status "Checking Phase 1 health status..."
    
    HEALTH_RESPONSE=$(curl -s "https://portfolio-kpi-copilot.vercel.app/api/health" || echo "ERROR")
    
    if [[ $HEALTH_RESPONSE == *"ERROR"* ]]; then
        print_error "Cannot connect to production system"
        echo "Please ensure Phase 1 is completed and deployed."
        exit 1
    fi
    
    HEALTHY_COUNT=$(echo $HEALTH_RESPONSE | jq -r '.summary.healthy' 2>/dev/null || echo "0")
    
    if [ "$HEALTHY_COUNT" -ge 5 ]; then
        print_success "Phase 1 verification passed ($HEALTHY_COUNT services healthy)"
    else
        print_error "Phase 1 not ready ($HEALTHY_COUNT services healthy)"
        echo "Please complete Phase 1 before proceeding to Phase 2."
        exit 1
    fi
}

# Configure OAuth providers
configure_oauth_providers() {
    print_header "Step 2: OAuth Provider Configuration"
    
    echo "You need to set up OAuth applications with the following providers:"
    echo ""
    echo "📋 Required OAuth Providers:"
    echo "  • Google OAuth (Google Cloud Console)"
    echo ""
    echo "   cat PHASE2_OAUTH_SETUP.md"
    echo ""
    REPLY="y"
    echo "$REPLY"
    
    # Collect OAuth credentials
    collect_oauth_credentials
}

# Collect OAuth credentials
collect_oauth_credentials() {
    print_status "Collecting OAuth credentials..."
    
    echo ""
    echo "Please enter your OAuth credentials:"
    echo ""
    
    # Google OAuth
    echo "🔵 Google OAuth:"
    GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
    GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
    echo ""
    
    # LinkedIn OAuth
    echo "🔗 LinkedIn OAuth:"
    LINKEDIN_CLIENT_ID="$LINKEDIN_CLIENT_ID"
    LINKEDIN_SECRET="$LINKEDIN_SECRET"
    echo ""
    
    # GitHub OAuth
    echo "🐙 GitHub OAuth:"
    GITHUB_ID="$GITHUB_ID"
    GITHUB_SECRET="$GITHUB_SECRET"
    echo ""
    
    # Generate NextAuth secret
    print_status "Generating NextAuth secret..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # Update environment file
    update_oauth_environment
}

# Update environment with OAuth credentials
update_oauth_environment() {
    print_status "Updating environment configuration..."
    
    # Update .env.production with OAuth settings
    cat >> .env.production << EOF

# Phase 2: OAuth Configuration
GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
LINKEDIN_CLIENT_ID="$LINKEDIN_CLIENT_ID"
LINKEDIN_SECRET="$LINKEDIN_SECRET"
GITHUB_ID="$GITHUB_ID"
GITHUB_SECRET="$GITHUB_SECRET"

# NextAuth Configuration
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

# RBAC Configuration
ENABLE_RBAC="true"
DEFAULT_USER_ROLE="user"
ADMIN_EMAILS="admin@example.com"

# Security Settings
SESSION_MAX_AGE="86400"
ENABLE_AUDIT_LOGGING="true"
ENABLE_RATE_LIMITING="true"
ENABLE_MULTI_TENANT="true"

# Phase 2 Features
ENABLE_PHASE_2_FEATURES="true"
EOF
    
    print_success "OAuth environment configuration updated"
}

# Update database schema
update_database_schema() {
    print_header "Step 3: Database Schema Updates"
    
    print_status "Creating Phase 2 database schema..."
    
    # Create Phase 2 schema file
    cat > phase2_schema.sql << 'EOF'
-- Phase 2: Authentication & RBAC Schema

-- Enhance users table for OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id, organization_id)
);

-- OAuth accounts table
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at BIGINT,
    token_type VARCHAR(50),
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_account_id);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'Super Administrator', '["*"]'),
('admin', 'Organization Administrator', '["portfolio:*", "kpi:*", "user:read", "user:update"]'),
('manager', 'Portfolio Manager', '["portfolio:*", "kpi:*"]'),
('analyst', 'Data Analyst', '["portfolio:read", "kpi:*"]'),
('user', 'Basic User', '["portfolio:read", "kpi:read"]')
ON CONFLICT (name) DO NOTHING;

-- Update triggers for updated_at
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_user_sessions_updated_at_column();

CREATE TRIGGER update_oauth_accounts_updated_at BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_oauth_accounts_updated_at_column();

# Run main function
main "$@"
