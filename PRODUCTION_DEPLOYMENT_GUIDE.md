# Portfolio KPI Copilot - Production Deployment Guide
## Complete Step-by-Step Implementation

### 🎯 **PHASE 1: IMMEDIATE SETUP (Days 1-2)**

#### **STEP 1: Supabase Database Migration**

##### 1.1 Create Supabase Project
```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Project Details:
Name: portfolio-kpi-copilot
Organization: Your Organization
Database Password: Generate strong password (save securely)
Region: Choose closest to your users (e.g., US East, EU West)
```

##### 1.2 Get Supabase Credentials
```bash
# After project creation, go to Settings > API
# Copy these values:

PROJECT_URL: https://[your-project-ref].supabase.co
ANON_KEY: eyJ... (public anon key)
SERVICE_ROLE_KEY: eyJ... (secret service role key)
```

##### 1.3 Update Local Environment
```bash
# Create new .env.local with Supabase credentials
cp .env.example .env.production

# Edit .env.production:
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"

# Enable Supabase
USE_SUPABASE_PRIMARY="true"
FALLBACK_TO_SQLITE="false"
ENABLE_REALTIME_SUBSCRIPTIONS="true"
```

##### 1.4 Install Supabase Dependencies
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

##### 1.5 Update Prisma Schema for PostgreSQL
```bash
# Edit prisma/schema.prisma
# Change datasource from sqlite to postgresql:

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# Update ID fields to use UUID:
model User {
  id            String    @id @default(uuid()) @db.Uuid
  // ... rest of fields
}

model Organization {
  id            String    @id @default(uuid()) @db.Uuid
  // ... rest of fields
}

model Portfolio {
  id            String    @id @default(uuid()) @db.Uuid
  // ... rest of fields
}

model KPI {
  id            String    @id @default(uuid()) @db.Uuid
  // ... rest of fields
}
```

##### 1.6 Run Database Migration
```bash
# Generate new migration
npx prisma migrate dev --name init_postgresql

# Generate Prisma client
npx prisma generate

# Test connection
npx prisma db push
```

##### 1.7 Set up Row Level Security (RLS)
```sql
-- Connect to Supabase SQL Editor
-- Run these commands:

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Portfolio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KPI" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON "User"
  FOR ALL USING (auth.uid()::text = "authId");

CREATE POLICY "Organization members can view org data" ON "Organization"
  FOR SELECT USING (
    id IN (
      SELECT "organizationId" FROM "User" 
      WHERE "authId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can view org portfolios" ON "Portfolio"
  FOR SELECT USING (
    "organizationId" IN (
      SELECT "organizationId" FROM "User" 
      WHERE "authId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can view portfolio KPIs" ON "KPI"
  FOR SELECT USING (
    "portfolioId" IN (
      SELECT p.id FROM "Portfolio" p
      JOIN "User" u ON p."organizationId" = u."organizationId"
      WHERE u."authId" = auth.uid()::text
    )
  );
```

##### 1.8 Test Database Connection
```bash
# Create test script: scripts/test-supabase.js
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.\$queryRaw\`SELECT 1 as test\`;
    console.log('✅ Supabase connection successful:', result);
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
}

test();
"
```

#### **STEP 2: OAuth Production Setup**

##### 2.1 Google OAuth Configuration
```bash
# Go to https://console.cloud.google.com
# Create new project: "Portfolio KPI Copilot"
# Enable Google+ API and Google Identity API

# Create OAuth 2.0 Client ID:
Application Type: Web Application
Name: Portfolio KPI Copilot Production

# Authorized JavaScript Origins:
http://localhost:3000 (for testing)
https://portfolio-kpi-copilot.vercel.app
https://your-custom-domain.com (if applicable)

# Authorized Redirect URIs:
http://localhost:3000/api/auth/callback/google
https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google
https://your-custom-domain.com/api/auth/callback/google

# Copy Client ID and Client Secret
```

##### 2.2 Microsoft Azure AD Setup
```bash
# Go to https://portal.azure.com
# Navigate to Azure Active Directory > App registrations
# Click "New registration"

# Application Details:
Name: Portfolio KPI Copilot
Supported account types: Accounts in any organizational directory and personal Microsoft accounts

# Redirect URI:
Platform: Web
Redirect URIs:
https://portfolio-kpi-copilot.vercel.app/api/auth/callback/azure-ad
http://localhost:3000/api/auth/callback/azure-ad

# API Permissions:
Microsoft Graph > User.Read (Delegated)
Microsoft Graph > email (Delegated)
Microsoft Graph > openid (Delegated)
Microsoft Graph > profile (Delegated)

# Copy Application (client) ID, Directory (tenant) ID, and create Client Secret
```

