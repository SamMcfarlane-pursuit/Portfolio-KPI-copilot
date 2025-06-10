# 🚀 Portfolio KPI Copilot - Complete Deployment Guide

This comprehensive guide walks you through deploying the Portfolio KPI Copilot across all phases, from basic AI features to enterprise-grade functionality.

## 📋 **Quick Start**

```bash
# 1. Clone and setup
git clone <repository>
cd portfolio-kpi-copilot
npm install

# 2. Run deployment orchestrator
./scripts/deploy-orchestrator.sh

# 3. Follow interactive prompts for phase-by-phase deployment
```

---

## 🎯 **Deployment Phases Overview**

### **Phase 1: Core AI Features** ✅ Ready
- **Features**: Basic AI explanations, OpenRouter/OpenAI integration, core portfolio management
- **Database**: SQLite (reliable and simple)
- **Data**: Mock financial data (no external dependencies)
- **Requirements**: Basic OAuth credentials
- **Deployment Time**: ~5 minutes

### **Phase 2: Advanced AI Features** ✅ Ready
- **Features**: Natural language queries, streaming responses, AI analytics
- **Database**: SQLite (same as Phase 1)
- **Data**: Mock financial data with enhanced AI processing
- **Requirements**: Phase 1 + Enhanced AI configuration
- **Deployment Time**: ~7 minutes

### **Phase 3: Financial Data Integration** ✅ Ready
- **Features**: Real-time market data, economic indicators, industry benchmarks
- **Database**: SQLite (same as previous phases)
- **Data**: Real financial APIs (Alpha Vantage, IEX Cloud, Polygon, FMP)
- **Requirements**: Phase 2 + Financial API keys
- **Deployment Time**: ~10 minutes

### **Phase 4: Supabase Database Migration** ✅ Ready
- **Features**: PostgreSQL database, real-time subscriptions, vector search
- **Database**: Supabase PostgreSQL (primary) with SQLite fallback
- **Data**: Real financial APIs + enhanced database capabilities
- **Requirements**: Phase 3 + Supabase configuration
- **Deployment Time**: ~15 minutes

### **Phase 5: Enterprise Features** 🔄 Coming Soon
- **Features**: RBAC, audit logging, advanced security, performance monitoring
- **Database**: Supabase with enterprise features
- **Requirements**: Phase 4 + Enterprise setup

### **Phase 6: Experimental Features** 🔄 Coming Soon
- **Features**: Document upload, predictive analytics, custom dashboards, webhooks
- **Database**: Full enterprise setup
- **Requirements**: Phase 5 + Advanced configuration

---

## 🛠️ **Phase-by-Phase Setup Instructions**

### **Phase 1: Core AI Features**

**Prerequisites:**
```bash
# Required environment variables
NEXTAUTH_SECRET=your-nextauth-secret-key-here
OPENROUTER_API_KEY=your-openrouter-api-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Deployment:**
```bash
# Option 1: Use deployment script
./scripts/deploy-phase1.sh

# Option 2: Manual deployment
cp .env.production.phase1 .env.local
# Update with your API keys
npm run build
vercel --prod
```

**Verification:**
```bash
# Test deployment
curl "https://portfolio-kpi-copilot.vercel.app/api/health"
curl "https://portfolio-kpi-copilot.vercel.app/api/system/status"
```

---

### **Phase 2: Advanced AI Features**

**Prerequisites:**
- Phase 1 successfully deployed
- Enhanced AI configuration

**New Features Enabled:**
```bash
ENABLE_NATURAL_LANGUAGE_QUERIES=true
ENABLE_ADVANCED_AI_ORCHESTRATOR=true
ENABLE_STREAMING_RESPONSES=true
ENABLE_AI_ANALYTICS=true
```

**Deployment:**
```bash
./scripts/deploy-phase2.sh
```

**Testing:**
```bash
# Test natural language queries (requires authentication)
curl -X POST "https://portfolio-kpi-copilot.vercel.app/api/ai/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me tech companies with high ROE"}'
```

---

### **Phase 3: Financial Data Integration**

**Prerequisites:**
- Phase 2 successfully deployed
- Financial data provider API keys

**Required API Keys:**
1. **Alpha Vantage** (Free: 500 requests/day)
   - Sign up: https://www.alphavantage.co/support/#api-key
   - Add: `ALPHA_VANTAGE_API_KEY=your_key`

2. **IEX Cloud** (Free: 500K credits/month)
   - Sign up: https://iexcloud.io/
   - Add: `IEX_CLOUD_API_KEY=your_key`

3. **Polygon.io** (Free: 5 requests/minute)
   - Sign up: https://polygon.io/
   - Add: `POLYGON_API_KEY=your_key`

4. **Financial Modeling Prep** (Free: 250 requests/day)
   - Sign up: https://financialmodelingprep.com/
   - Add: `FMP_API_KEY=your_key`

**Deployment:**
```bash
# Update .env.production.phase3 with your API keys
./scripts/deploy-phase3.sh
```

**Testing:**
```bash
# Test financial data endpoints
curl "https://portfolio-kpi-copilot.vercel.app/api/financial-data?type=market&symbols=AAPL,GOOGL"
curl "https://portfolio-kpi-copilot.vercel.app/api/financial-data?type=economic"
curl "https://portfolio-kpi-copilot.vercel.app/api/financial-data?type=status"
```

---

### **Phase 4: Supabase Database Migration**

**Prerequisites:**
- Phase 3 successfully deployed
- Supabase project configured

**Supabase Setup:**
1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com/
   # Create new project
   # Note your project URL and keys
   ```

