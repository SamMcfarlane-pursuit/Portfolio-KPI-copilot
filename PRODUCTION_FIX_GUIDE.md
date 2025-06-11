# 🚀 Portfolio KPI Copilot - Production Deployment Fix Guide

## 🔍 Current Issues Identified

Based on comprehensive functional verification, the following critical issues need immediate attention:

### ❌ Critical Issues
1. **Database Connection Failed** - SQLite not compatible with Vercel serverless
2. **API Routes Returning HTML** - Routing configuration issues
3. **AI Services Unavailable** - API key configuration problems

### ⚠️ Major Issues
4. **CRUD Operations Non-functional** - Database dependency
5. **Authentication Partially Working** - OAuth configured but database issues affect user management

---

## 🛠️ Step-by-Step Fix Implementation

### **Step 1: Database Migration to Supabase (CRITICAL)**

#### 1.1 Create Supabase Project
```bash
# Go to https://supabase.com
# Create new project
# Note down:
# - Project URL: https://[PROJECT-REF].supabase.co
# - Anon Key: [ANON-KEY]
# - Service Role Key: [SERVICE-ROLE-KEY]
# - Database Password: [PASSWORD]
```

#### 1.2 Run Database Migration
```bash
# Copy the SQL from migrations/supabase/001_initial_schema.sql
# Paste into Supabase SQL Editor
# Execute the migration
```

#### 1.3 Update Environment Variables in Vercel
```bash
# Go to Vercel Dashboard > portfolio-kpi-copilot > Settings > Environment Variables
# Add/Update these variables:

DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]
USE_SUPABASE_PRIMARY=true
FALLBACK_TO_SQLITE=false
```

### **Step 2: Fix AI Services Configuration**

#### 2.1 Configure OpenAI API
```bash
# In Vercel Environment Variables, add:
OPENAI_API_KEY=[YOUR-OPENAI-API-KEY]
OPENAI_MODEL=gpt-4o-mini
DISABLE_OPENAI=false
```

#### 2.2 Configure OpenRouter (Fallback)
```bash
# In Vercel Environment Variables, add:
OPENROUTER_API_KEY=[YOUR-OPENROUTER-API-KEY]
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

### **Step 3: Verify OAuth Configuration**

#### 3.1 Google OAuth (Already Configured)
```bash
# Verify in Google Cloud Console:
# - Authorized redirect URIs include: https://portfolio-kpi-copilot.vercel.app/api/auth/callback/google
# - OAuth consent screen is published or you're added as test user
```

#### 3.2 Update OAuth Secrets
```bash
# In Vercel Environment Variables, ensure:
GOOGLE_CLIENT_SECRET=[YOUR-GOOGLE-CLIENT-SECRET]
GITHUB_SECRET=[YOUR-GITHUB-CLIENT-SECRET]
AZURE_AD_CLIENT_SECRET=[YOUR-AZURE-CLIENT-SECRET]
```

### **Step 4: Deploy and Verify**

#### 4.1 Trigger Vercel Deployment
```bash
# Option 1: Push to main branch
git add .
git commit -m "Fix: Database migration and API configuration"
git push origin main

# Option 2: Manual deployment in Vercel dashboard
```

#### 4.2 Run Verification Tests
```bash
# Test API routing fix
curl "https://portfolio-kpi-copilot.vercel.app/api/fix-api-routing"

# Test API routes
curl "https://portfolio-kpi-copilot.vercel.app/api/test-api-routes"

# Test system health
curl "https://portfolio-kpi-copilot.vercel.app/api/system/status"
```

---

## 📋 Complete Environment Variables Checklist

### Core Application
- [x] `NEXTAUTH_URL=https://portfolio-kpi-copilot.vercel.app`
- [x] `NEXTAUTH_SECRET=knMDkhzRoqpySGulJY4qhE7sA1EuOqvZGCorD+605VQ=`
- [ ] `NODE_ENV=production`

