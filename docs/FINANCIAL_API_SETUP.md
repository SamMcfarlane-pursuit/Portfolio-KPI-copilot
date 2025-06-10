# 📊 Financial Data Provider API Setup Guide

This guide walks you through setting up API keys for all financial data providers supported by the Portfolio KPI Copilot.

## 🎯 **Quick Setup Priority Order**

For immediate deployment, set up providers in this order:

1. **Alpha Vantage** (Free tier available) - Economic data, news, basic market data
2. **IEX Cloud** (Free tier available) - Real-time market data
3. **Polygon.io** (Free tier available) - Market data, options, forex
4. **Financial Modeling Prep** (Free tier available) - Financial statements

---

## 🔑 **Provider Setup Instructions**

### **1. Alpha Vantage (Recommended First)**

**What it provides:**
- Economic indicators (Fed rates, inflation, unemployment)
- Financial news with sentiment analysis
- Basic stock quotes and company data
- Forex and cryptocurrency data

**Setup Steps:**
1. Visit: https://www.alphavantage.co/support/#api-key
2. Sign up for free account (500 requests/day)
3. Get your API key from dashboard
4. Add to environment variables:

```bash
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

**Free Tier Limits:**
- 500 requests per day
- 5 requests per minute
- No credit card required

**Upgrade Options:**
- Premium: $49.99/month (1,200 requests/minute)
- Enterprise: Custom pricing

---

### **2. IEX Cloud (Recommended Second)**

**What it provides:**
- Real-time and delayed stock quotes
- Company financials and statistics
- Market data and indices
- News and social sentiment

**Setup Steps:**
1. Visit: https://iexcloud.io/
2. Sign up for free account
3. Create API token in console
4. Add to environment variables:

```bash
IEX_CLOUD_API_KEY=your_iex_cloud_api_key_here
```

**Free Tier Limits:**
- 500,000 core data credits/month
- Real-time data available
- No credit card required for signup

**Upgrade Options:**
- Start: $9/month (5M credits)
- Grow: $99/month (100M credits)
- Scale: $999/month (2B credits)

---

### **3. Polygon.io (Recommended Third)**

**What it provides:**
- Real-time and historical market data
- Options and derivatives data
- Forex and cryptocurrency data
- Technical indicators

**Setup Steps:**
1. Visit: https://polygon.io/
2. Sign up for free account
3. Get API key from dashboard
4. Add to environment variables:

```bash
POLYGON_API_KEY=your_polygon_api_key_here
```

**Free Tier Limits:**
- 5 requests per minute
- 2 years of historical data
- Delayed market data (15 minutes)

**Upgrade Options:**
- Starter: $99/month (unlimited requests, real-time)
- Developer: $399/month (includes options data)
- Advanced: $999/month (includes all features)

---

### **4. Financial Modeling Prep (Recommended Fourth)**

**What it provides:**
- Company financial statements
- Financial ratios and metrics
- Industry benchmarks
- ESG scores and ratings

**Setup Steps:**
1. Visit: https://financialmodelingprep.com/
2. Sign up for free account
3. Get API key from dashboard
4. Add to environment variables:

```bash
FMP_API_KEY=your_fmp_api_key_here
```

**Free Tier Limits:**
- 250 requests per day
- Basic financial data
- No real-time data

**Upgrade Options:**
- Starter: $15/month (1,000 requests/day)
- Professional: $50/month (10,000 requests/day)
- Enterprise: $150/month (100,000 requests/day)

---

## 🚀 **Quick Start Configuration**

### **Phase 1: Basic Setup (Free Tiers)**

Create a `.env.local` file with free tier API keys:

```bash
# Financial Data Providers (Free Tiers)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
IEX_CLOUD_API_KEY=your_iex_cloud_key
POLYGON_API_KEY=your_polygon_key
FMP_API_KEY=your_fmp_key

# Enable financial data features
ENABLE_FINANCIAL_DATA_API=true
ENABLE_MARKET_DATA_INTEGRATION=true
ENABLE_ECONOMIC_INDICATORS=true
ENABLE_INDUSTRY_BENCHMARKS=true

# Set deployment phase
DEPLOYMENT_PHASE=3
```

### **Phase 2: Production Setup (Paid Tiers)**

For production deployment with higher limits:

```bash
# Upgraded API keys with higher limits
ALPHA_VANTAGE_API_KEY=premium_alpha_vantage_key
IEX_CLOUD_API_KEY=paid_iex_cloud_key
POLYGON_API_KEY=starter_polygon_key
FMP_API_KEY=professional_fmp_key

# Production optimizations
FINANCIAL_DATA_CACHE_TTL=300
FINANCIAL_DATA_RATE_LIMIT=100
ENABLE_FINANCIAL_DATA_CACHING=true
```

---

## 📊 **API Usage Examples**

### **Test Your Setup**

Once configured, test your APIs:

```bash
# Test financial data endpoint
curl "http://localhost:3000/api/financial-data?type=status"

