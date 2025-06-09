# Vercel Environment Variables Setup

## Required Environment Variables for Production

Copy and paste these environment variables into your Vercel dashboard:

### Core Application Settings
```
NEXTAUTH_URL=https://portfolio-kpi-copilot.vercel.app
NEXTAUTH_SECRET=your-secure-nextauth-secret-32-chars-min
NODE_ENV=production
```

### Database Configuration (Supabase Recommended)
```
DATABASE_URL=postgresql://your-supabase-connection-string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### AI Services (Choose one or more)
```
OPENROUTER_API_KEY=your-openrouter-api-key
OPENAI_API_KEY=your-openai-api-key
OLLAMA_BASE_URL=https://your-ollama-cloud-endpoint
```

### OAuth Providers
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret
```

### Security & Performance
```
ENCRYPTION_KEY=your-32-character-encryption-key-here
RATE_LIMIT_ENABLED=true
AUDIT_LOG_LEVEL=info
CACHE_TTL=3600
```

## Optional Environment Variables

### Vector Database (Pinecone)
```
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=kpi-copilot-prod
```

### Monitoring & Analytics
```
ENABLE_ANALYTICS=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_HEALTH_CHECKS=true
```

## Setup Instructions

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: portfolio-kpi-copilot
3. **Go to Settings > Environment Variables**
4. **Add each variable** with the appropriate values
5. **Redeploy** the application

## Quick Setup Commands

Generate secure secrets:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 16
```

## Verification

After setting up environment variables, test these endpoints:
- https://portfolio-kpi-copilot.vercel.app/health
- https://portfolio-kpi-copilot.vercel.app/status
- https://portfolio-kpi-copilot.vercel.app/api/auth/signin

## Troubleshooting

If deployment fails:
1. Check build logs in Vercel dashboard
2. Verify all required environment variables are set
3. Ensure OAuth redirect URLs are configured correctly
4. Check database connection strings