##### 2.3 Update Environment Variables
```bash
# Add to .env.production:

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secure-secret-key-min-32-characters-long"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft Azure AD
AZURE_AD_CLIENT_ID="your-azure-application-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"
```

##### 2.4 Update Auth Configuration
```bash
# Update src/lib/auth.ts with production providers
# The auth.ts file should include all OAuth providers
# Test locally first before deploying
```

##### 2.5 Test OAuth Locally
```bash
# Start development server with production environment
cp .env.production .env.local
npm run dev

# Test each OAuth provider:
# 1. Go to http://localhost:3000/auth/signin
# 2. Test Google sign-in
# 3. Test Microsoft sign-in
# 4. Verify user creation in Supabase dashboard
```

#### **STEP 3: AI Services Production Setup**

##### 3.1 OpenRouter Setup
```bash
# Go to https://openrouter.ai
# Create account and get API key
# Set up billing with reasonable limits

# Add to .env.production:
OPENROUTER_API_KEY="sk-or-v1-your-production-openrouter-key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_DEFAULT_MODEL="anthropic/claude-3.5-sonnet"
OPENROUTER_FALLBACK_MODEL="openai/gpt-4o"
```

##### 3.2 OpenAI Setup
```bash
# Go to https://platform.openai.com
# Create API key with usage limits
# Set up billing alerts

# Add to .env.production:
OPENAI_API_KEY="sk-your-production-openai-key"
OPENAI_ORGANIZATION="org-your-organization-id"
```

##### 3.3 Test AI Services
```bash
# Create test script: scripts/test-ai.js
node -e "
const { aiOrchestrator } = require('./src/lib/ai/orchestrator');

async function test() {
  try {
    const response = await aiOrchestrator.processRequest({
      type: 'chat',
      input: { query: 'Hello, this is a test' },
      preferences: { aiProvider: 'auto' }
    });
    console.log('✅ AI services working:', response);
  } catch (error) {
    console.error('❌ AI services failed:', error);
  }
}

test();
"
```

### 🎯 **PHASE 2: DEPLOYMENT PREPARATION (Days 3-4)**

#### **STEP 4: Vercel Production Deployment**

##### 4.1 Connect GitHub Repository
```bash
# Go to https://vercel.com/dashboard
# Click "New Project"
# Import from GitHub: your-portfolio-kpi-copilot-repo
# Configure project settings
```

##### 4.2 Set Environment Variables in Vercel
```bash
# In Vercel dashboard, go to Project Settings > Environment Variables
# Add all variables from .env.production:

# Database
DATABASE_URL (Production)
NEXT_PUBLIC_SUPABASE_URL (Production)
NEXT_PUBLIC_SUPABASE_ANON_KEY (Production)
SUPABASE_SERVICE_ROLE_KEY (Production)

# Auth
NEXTAUTH_URL (https://portfolio-kpi-copilot.vercel.app)
NEXTAUTH_SECRET (Production)
GOOGLE_CLIENT_ID (Production)
GOOGLE_CLIENT_SECRET (Production)
AZURE_AD_CLIENT_ID (Production)
AZURE_AD_CLIENT_SECRET (Production)
AZURE_AD_TENANT_ID (Production)

# AI Services
OPENROUTER_API_KEY (Production)
OPENAI_API_KEY (Production)

# Feature Flags
USE_SUPABASE_PRIMARY=true
ENABLE_REALTIME_SUBSCRIPTIONS=true
ENABLE_AI_ORCHESTRATION=true
```

##### 4.3 Update OAuth Redirect URIs
```bash
# Update Google OAuth Console:
# Add: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google

# Update Azure AD:
# Add: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/azure-ad

# Update NEXTAUTH_URL in Vercel:
NEXTAUTH_URL=https://portfolio-kpi-copilot.vercel.app
```

##### 4.4 Deploy to Production
```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Production deployment setup"
git push origin main

# Or deploy manually:
vercel --prod
```

#### **STEP 5: Production Testing & Validation**

##### 5.1 Smoke Tests
```bash
# Test these URLs after deployment:
https://portfolio-kpi-copilot.vercel.app/
https://portfolio-kpi-copilot.vercel.app/api/health
https://portfolio-kpi-copilot.vercel.app/api/v2
https://portfolio-kpi-copilot.vercel.app/auth/signin
```

##### 5.2 Functional Tests
```bash
# Test user flows:
1. Sign up with Google OAuth
2. Create organization
3. Create portfolio
4. Add KPIs
5. Test AI Copilot
6. Test real-time updates
```

