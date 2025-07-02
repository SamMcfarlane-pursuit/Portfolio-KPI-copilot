#!/bin/bash

# Portfolio KPI Copilot - OAuth Setup Script
# Configures production OAuth providers

set -e

echo "🔐 Setting up OAuth Providers for Portfolio KPI Copilot"
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to prompt for user input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="${3:-false}"
    
    echo -n "$prompt: "
    if [ "$is_secret" = "true" ]; then
        read -s value
        echo ""
    else
        read value
    fi
    
    eval "$var_name='$value'"
}

# Function to validate URL format
validate_url() {
    local url="$1"
    if [[ $url =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

# Get application URLs
get_app_urls() {
    print_status "Configuring application URLs..."
    
    # Default URLs
    LOCAL_URL="http://localhost:3000"
    VERCEL_URL="https://portfolio-kpi-copilot.vercel.app"
    
    echo "Current URLs:"
    echo "  Local: $LOCAL_URL"
    echo "  Vercel: $VERCEL_URL"
    echo ""
    
    read -p "Do you have a custom domain? (y/n): " has_custom_domain
    if [[ $has_custom_domain =~ ^[Yy]$ ]]; then
        prompt_input "Enter your custom domain (e.g., https://app.yourcompany.com)" CUSTOM_URL
        if ! validate_url "$CUSTOM_URL"; then
            print_error "Invalid URL format. Please include https://"
            exit 1
        fi
    fi
    
    # Build redirect URIs
    REDIRECT_URIS=("$LOCAL_URL" "$VERCEL_URL")
    if [ -n "$CUSTOM_URL" ]; then
        REDIRECT_URIS+=("$CUSTOM_URL")
    fi
    
    print_success "Application URLs configured"
}

# Google OAuth setup instructions
setup_google_oauth() {
    print_status "Setting up Google OAuth..."
    echo ""
    echo "📋 Google OAuth Setup Instructions:"
    echo "1. Go to https://console.cloud.google.com"
    echo "2. Create a new project or select existing: 'Portfolio KPI Copilot'"
    echo "3. Enable the following APIs:"
    echo "   - Google+ API"
    echo "   - Google Identity API"
    echo "4. Go to 'Credentials' → 'Create Credentials' → 'OAuth 2.0 Client ID'"
    echo "5. Configure the OAuth consent screen if prompted"
    echo "6. Application type: Web Application"
    echo "7. Name: Portfolio KPI Copilot Production"
    echo ""
    echo "8. Authorized JavaScript origins:"
    for url in "${REDIRECT_URIS[@]}"; do
        echo "   $url"
    done
    echo ""
    echo "9. Authorized redirect URIs:"
    for url in "${REDIRECT_URIS[@]}"; do
        echo "   $url/api/auth/callback/google"
    done
    echo ""
    
    read -p "Press Enter when you have completed the Google OAuth setup..."
    
    prompt_input "Enter Google Client ID" GOOGLE_CLIENT_ID
    prompt_input "Enter Google Client Secret" GOOGLE_CLIENT_SECRET true
    
    if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
        print_error "Google OAuth credentials are required"
        exit 1
    fi
    
    print_success "Google OAuth configured"
}

# Microsoft Azure AD setup instructions
setup_azure_oauth() {
    print_status "Setting up Microsoft Azure AD OAuth..."
    echo ""
    echo "📋 Microsoft Azure AD Setup Instructions:"
    echo "1. Go to https://portal.azure.com"
    echo "2. Navigate to 'Azure Active Directory' → 'App registrations'"
    echo "3. Click 'New registration'"
    echo "4. Name: Portfolio KPI Copilot"
    echo "5. Supported account types: 'Accounts in any organizational directory and personal Microsoft accounts'"
    echo ""
    echo "6. Redirect URI (Web):"
    for url in "${REDIRECT_URIS[@]}"; do
        echo "   $url/api/auth/callback/azure-ad"
    done
    echo ""
    echo "7. After creation, go to 'API permissions' and add:"
    echo "   - Microsoft Graph → User.Read (Delegated)"
    echo "   - Microsoft Graph → email (Delegated)"
    echo "   - Microsoft Graph → openid (Delegated)"
    echo "   - Microsoft Graph → profile (Delegated)"
    echo "8. Go to 'Certificates & secrets' and create a new client secret"
    echo ""
    
    read -p "Press Enter when you have completed the Azure AD setup..."
    
    prompt_input "Enter Azure AD Client ID (Application ID)" AZURE_AD_CLIENT_ID
    prompt_input "Enter Azure AD Client Secret" AZURE_AD_CLIENT_SECRET true
    prompt_input "Enter Azure AD Tenant ID (Directory ID)" AZURE_AD_TENANT_ID
    
    if [ -z "$AZURE_AD_CLIENT_ID" ] || [ -z "$AZURE_AD_CLIENT_SECRET" ] || [ -z "$AZURE_AD_TENANT_ID" ]; then
        print_error "Azure AD OAuth credentials are required"
        exit 1
    fi
    
    print_success "Azure AD OAuth configured"
}

# LinkedIn OAuth setup instructions
setup_linkedin_oauth() {
    print_status "Setting up LinkedIn OAuth..."
    echo ""
    echo "📋 LinkedIn OAuth Setup Instructions:"
    echo "1. Go to https://developer.linkedin.com"
    echo "2. Create a new app: 'Portfolio KPI Copilot'"
    echo "3. Add your company page (required)"
    echo "4. Verify your app"
    echo ""
    echo "5. In 'Auth' tab, add Authorized redirect URLs:"
    for url in "${REDIRECT_URIS[@]}"; do
        echo "   $url/api/auth/callback/linkedin"
    done
    echo ""
    echo "6. Request the following scopes:"
    echo "   - r_liteprofile"
    echo "   - r_emailaddress"
    echo ""
    
    read -p "Do you want to set up LinkedIn OAuth? (y/n): " setup_linkedin
    if [[ $setup_linkedin =~ ^[Yy]$ ]]; then
        read -p "Press Enter when you have completed the LinkedIn setup..."
        
        prompt_input "Enter LinkedIn Client ID" LINKEDIN_CLIENT_ID
        prompt_input "Enter LinkedIn Client Secret" LINKEDIN_CLIENT_SECRET true
        
        if [ -z "$LINKEDIN_CLIENT_ID" ] || [ -z "$LINKEDIN_CLIENT_SECRET" ]; then
            print_warning "LinkedIn OAuth credentials not provided, skipping..."
        else
            print_success "LinkedIn OAuth configured"
        fi
    else
        print_warning "Skipping LinkedIn OAuth setup"
    fi
}

# GitHub OAuth setup instructions
setup_github_oauth() {
    print_status "Setting up GitHub OAuth..."
    echo ""
    echo "📋 GitHub OAuth Setup Instructions:"
    echo "1. Go to GitHub Settings → Developer settings → OAuth Apps"
    echo "2. Click 'New OAuth App'"
    echo "3. Application name: Portfolio KPI Copilot"
    echo "4. Homepage URL: ${REDIRECT_URIS[1]}"  # Use Vercel URL
    echo ""
    echo "5. Authorization callback URL:"
    for url in "${REDIRECT_URIS[@]}"; do
        echo "   $url/api/auth/callback/github"
    done
    echo ""
    
    read -p "Do you want to set up GitHub OAuth? (y/n): " setup_github
    if [[ $setup_github =~ ^[Yy]$ ]]; then
        read -p "Press Enter when you have completed the GitHub setup..."
        
        prompt_input "Enter GitHub Client ID" GITHUB_ID
        prompt_input "Enter GitHub Client Secret" GITHUB_SECRET true
        
        if [ -z "$GITHUB_ID" ] || [ -z "$GITHUB_SECRET" ]; then
            print_warning "GitHub OAuth credentials not provided, skipping..."
        else
            print_success "GitHub OAuth configured"
        fi
    else
        print_warning "Skipping GitHub OAuth setup"
    fi
}

# Generate NextAuth secret
generate_nextauth_secret() {
    print_status "Generating NextAuth secret..."
    
    # Generate a secure random secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    print_success "NextAuth secret generated"
}

# Create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    # Determine production URL
    PRODUCTION_URL="$VERCEL_URL"
    if [ -n "$CUSTOM_URL" ]; then
        PRODUCTION_URL="$CUSTOM_URL"
    fi
    
    # Create .env.oauth file
    cat > .env.oauth << EOF
# OAuth Configuration for Portfolio KPI Copilot
# Generated on $(date)

# NextAuth Configuration
NEXTAUTH_URL="$PRODUCTION_URL"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

# Google OAuth
GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"

# Microsoft Azure AD
AZURE_AD_CLIENT_ID="$AZURE_AD_CLIENT_ID"
AZURE_AD_CLIENT_SECRET="$AZURE_AD_CLIENT_SECRET"
AZURE_AD_TENANT_ID="$AZURE_AD_TENANT_ID"
EOF

    # Add LinkedIn if configured
    if [ -n "$LINKEDIN_CLIENT_ID" ]; then
        cat >> .env.oauth << EOF

# LinkedIn OAuth
LINKEDIN_CLIENT_ID="$LINKEDIN_CLIENT_ID"
LINKEDIN_CLIENT_SECRET="$LINKEDIN_CLIENT_SECRET"
EOF
    fi
    
    # Add GitHub if configured
    if [ -n "$GITHUB_ID" ]; then
        cat >> .env.oauth << EOF

# GitHub OAuth
GITHUB_ID="$GITHUB_ID"
GITHUB_SECRET="$GITHUB_SECRET"
EOF
    fi
    
    print_success "Environment file created: .env.oauth"
}

# Update auth configuration
update_auth_config() {
    print_status "Updating authentication configuration..."
    
    # Create updated auth.ts file
    cat > src/lib/auth-production.ts << 'EOF'
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import LinkedInProvider from 'next-auth/providers/linkedin'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    ...(process.env.LINKEDIN_CLIENT_ID ? [
      LinkedInProvider({
        clientId: process.env.LINKEDIN_CLIENT_ID!,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: 'r_liteprofile r_emailaddress',
          },
        },
      })
    ] : []),
    ...(process.env.GITHUB_ID ? [
      GitHubProvider({
        clientId: process.env.GITHUB_ID!,
        clientSecret: process.env.GITHUB_SECRET!,
      })
    ] : [])
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id
        token.role = user.role
        token.organizationId = user.organizationId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.userId = token.userId as string
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Auto-create organization for new users
      if (user && !user.organizationId) {
        await createDefaultOrganization(user)
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`)
    }
  },
  debug: process.env.NODE_ENV === 'development',
}

async function createDefaultOrganization(user: any) {
  const orgName = user.email?.split('@')[1]?.split('.')[0] || 'Personal'
  
  const organization = await prisma.organization.create({
    data: {
      name: `${orgName} Organization`,
      industry: 'Technology',
      size: 'SMALL',
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        features: ['basic']
      }
    }
  })
  
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      organizationId: organization.id,
      role: 'ORG_ADMIN'
    }
  })
}
EOF
    
    print_success "Authentication configuration updated"
    print_warning "Please replace src/lib/auth.ts with src/lib/auth-production.ts"
}

# Test OAuth configuration
test_oauth_config() {
    print_status "Testing OAuth configuration..."
    
    # Create test script
    cat > test_oauth.js << 'EOF'
const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID'
];

const optionalVars = [
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET'
];

console.log('🔍 Testing OAuth Configuration...\n');

let allRequired = true;
let hasOptional = false;

console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  console.log(`  ${status} ${varName}: ${value ? 'Set' : 'Missing'}`);
  if (!value) allRequired = false;
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚪';
  console.log(`  ${status} ${varName}: ${value ? 'Set' : 'Not set'}`);
  if (value) hasOptional = true;
});

console.log('\n📊 Summary:');
console.log(`  Required variables: ${allRequired ? 'All set' : 'Missing some'}`);
console.log(`  Optional variables: ${hasOptional ? 'Some configured' : 'None configured'}`);

if (allRequired) {
  console.log('\n✅ OAuth configuration is ready for production!');
  process.exit(0);
} else {
  console.log('\n❌ OAuth configuration is incomplete');
  process.exit(1);
}
EOF
    
    # Load environment and test
    if [ -f ".env.oauth" ]; then
        export $(cat .env.oauth | grep -v '^#' | xargs)
        if node test_oauth.js; then
            print_success "OAuth configuration test passed"
        else
            print_error "OAuth configuration test failed"
        fi
        rm test_oauth.js
    else
        print_error "Environment file not found"
    fi
}

# Main execution
main() {
    echo ""
    print_status "Starting OAuth setup process..."
    echo ""
    
    get_app_urls
    setup_google_oauth
    setup_azure_oauth
    setup_linkedin_oauth
    setup_github_oauth
    generate_nextauth_secret
    create_env_file
    update_auth_config
    test_oauth_config
    
    echo ""
    print_success "🎉 OAuth setup completed successfully!"
    echo ""
    print_warning "⚠️  IMPORTANT NEXT STEPS:"
    echo "1. Copy the contents of .env.oauth to your .env.local file"
    echo "2. Replace src/lib/auth.ts with src/lib/auth-production.ts"
    echo "3. Test OAuth locally: npm run dev"
    echo "4. Add these environment variables to Vercel:"
    echo "   - Go to Vercel Dashboard → Project Settings → Environment Variables"
    echo "   - Add all variables from .env.oauth"
    echo "5. Deploy to production: vercel --prod"
    echo ""
    print_status "Files created:"
    echo "  - .env.oauth (Environment variables)"
    echo "  - src/lib/auth-production.ts (Updated auth configuration)"
    echo ""
}

# Run main function
main "$@"
