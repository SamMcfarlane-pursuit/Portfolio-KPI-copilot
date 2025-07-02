# AI Services Production Setup
## Portfolio KPI Copilot AI Infrastructure

### 🎯 Overview
Configure production-ready AI services with monitoring, caching, and cost optimization.

### 🔑 API Key Setup

#### 1. OpenRouter Configuration
```bash
# Sign up at https://openrouter.ai
# Get API key from dashboard
# Set up billing and usage limits

OPENROUTER_API_KEY="sk-or-v1-your-openrouter-key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_DEFAULT_MODEL="anthropic/claude-3.5-sonnet"
OPENROUTER_FALLBACK_MODEL="openai/gpt-4o"

# Usage limits
OPENROUTER_MONTHLY_LIMIT="1000" # $1000/month
OPENROUTER_DAILY_LIMIT="50" # $50/day
```

#### 2. OpenAI Configuration
```bash
# Get API key from https://platform.openai.com
# Set up usage monitoring and billing alerts

OPENAI_API_KEY="sk-your-openai-key"
OPENAI_ORGANIZATION="org-your-organization-id"
OPENAI_PROJECT="proj_your-project-id"

# Usage limits
OPENAI_MONTHLY_LIMIT="500" # $500/month
OPENAI_RATE_LIMIT="100" # requests per minute
```

#### 3. Ollama Local Setup (Optional)
```bash
# For on-premise AI processing
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:latest"
ENABLE_OLLAMA="true"

# Docker deployment
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  ollama/ollama

# Pull models
docker exec ollama ollama pull llama3.2:latest
docker exec ollama ollama pull codellama:latest
```

### 🔧 Enhanced AI Orchestrator

#### Production AI Configuration
```typescript
// src/lib/ai/production-config.ts
export const productionAIConfig = {
  providers: {
    openrouter: {
      enabled: true,
      priority: 1,
      models: {
        primary: 'anthropic/claude-3.5-sonnet',
        fallback: 'openai/gpt-4o',
        fast: 'openai/gpt-4o-mini',
        coding: 'anthropic/claude-3.5-sonnet'
      },
      limits: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
        monthlyBudget: 1000
      }
    },
    openai: {
      enabled: true,
      priority: 2,
      models: {
        primary: 'gpt-4o',
        fallback: 'gpt-4o-mini',
        fast: 'gpt-4o-mini',
        embedding: 'text-embedding-3-small'
      },
      limits: {
        requestsPerMinute: 100,
        tokensPerMinute: 150000,
        monthlyBudget: 500
      }
    },
    ollama: {
      enabled: process.env.ENABLE_OLLAMA === 'true',
      priority: 3,
      models: {
        primary: 'llama3.2:latest',
        coding: 'codellama:latest'
      },
      limits: {
        requestsPerMinute: 30,
        concurrent: 5
      }
    }
  },
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000, // 1000 cached responses
    redis: {
      enabled: process.env.REDIS_URL ? true : false,
      url: process.env.REDIS_URL
    }
  },
  monitoring: {
    enabled: true,
    logLevel: 'info',
    metrics: {
      responseTime: true,
      tokenUsage: true,
      errorRate: true,
      costTracking: true
    }
  }
}
```