##### 5.3 Performance Tests
```bash
# Use tools like:
- Lighthouse (Performance audit)
- GTmetrix (Page speed)
- Pingdom (Uptime monitoring)

# Target metrics:
- Page load time: < 2 seconds
- First Contentful Paint: < 1 second
- API response time: < 500ms
```

### 🎯 **PHASE 3: MONITORING & OPTIMIZATION (Days 5-7)**

#### **STEP 6: Set Up Monitoring**

##### 6.1 Vercel Analytics
```bash
# Enable in Vercel dashboard:
- Web Analytics
- Speed Insights
- Function logs
```

##### 6.2 Supabase Monitoring
```bash
# Monitor in Supabase dashboard:
- Database performance
- API usage
- Real-time connections
- Storage usage
```

##### 6.3 Custom Monitoring
```bash
# Add monitoring endpoints:
/api/v2/system/health
/api/v2/system/metrics
/api/v2/ai/usage

# Set up alerts for:
- High error rates
- Slow response times
- AI service failures
- Database connection issues
```

#### **STEP 7: Performance Optimization**

##### 7.1 Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_portfolios_organization ON "Portfolio"("organizationId");
CREATE INDEX idx_kpis_portfolio ON "KPI"("portfolioId");
CREATE INDEX idx_kpis_period ON "KPI"("period");
CREATE INDEX idx_users_auth ON "User"("authId");
```

##### 7.2 Caching Strategy
```bash
# Implement caching for:
- API responses (5 minutes)
- AI responses (1 hour)
- Static data (24 hours)
- User sessions (30 days)
```

##### 7.3 Code Optimization
```bash
# Optimize bundle size:
npm run build
npm run analyze

# Implement lazy loading:
- Dashboard components
- Chart libraries
- AI features
```

### 🎯 **PHASE 4: GO-LIVE CHECKLIST**

#### **STEP 8: Pre-Launch Validation**

##### 8.1 Security Checklist
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] RLS policies active
- [ ] OAuth properly configured
- [ ] API rate limiting enabled
- [ ] Input validation working

##### 8.2 Functionality Checklist
- [ ] User registration/login
- [ ] Portfolio management
- [ ] KPI tracking
- [ ] AI Copilot responses
- [ ] Real-time updates
- [ ] Data export/import
- [ ] Mobile responsiveness

##### 8.3 Performance Checklist
- [ ] Page load < 2s
- [ ] API response < 500ms
- [ ] AI response < 5s
- [ ] Database queries optimized
- [ ] Caching implemented
- [ ] Error handling robust

#### **STEP 9: Launch Day Procedures**

##### 9.1 Final Deployment
```bash
# Ensure all tests pass
npm run test
npm run build
npm run start

# Deploy to production
git tag v1.0.0
git push origin v1.0.0
vercel --prod
```

##### 9.2 Post-Launch Monitoring
```bash
# Monitor for 24 hours:
- Error rates
- Response times
- User registrations
- AI service usage
- Database performance
```

##### 9.3 User Communication
```bash
# Prepare communications:
- Launch announcement
- User documentation
- Support channels
- Feedback collection
```

### 📞 **SUPPORT & TROUBLESHOOTING**

#### Common Issues & Solutions

##### Database Connection Issues
```bash
# Check connection string
# Verify Supabase project status
# Test with Prisma Studio: npx prisma studio
```

##### OAuth Issues
```bash
# Verify redirect URIs match exactly
# Check environment variables
# Test in incognito mode
```

##### AI Service Issues
```bash
# Check API keys validity
# Verify rate limits
# Test individual providers
```

##### Performance Issues
```bash
# Check Vercel function logs
# Monitor database query performance
# Analyze bundle size
```

### 🎯 **SUCCESS METRICS**

#### Technical KPIs
- Uptime: > 99.9%
- Response time: < 2s average
- Error rate: < 0.1%
- User satisfaction: > 4.5/5

#### Business KPIs
- User registrations
- Portfolio creation rate
- AI feature usage
- User retention

### 📅 **TIMELINE SUMMARY**

**Day 1**: Supabase setup and migration
**Day 2**: OAuth configuration and testing
**Day 3**: AI services setup
**Day 4**: Vercel deployment
**Day 5**: Testing and validation
**Day 6**: Performance optimization
**Day 7**: Go-live and monitoring

### 🚀 **NEXT STEPS AFTER LAUNCH**

1. **Week 1**: Monitor and fix issues
2. **Week 2**: User feedback integration
3. **Month 1**: Feature enhancements
4. **Month 2**: Mobile app development
5. **Month 3**: Enterprise features
