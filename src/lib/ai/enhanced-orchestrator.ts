/**
 * Enhanced AI Orchestrator
 * Production-optimized AI service management with caching, load balancing, and monitoring
 */

import { redisCache } from '@/lib/cache/redis-cache'
import { aiOrchestrator } from './orchestrator'
import { openRouterService } from './openrouter'
import { ollamaService } from './ollama'

export interface AIRequest {
  prompt: string
  context?: any
  userId?: string
  organizationId?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  maxTokens?: number
  temperature?: number
  model?: string
  cacheKey?: string
  cacheTTL?: number
}

export interface AIResponse {
  content: string
  model: string
  provider: string
  tokens: {
    prompt: number
    completion: number
    total: number
  }
  cost: number
  confidence: number
  processingTime: number
  cached: boolean
  metadata: {
    requestId: string
    timestamp: string
    userId?: string
    organizationId?: string
  }
}

export interface ProviderHealth {
  name: string
  available: boolean
  responseTime: number
  errorRate: number
  cost: number
  priority: number
  lastChecked: number
}

export class EnhancedAIOrchestrator {
  private static instance: EnhancedAIOrchestrator
  private providers: Map<string, ProviderHealth> = new Map()
  private requestQueue: AIRequest[] = []
  private processing = false
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    totalCost: 0
  }

  private constructor() {
    this.initializeProviders()
    this.startHealthChecks()
    this.startQueueProcessor()
  }

  static getInstance(): EnhancedAIOrchestrator {
    if (!EnhancedAIOrchestrator.instance) {
      EnhancedAIOrchestrator.instance = new EnhancedAIOrchestrator()
    }
    return EnhancedAIOrchestrator.instance
  }

  private initializeProviders(): void {
    // Initialize provider health tracking
    this.providers.set('openrouter', {
      name: 'OpenRouter',
      available: false,
      responseTime: 0,
      errorRate: 0,
      cost: 0.002, // per 1k tokens
      priority: 1,
      lastChecked: 0
    })

    this.providers.set('ollama', {
      name: 'Ollama',
      available: false,
      responseTime: 0,
      errorRate: 0,
      cost: 0, // free
      priority: 2,
      lastChecked: 0
    })

    this.providers.set('openai', {
      name: 'OpenAI',
      available: false,
      responseTime: 0,
      errorRate: 0,
      cost: 0.003, // per 1k tokens
      priority: 3,
      lastChecked: 0
    })
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()
    
    this.stats.totalRequests++

    try {
      // Check cache first
      if (request.cacheKey) {
        const cached = await this.getCachedResponse(request.cacheKey)
        if (cached) {
          this.stats.cacheHits++
          return {
            ...cached,
            cached: true,
            metadata: {
              ...cached.metadata,
              requestId
            }
          }
        }
      }

      // Select best available provider
      const provider = await this.selectProvider(request)
      if (!provider) {
        throw new Error('No AI providers available')
      }

      // Process request with selected provider
      const response = await this.executeRequest(request, provider, requestId)
      
      // Cache response if cache key provided
      if (request.cacheKey && response.confidence > 70) {
        await this.cacheResponse(request.cacheKey, response, request.cacheTTL)
      }

      // Update statistics
      this.updateStats(response, startTime)
      this.stats.successfulRequests++

      return response

    } catch (error) {
      this.stats.failedRequests++
      console.error('AI request failed:', error)
      
      // Return fallback response
      return this.createFallbackResponse(request, requestId, error)
    }
  }

  private async selectProvider(request: AIRequest): Promise<string | null> {
    // Get available providers sorted by priority and health
    const availableProviders = Array.from(this.providers.entries())
      .filter(([_, health]) => health.available)
      .sort((a, b) => {
        // Sort by priority first, then by response time and error rate
        if (a[1].priority !== b[1].priority) {
          return a[1].priority - b[1].priority
        }
        
        const aScore = a[1].responseTime * (1 + a[1].errorRate)
        const bScore = b[1].responseTime * (1 + b[1].errorRate)
        return aScore - bScore
      })

    if (availableProviders.length === 0) {
      return null
    }

    // For high priority requests, prefer faster providers
    if (request.priority === 'critical' || request.priority === 'high') {
      return availableProviders[0][0]
    }

    // For low priority requests, prefer cost-effective providers
    if (request.priority === 'low') {
      const costEffective = availableProviders
        .sort((a, b) => a[1].cost - b[1].cost)
      return costEffective[0][0]
    }

    // Default to best overall provider
    return availableProviders[0][0]
  }

  private async executeRequest(
    request: AIRequest,
    providerName: string,
    requestId: string
  ): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      let result: any

      switch (providerName) {
        case 'openrouter':
          result = await openRouterService.chat(
            [{ role: 'user', content: request.prompt }],
            {
              model: request.model || 'anthropic/claude-3-sonnet',
              maxTokens: request.maxTokens || 1000,
              temperature: request.temperature || 0.7
            }
          )
          break

        case 'ollama':
          result = await ollamaService.generate(request.prompt, {
            model: request.model || 'llama2',
            maxTokens: request.maxTokens || 1000,
            temperature: request.temperature || 0.7
          })
          break

        case 'openai':
          // OpenAI integration would go here
          throw new Error('OpenAI provider not implemented')

        default:
          throw new Error(`Unknown provider: ${providerName}`)
      }

      const processingTime = Date.now() - startTime
      const provider = this.providers.get(providerName)!

      // Update provider health
      provider.responseTime = (provider.responseTime + processingTime) / 2
      provider.lastChecked = Date.now()

      return {
        content: result.content || result.response || '',
        model: result.model || request.model || 'unknown',
        provider: providerName,
        tokens: {
          prompt: result.promptTokens || 0,
          completion: result.completionTokens || 0,
          total: result.totalTokens || 0
        },
        cost: this.calculateCost(result.totalTokens || 0, provider.cost),
        confidence: this.calculateConfidence(result),
        processingTime,
        cached: false,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          userId: request.userId,
          organizationId: request.organizationId
        }
      }

    } catch (error) {
      // Update provider error rate
      const provider = this.providers.get(providerName)
      if (provider) {
        provider.errorRate = Math.min(1, provider.errorRate + 0.1)
        provider.available = provider.errorRate < 0.5
      }

      throw error
    }
  }

  private async getCachedResponse(cacheKey: string): Promise<AIResponse | null> {
    try {
      return await redisCache.get<AIResponse>(`ai:${cacheKey}`)
    } catch (error) {
      console.error('Cache retrieval error:', error)
      return null
    }
  }

  private async cacheResponse(
    cacheKey: string,
    response: AIResponse,
    ttl?: number
  ): Promise<void> {
    try {
      await redisCache.set(`ai:${cacheKey}`, response, ttl || 1800) // 30 minutes default
    } catch (error) {
      console.error('Cache storage error:', error)
    }
  }

  private calculateCost(tokens: number, costPerThousand: number): number {
    return (tokens / 1000) * costPerThousand
  }

  private calculateConfidence(result: any): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 80 // Base confidence

    if (result.content && result.content.length > 50) {
      confidence += 10
    }

    if (result.reasoning || result.explanation) {
      confidence += 5
    }

    if (result.uncertainty || result.content.includes('I\'m not sure')) {
      confidence -= 20
    }

    return Math.max(0, Math.min(100, confidence))
  }

  private updateStats(response: AIResponse, startTime: number): void {
    const responseTime = Date.now() - startTime
    
    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1)
    this.stats.averageResponseTime = (totalTime + responseTime) / this.stats.totalRequests

    // Update total cost
    this.stats.totalCost += response.cost
  }

  private createFallbackResponse(
    request: AIRequest,
    requestId: string,
    error: any
  ): AIResponse {
    return {
      content: 'I apologize, but I\'m currently unable to process your request. Please try again later.',
      model: 'fallback',
      provider: 'fallback',
      tokens: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      confidence: 0,
      processingTime: 0,
      cached: false,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        userId: request.userId,
        organizationId: request.organizationId
      }
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startHealthChecks(): void {
    // Check provider health every 2 minutes
    setInterval(async () => {
      await this.checkProviderHealth()
    }, 2 * 60 * 1000)

    // Initial health check
    setTimeout(() => this.checkProviderHealth(), 1000)
  }

  private async checkProviderHealth(): Promise<void> {
    const healthChecks = Array.from(this.providers.keys()).map(async (providerName) => {
      const provider = this.providers.get(providerName)!
      const startTime = Date.now()

      try {
        let isHealthy = false

        switch (providerName) {
          case 'openrouter':
            isHealthy = openRouterService.isAvailable()
            break
          case 'ollama':
            const ollamaStatus = await ollamaService.healthCheck()
            isHealthy = ollamaStatus.status === 'healthy'
            break
          case 'openai':
            isHealthy = !!process.env.OPENAI_API_KEY
            break
        }

        provider.available = isHealthy
        provider.responseTime = Date.now() - startTime
        provider.errorRate = Math.max(0, provider.errorRate - 0.05) // Gradual recovery
        provider.lastChecked = Date.now()

      } catch (error) {
        provider.available = false
        provider.errorRate = Math.min(1, provider.errorRate + 0.1)
        provider.lastChecked = Date.now()
      }
    })

    await Promise.allSettled(healthChecks)
  }

  private startQueueProcessor(): void {
    // Process queued requests every 100ms
    setInterval(() => {
      if (!this.processing && this.requestQueue.length > 0) {
        this.processQueue()
      }
    }, 100)
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) return

    this.processing = true

    try {
      // Process high priority requests first
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']
      })

      // Process up to 5 requests concurrently
      const batch = this.requestQueue.splice(0, 5)
      await Promise.allSettled(batch.map(request => this.processRequest(request)))

    } finally {
      this.processing = false
    }
  }

  // Public methods
  async queueRequest(request: AIRequest): Promise<void> {
    this.requestQueue.push(request)
  }

  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providers.values())
  }

  getStats(): any {
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      providers: this.getProviderHealth(),
      cacheHitRate: this.stats.totalRequests > 0 
        ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  async clearCache(): Promise<void> {
    try {
      // Clear AI-related cache entries
      await redisCache.flush()
    } catch (error) {
      console.error('Error clearing AI cache:', error)
    }
  }
}

// Export singleton instance
export const enhancedAIOrchestrator = EnhancedAIOrchestrator.getInstance()