#### Enhanced AI Orchestrator
```typescript
// src/lib/ai/production-orchestrator.ts
import { productionAIConfig } from './production-config'
import Redis from 'ioredis'

export class ProductionAIOrchestrator {
  private redis?: Redis
  private usageTracker = new Map<string, any>()
  private costTracker = new Map<string, number>()

  constructor() {
    if (productionAIConfig.caching.redis.enabled) {
      this.redis = new Redis(productionAIConfig.caching.redis.url!)
    }
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      // Check cache first
      const cached = await this.getCachedResponse(request)
      if (cached) {
        return this.createResponse(cached, { fromCache: true, requestId })
      }

      // Check rate limits
      await this.checkRateLimits(request)

      // Select optimal provider
      const provider = await this.selectProvider(request)

      // Process request
      const response = await this.executeRequest(request, provider)

      // Cache response
      await this.cacheResponse(request, response)

      // Track usage and costs
      await this.trackUsage(provider, request, response)

      // Log metrics
      await this.logMetrics(requestId, provider, Date.now() - startTime, response)

      return response

    } catch (error) {
      await this.handleError(error, requestId, request)
      throw error
    }
  }

  private async selectProvider(request: AIRequest): Promise<string> {
    const providers = Object.entries(productionAIConfig.providers)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority)

    for (const [name, config] of providers) {
      // Check if provider is available and within limits
      if (await this.isProviderAvailable(name, config)) {
        return name
      }
    }

    throw new Error('No AI providers available')
  }

  private async isProviderAvailable(name: string, config: any): Promise<boolean> {
    // Check rate limits
    const usage = this.usageTracker.get(name) || { requests: 0, tokens: 0, resetTime: Date.now() + 60000 }
    
    if (Date.now() > usage.resetTime) {
      usage.requests = 0
      usage.tokens = 0
      usage.resetTime = Date.now() + 60000
    }

    if (usage.requests >= config.limits.requestsPerMinute) {
      return false
    }

    // Check monthly budget
    const monthlyCost = this.costTracker.get(`${name}_monthly`) || 0
    if (monthlyCost >= config.limits.monthlyBudget) {
      return false
    }

    // Check provider health
    return await this.checkProviderHealth(name)
  }

  private async checkProviderHealth(provider: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'openrouter':
          const orResponse = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
          })
          return orResponse.ok

        case 'openai':
          const oaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
          })
          return oaiResponse.ok

        case 'ollama':
          const ollamaResponse = await fetch(`${process.env.OLLAMA_BASE_URL}/api/tags`)
          return ollamaResponse.ok

        default:
          return false
      }
    } catch {
      return false
    }
  }

  private async getCachedResponse(request: AIRequest): Promise<any> {
    if (!productionAIConfig.caching.enabled) return null

    const cacheKey = this.generateCacheKey(request)

    if (this.redis) {
      const cached = await this.redis.get(cacheKey)
      return cached ? JSON.parse(cached) : null
    }

    // In-memory cache fallback
    return this.memoryCache.get(cacheKey)
  }

  private async cacheResponse(request: AIRequest, response: any): Promise<void> {
    if (!productionAIConfig.caching.enabled) return

    const cacheKey = this.generateCacheKey(request)
    const ttl = productionAIConfig.caching.ttl

    if (this.redis) {
      await this.redis.setex(cacheKey, ttl, JSON.stringify(response))
    } else {
      this.memoryCache.set(cacheKey, response)
      setTimeout(() => this.memoryCache.delete(cacheKey), ttl * 1000)
    }
  }

  private async trackUsage(provider: string, request: AIRequest, response: any): Promise<void> {
    // Update usage counters
    const usage = this.usageTracker.get(provider) || { requests: 0, tokens: 0, resetTime: Date.now() + 60000 }
    usage.requests++
    usage.tokens += response.usage?.total_tokens || 0
    this.usageTracker.set(provider, usage)

    // Track costs
    const cost = this.calculateCost(provider, response)
    const dailyCost = this.costTracker.get(`${provider}_daily`) || 0
    const monthlyCost = this.costTracker.get(`${provider}_monthly`) || 0
    
    this.costTracker.set(`${provider}_daily`, dailyCost + cost)
    this.costTracker.set(`${provider}_monthly`, monthlyCost + cost)

    // Store in database for analytics
    await this.storeUsageMetrics(provider, request, response, cost)
  }

  private calculateCost(provider: string, response: any): number {
    const usage = response.usage
    if (!usage) return 0

    // Cost calculation based on provider pricing
    switch (provider) {
      case 'openrouter':
        // OpenRouter pricing varies by model
        return (usage.prompt_tokens * 0.00001) + (usage.completion_tokens * 0.00003)
      
      case 'openai':
        // OpenAI GPT-4o pricing
        return (usage.prompt_tokens * 0.0025 / 1000) + (usage.completion_tokens * 0.01 / 1000)
      
      case 'ollama':
        // Local deployment - no API costs
        return 0
      
      default:
        return 0
    }
  }

  private async logMetrics(requestId: string, provider: string, responseTime: number, response: any): Promise<void> {
    const metrics = {
      requestId,
      provider,
      responseTime,
      tokenUsage: response.usage,
      timestamp: new Date().toISOString(),
      success: true
    }

    console.log('[AI_METRICS]', metrics)

    // Send to monitoring service
    if (process.env.MONITORING_WEBHOOK) {
      await fetch(process.env.MONITORING_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      }).catch(console.error)
    }
  }
}
```

### 📊 AI Usage Monitoring

#### Usage Dashboard Component
```typescript
// src/components/ai/usage-dashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export function AIUsageDashboard() {
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v2/ai/usage')
      .then(res => res.json())
      .then(data => setUsage(data.data))
  }, [])

  if (!usage) return <div>Loading...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(usage.providers).map(([provider, data]: [string, any]) => (
        <Card key={provider}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {provider}
              <Badge variant={data.status === 'healthy' ? 'default' : 'destructive'}>
                {data.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Requests</span>
                <span>{data.requests}/{data.limits.requestsPerMinute}/min</span>
              </div>
              <Progress value={(data.requests / data.limits.requestsPerMinute) * 100} />
            </div>
            
            <div>
              <div className="flex justify-between text-sm">
                <span>Monthly Cost</span>
                <span>${data.monthlyCost}/${data.limits.monthlyBudget}</span>
              </div>
              <Progress value={(data.monthlyCost / data.limits.monthlyBudget) * 100} />
            </div>
            
            <div className="text-xs text-muted-foreground">
              Avg Response: {data.avgResponseTime}ms
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### 🚀 Deployment Configuration

#### Environment Variables
```bash
# Production AI Configuration
OPENROUTER_API_KEY="sk-or-v1-your-production-key"
OPENAI_API_KEY="sk-your-production-key"
OLLAMA_BASE_URL="http://ollama-service:11434"

# Redis for caching
REDIS_URL="redis://redis-service:6379"

# Monitoring
MONITORING_WEBHOOK="https://monitoring.company.com/webhook"
AI_USAGE_ALERTS="true"
COST_ALERT_THRESHOLD="100" # Alert when daily cost exceeds $100

# Feature flags
ENABLE_AI_CACHING="true"
ENABLE_COST_TRACKING="true"
ENABLE_USAGE_ANALYTICS="true"
```

#### Docker Compose for AI Services
```yaml
# docker-compose.ai.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_KEEP_ALIVE=24h

volumes:
  redis_data:
  ollama_data:
```

### ✅ Testing & Validation

#### AI Services Testing
```bash
# Test all providers
npm run test:ai-providers

# Test caching
npm run test:ai-cache

# Test rate limiting
npm run test:ai-limits

# Test cost tracking
npm run test:ai-costs
```

#### Load Testing
```bash
# Simulate high AI usage
npm run test:ai-load

# Test failover scenarios
npm run test:ai-failover
```

### 📈 Monitoring & Alerts

#### Cost Monitoring
- Daily/monthly budget alerts
- Usage spike detection
- Provider cost comparison
- ROI analysis

#### Performance Monitoring
- Response time tracking
- Error rate monitoring
- Cache hit rate analysis
- Provider availability monitoring
