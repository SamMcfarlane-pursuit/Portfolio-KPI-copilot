# Phase 1: Redis Caching Setup Guide

## Overview
This guide covers setting up Redis caching for the Portfolio KPI Copilot production deployment.

## Redis Provider Options

### Option 1: Upstash Redis (Recommended for Vercel)
**Pros:** Serverless, integrates well with Vercel, pay-per-request
**Cons:** Higher cost for high-volume usage

1. **Create Upstash Account**
   - Go to [upstash.com](https://upstash.com)
   - Sign up with GitHub/Google
   - Create a new Redis database

2. **Get Connection Details**
   ```bash
   REDIS_URL="rediss://default:your-password@your-endpoint.upstash.io:6380"
   UPSTASH_REDIS_REST_URL="https://your-endpoint.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-rest-token"
   ```

3. **Add to Environment Variables**
   ```bash
   # Add to .env.production
   REDIS_URL="rediss://default:your-password@your-endpoint.upstash.io:6380"
   UPSTASH_REDIS_REST_URL="https://your-endpoint.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-rest-token"
   ENABLE_REDIS_CACHING="true"
   ```

### Option 2: Railway Redis
**Pros:** Simple setup, good pricing, PostgreSQL + Redis combo
**Cons:** Less serverless-optimized than Upstash

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Create new project
   - Add Redis service

2. **Get Connection String**
   ```bash
   REDIS_URL="redis://default:password@redis.railway.internal:6379"
   ```

### Option 3: Redis Cloud
**Pros:** Managed by Redis Labs, high performance
**Cons:** More complex setup

1. **Create Redis Cloud Account**
   - Go to [redis.com/cloud](https://redis.com/cloud)
   - Create free tier database
   - Get connection details

## Implementation Steps

### Step 1: Install Redis Dependencies
```bash
npm install redis @upstash/redis ioredis
```

### Step 2: Update Environment Configuration
Add Redis configuration to `.env.production`:

```bash
# Redis Configuration
REDIS_URL="your-redis-connection-string"
REDIS_PASSWORD="your-redis-password"
ENABLE_REDIS_CACHING="true"
CACHE_TTL="3600"
REDIS_MAX_RETRIES="3"
REDIS_RETRY_DELAY="1000"
```

### Step 3: Configure Redis Client
The application already includes Redis client configuration in:
- `src/lib/redis.ts` - Redis client setup
- `src/lib/cache.ts` - Caching utilities

### Step 4: Deploy with Redis
```bash
# Update Vercel environment variables
vercel env add REDIS_URL production
vercel env add ENABLE_REDIS_CACHING production

# Deploy
vercel --prod
```

## Caching Strategy

### What Gets Cached
1. **API Responses** (TTL: 5 minutes)
   - Portfolio data
   - KPI calculations
   - Analytics results

2. **User Sessions** (TTL: 24 hours)
   - Authentication tokens
   - User preferences

3. **AI Responses** (TTL: 1 hour)
   - LLM completions
   - Analysis results

4. **Database Queries** (TTL: 15 minutes)
   - Frequently accessed data
   - Aggregated statistics

### Cache Keys Structure
```
portfolio-kpi:api:portfolios:{userId}:{orgId}
portfolio-kpi:kpi:calculations:{portfolioId}
portfolio-kpi:ai:response:{queryHash}
portfolio-kpi:user:session:{sessionId}
```

## Monitoring Redis

### Health Check Integration
The health check endpoints will automatically include Redis status:
- `/api/health` - Basic Redis connectivity
- `/api/system/comprehensive-status` - Detailed Redis metrics

### Redis Metrics to Monitor
1. **Connection Status** - Is Redis reachable?
2. **Memory Usage** - Current memory consumption
3. **Hit Rate** - Cache effectiveness
4. **Response Time** - Redis query performance
5. **Error Rate** - Failed operations

### Monitoring Commands
```bash
# Check Redis health
curl https://portfolio-kpi-copilot.vercel.app/api/health | jq '.services.redis'

# View comprehensive status
curl https://portfolio-kpi-copilot.vercel.app/api/system/comprehensive-status | jq '.services.cache'
```

## Performance Optimization

### Cache Warming Strategy
1. **Startup Cache Warming**
   - Pre-load frequently accessed data
   - Cache common query results

2. **Background Refresh**
   - Update cache before expiration
   - Maintain fresh data for users

3. **Intelligent Invalidation**
   - Clear related caches on data updates
   - Use cache tags for bulk invalidation

### Redis Configuration Tuning
```bash
# Recommended Redis settings for production
maxmemory-policy=allkeys-lru
timeout=300
tcp-keepalive=60
```

## Fallback Strategy

### Cache Miss Handling
1. **Graceful Degradation** - Application works without cache
2. **Database Fallback** - Direct database queries when cache fails
3. **Error Logging** - Track cache failures for monitoring

### Implementation
```typescript
// Example cache-first pattern
async function getCachedData(key: string, fallbackFn: () => Promise<any>) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.warn('Cache miss:', error);
  }
  
  // Fallback to database
  const data = await fallbackFn();
  
  // Try to cache for next time
  try {
    await redis.setex(key, 3600, JSON.stringify(data));
  } catch (error) {
    console.warn('Cache set failed:', error);
  }
  
  return data;
}
```

## Security Considerations

### Redis Security
1. **Connection Encryption** - Use TLS/SSL (rediss://)
2. **Authentication** - Strong passwords/tokens
3. **Network Security** - VPC/private networks when possible
4. **Data Encryption** - Encrypt sensitive cached data

### Environment Variables Security
```bash
# Use Vercel's encrypted environment variables
vercel env add REDIS_URL production --sensitive
vercel env add REDIS_PASSWORD production --sensitive
```

## Cost Optimization

### Upstash Pricing Tips
1. **Request Optimization** - Batch operations when possible
2. **TTL Management** - Set appropriate expiration times
3. **Data Size** - Compress large cached objects
4. **Usage Monitoring** - Track daily/monthly usage

### Cost Monitoring
```bash
# Monitor Redis usage
curl "https://api.upstash.com/v2/redis/stats" \
  -H "Authorization: Bearer $UPSTASH_API_TOKEN"
```

## Troubleshooting

### Common Issues
1. **Connection Timeouts** - Check network/firewall settings
2. **Memory Limits** - Monitor Redis memory usage
3. **SSL/TLS Issues** - Verify certificate configuration
4. **Performance** - Check Redis latency and throughput

### Debug Commands
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Monitor Redis operations
redis-cli -u $REDIS_URL monitor

# Check Redis info
redis-cli -u $REDIS_URL info
```

## Next Steps After Redis Setup

1. **Deploy Updated Configuration**
   ```bash
   ./scripts/phase1-deploy.sh
   ```

2. **Verify Caching is Working**
   ```bash
   curl https://portfolio-kpi-copilot.vercel.app/api/health
   ```

3. **Monitor Performance Improvements**
   - Check API response times
   - Monitor cache hit rates
   - Verify reduced database load

4. **Proceed to Phase 2**
   - OAuth authentication setup
   - RBAC implementation
   - Security hardening