### Database (Supabase)
- [ ] `DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- [ ] `NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]`
- [ ] `USE_SUPABASE_PRIMARY=true`
- [ ] `FALLBACK_TO_SQLITE=false`

### OAuth Providers
- [x] `GOOGLE_CLIENT_ID=952865856234-p2ub78oa1udq8ng89146lri5pj1mdc7m.apps.googleusercontent.com`
- [ ] `GOOGLE_CLIENT_SECRET=[YOUR-SECRET]`
- [ ] `GITHUB_ID=[YOUR-GITHUB-ID]`
- [ ] `GITHUB_SECRET=[YOUR-GITHUB-SECRET]`
- [ ] `AZURE_AD_CLIENT_ID=[YOUR-AZURE-ID]`
- [ ] `AZURE_AD_CLIENT_SECRET=[YOUR-AZURE-SECRET]`
- [ ] `AZURE_AD_TENANT_ID=[YOUR-TENANT-ID]`

### AI Services
- [ ] `OPENAI_API_KEY=[YOUR-OPENAI-KEY]`
- [ ] `OPENAI_MODEL=gpt-4o-mini`
- [ ] `DISABLE_OPENAI=false`
- [ ] `OPENROUTER_API_KEY=[YOUR-OPENROUTER-KEY]`

---

## 🧪 Testing & Verification

### Automated Testing Endpoints
```bash
# Comprehensive API testing
GET https://portfolio-kpi-copilot.vercel.app/api/test-api-routes

# API routing diagnostics
GET https://portfolio-kpi-copilot.vercel.app/api/fix-api-routing

# System health check
GET https://portfolio-kpi-copilot.vercel.app/api/health

# Authentication verification
GET https://portfolio-kpi-copilot.vercel.app/api/auth/verify-setup
```

### Manual Testing Checklist
- [ ] Dashboard loads without errors
- [ ] OAuth sign-in works (Google, GitHub, Azure AD)
- [ ] Demo login works (`demo@portfolio-kpi.com` / `demo123`)
- [ ] API endpoints return JSON (not HTML)
- [ ] Database operations work (create/read/update/delete)
- [ ] AI chat functionality works
- [ ] KPI analysis features work

---

## 🎯 Expected Results After Fix

### API Health Check Response
```json
{
  "status": "healthy",
  "uptime": 233,
  "version": "1.0.0",
  "environment": "production",
  "summary": {
    "healthy": 6,
    "degraded": 1,
    "unhealthy": 0,
    "total": 7
  }
}
```

### System Status Response
```json
{
  "overall": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "ai": { "status": "healthy" },
    "api": { "status": "healthy" }
  },
  "capabilities": {
    "aiChat": true,
    "dataEntry": true,
    "analytics": true
  }
}
```

---

## 🚨 Troubleshooting

### If Database Connection Still Fails
1. Verify Supabase project is active
2. Check DATABASE_URL format is correct
3. Ensure Supabase allows connections from Vercel
4. Run SQL migration again in Supabase

### If API Routes Still Return HTML
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Ensure no middleware conflicts
4. Test individual API routes

### If OAuth Fails
1. Verify redirect URIs in OAuth provider consoles
2. Check OAuth app is published (not in testing mode)
3. Ensure client secrets are correctly set
4. Test with demo account first

---

## 📞 Support

If issues persist after following this guide:

1. **Check Deployment Logs**: Vercel Dashboard > Functions > View Logs
2. **Test API Diagnostics**: Use `/api/fix-api-routing` endpoint
3. **Verify Environment**: Use `/api/auth/verify-setup` endpoint
4. **Database Health**: Use `/api/system/status` endpoint

---

## ✅ Success Criteria

The deployment is considered fixed when:

- [ ] Health endpoint returns `status: "healthy"`
- [ ] All API endpoints return JSON responses
- [ ] Database operations work correctly
- [ ] OAuth authentication functions properly
- [ ] AI services respond correctly
- [ ] Dashboard loads and functions without errors
- [ ] CRUD operations work for portfolios, companies, and KPIs

**Target Deployment Score: 90+/100** (up from current 35/100)