# Test market data
curl "http://localhost:3000/api/financial-data?type=market&symbols=AAPL,GOOGL"

# Test economic indicators
curl "http://localhost:3000/api/financial-data?type=economic"

# Test industry benchmarks
curl "http://localhost:3000/api/financial-data?type=benchmarks&industry=technology"
```

### **Expected Response Format**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "AAPL",
      "price": 175.43,
      "change": 2.15,
      "changePercent": 1.24,
      "volume": 45678900,
      "marketCap": 2847392847392,
      "timestamp": "2024-01-15T16:00:00Z"
    }
  ],
  "metadata": {
    "symbols": 1,
    "timestamp": "2024-01-15T16:00:00Z",
    "source": "financial-data-service"
  }
}
```

---

## 🔧 **Advanced Configuration**

### **Rate Limiting Configuration**

```bash
# Provider-specific rate limits
ALPHA_VANTAGE_RATE_LIMIT=5  # requests per minute
IEX_CLOUD_RATE_LIMIT=100    # requests per minute
POLYGON_RATE_LIMIT=5        # requests per minute (free tier)
FMP_RATE_LIMIT=250          # requests per day (free tier)

# Global financial data settings
FINANCIAL_DATA_TIMEOUT=10000
FINANCIAL_DATA_RETRY_ATTEMPTS=3
FINANCIAL_DATA_CACHE_TTL=300
```

### **Fallback Configuration**

```bash
# Provider priority order
FINANCIAL_DATA_PRIMARY_PROVIDER=iexcloud
FINANCIAL_DATA_SECONDARY_PROVIDER=alphavantage
FINANCIAL_DATA_TERTIARY_PROVIDER=polygon

# Fallback behavior
ENABLE_FINANCIAL_DATA_FALLBACK=true
ENABLE_MOCK_DATA_FALLBACK=true
```

---

## 💰 **Cost Optimization Tips**

### **Free Tier Optimization**

1. **Cache Aggressively**: Set longer cache TTL for less volatile data
2. **Batch Requests**: Request multiple symbols in single API calls
3. **Smart Scheduling**: Spread requests throughout the day
4. **Prioritize Data**: Focus on most important KPIs first

### **Paid Tier Strategy**

1. **Start Small**: Begin with lowest paid tiers
2. **Monitor Usage**: Track API usage and costs
3. **Optimize Queries**: Use most cost-effective providers for each data type
4. **Scale Gradually**: Upgrade tiers based on actual usage

---

## 🔍 **Monitoring & Troubleshooting**

### **Check Provider Status**

```bash
# Check all provider status
curl "http://localhost:3000/api/financial-data?type=status"

# Expected response
{
  "success": true,
  "status": {
    "configured": ["alphavantage", "iexcloud", "polygon", "fmp"],
    "available": true,
    "primary": "iexcloud"
  }
}
```

### **Common Issues**

1. **Rate Limit Exceeded**
   - Solution: Implement caching, reduce request frequency
   - Check: API usage dashboard on provider website

2. **Invalid API Key**
   - Solution: Verify API key in provider dashboard
   - Check: Environment variable spelling and format

3. **Network Timeouts**
   - Solution: Increase timeout values, implement retry logic
   - Check: Provider status pages for outages

4. **Data Quality Issues**
   - Solution: Implement data validation, use multiple providers
   - Check: Provider documentation for data formats

---

## 📈 **Next Steps**

### **After API Setup**

1. **Test All Endpoints**: Verify each provider works correctly
2. **Monitor Usage**: Track API calls and costs
3. **Optimize Performance**: Implement caching and rate limiting
4. **Scale Gradually**: Upgrade to paid tiers as needed
5. **Add Monitoring**: Set up alerts for API failures

### **Production Deployment**

1. **Environment Variables**: Add all API keys to Vercel environment
2. **Rate Limiting**: Configure appropriate limits for production
3. **Monitoring**: Set up comprehensive logging and alerting
4. **Backup Plans**: Ensure fallback mechanisms work
5. **Cost Tracking**: Monitor API usage and costs

---

## 🎯 **Quick Deployment Checklist**

- [ ] Alpha Vantage API key obtained and tested
- [ ] IEX Cloud API key obtained and tested
- [ ] Polygon.io API key obtained and tested
- [ ] Financial Modeling Prep API key obtained and tested
- [ ] Environment variables configured
- [ ] API endpoints tested locally
- [ ] Rate limiting configured
- [ ] Caching implemented
- [ ] Error handling tested
- [ ] Production environment variables set
- [ ] Monitoring and alerting configured

**Ready for Phase 3 deployment with financial data integration! 🚀**