2. **Configure Environment**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

3. **Enable Extensions**
   ```sql
   -- In Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

**Migration Process:**
```bash
# 1. Update environment configuration
cp .env.production.phase4 .env.local
# Update with your Supabase credentials

# 2. Run migration dry-run
curl -X POST "http://localhost:3000/api/database/migrate-supabase" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "validateData": true}'

# 3. Execute actual migration
curl -X POST "http://localhost:3000/api/database/migrate-supabase" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "validateData": true}'

# 4. Deploy Phase 4
./scripts/deploy-phase4.sh  # Coming soon
```

---

## 🔧 **Deployment Scripts**

### **Available Scripts:**

```bash
# Interactive deployment orchestrator
./scripts/deploy-orchestrator.sh

# Individual phase deployments
./scripts/deploy-phase1.sh  # Core AI Features
./scripts/deploy-phase2.sh  # Advanced AI Features
./scripts/deploy-phase3.sh  # Financial Data Integration
./scripts/deploy-phase4.sh  # Supabase Migration (coming soon)
```

### **Script Features:**
- ✅ Environment validation
- ✅ Build verification
- ✅ Automatic Vercel environment setup
- ✅ Post-deployment testing
- ✅ Comprehensive error handling
- ✅ Rollback capabilities

---

## 📊 **Monitoring & Verification**

### **Health Checks:**
```bash
# Overall system health
curl "https://portfolio-kpi-copilot.vercel.app/api/health"

# Feature status
curl "https://portfolio-kpi-copilot.vercel.app/api/system/status"

# Financial data provider status
curl "https://portfolio-kpi-copilot.vercel.app/api/financial-data?type=status"
```

### **Performance Monitoring:**
- **Response Times**: <500ms for API endpoints
- **Build Times**: <5 minutes per phase
- **Deployment Success Rate**: >95%
- **API Rate Limits**: Monitored per provider

---

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Build Timeouts**
   ```bash
   # Solution: Deploy with smaller chunks
   vercel env add NODE_OPTIONS "--max-old-space-size=4096" production
   vercel env add SKIP_ENV_VALIDATION true production
   ```

2. **API Key Errors**
   ```bash
   # Check API key configuration
   vercel env ls production | grep API_KEY
   
   # Test individual providers
   curl "https://portfolio-kpi-copilot.vercel.app/api/financial-data?type=status"
   ```

3. **Database Connection Issues**
   ```bash
   # Check Supabase configuration
   curl "https://portfolio-kpi-copilot.vercel.app/api/database/migrate-supabase?action=status"
   ```

4. **Feature Flag Issues**
   ```bash
   # Check current phase
   vercel env ls production | grep DEPLOYMENT_PHASE
   
   # Verify feature flags
   curl "https://portfolio-kpi-copilot.vercel.app/api/system/status"
   ```

---

## 💰 **Cost Management**

### **Free Tier Limits:**
- **Alpha Vantage**: 500 requests/day
- **IEX Cloud**: 500K credits/month
- **Polygon.io**: 5 requests/minute
- **Financial Modeling Prep**: 250 requests/day
- **Supabase**: 500MB database, 2GB bandwidth
- **Vercel**: 100GB bandwidth, 6,000 build minutes

### **Optimization Tips:**
1. **Cache Aggressively**: Longer TTL for stable data
2. **Batch Requests**: Multiple symbols per API call
3. **Smart Scheduling**: Spread requests throughout day
4. **Monitor Usage**: Track API calls and costs
5. **Upgrade Gradually**: Start with free tiers

---

## 🎯 **Next Steps After Deployment**

### **Immediate Actions:**
1. **Test All Features**: Verify each phase works correctly
2. **Monitor Performance**: Check response times and error rates
3. **Set Up Alerts**: Configure monitoring for API failures
4. **Document Usage**: Track API costs and usage patterns

### **Future Enhancements:**
1. **Phase 5**: Enterprise features (RBAC, audit logging)
2. **Phase 6**: Experimental features (document upload, webhooks)
3. **Custom Integrations**: Additional financial data providers
4. **Mobile App**: Native iOS/Android applications
5. **Advanced Analytics**: Machine learning models

---

## 📚 **Additional Resources**

- **Financial API Setup**: `docs/FINANCIAL_API_SETUP.md`
- **Feature Flags**: `src/lib/config/feature-flags.ts`
- **Environment Templates**: `.env.production.phase[1-4]`
- **Deployment Scripts**: `scripts/deploy-*.sh`

---

## 🎉 **Success Metrics**

**Phase 1 Success:**
- ✅ Dashboard loads in <2 seconds
- ✅ AI explanations work correctly
- ✅ Authentication functions properly
- ✅ Basic KPI management operational

**Phase 2 Success:**
- ✅ Natural language queries process correctly
- ✅ Streaming responses work in real-time
- ✅ AI analytics track performance
- ✅ Advanced orchestrator manages providers

**Phase 3 Success:**
- ✅ Real market data loads correctly
- ✅ Economic indicators update regularly
- ✅ Financial news sentiment analysis works
- ✅ All API providers respond within limits

**Phase 4 Success:**
- ✅ Supabase migration completes without data loss
- ✅ Real-time subscriptions function properly
- ✅ Vector search returns relevant results
- ✅ Multi-tenant isolation works correctly

**Ready for enterprise deployment! 🚀**
