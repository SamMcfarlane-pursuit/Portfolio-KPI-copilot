/**
 * Enhanced AI Service
 * Intelligent model selection, streaming, and advanced AI capabilities
 */

import { openRouterService } from './openrouter'
import { openaiService } from './openai'
import { redisCache } from '@/lib/cache/redis-cache'

export interface AIRequest {
  prompt: string
  context?: {
    type: 'kpi_analysis' | 'portfolio_review' | 'forecast' | 'benchmark' | 'natural_language'
    data?: any
    userId?: string
    organizationId?: string
    portfolioId?: string
  }
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
    priority?: 'speed' | 'quality' | 'cost'
    provider?: 'openrouter' | 'openai' | 'auto'
  }
  onStream?: (chunk: string) => void
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

export interface ModelSelection {
  provider: 'openrouter' | 'openai'
  model: string
  reasoning: string
  estimatedCost: number
  estimatedTime: number
}

export class EnhancedAIService {
  private static instance: EnhancedAIService
  private requestCount = 0
  private totalCost = 0
  private averageResponseTime = 0

  private constructor() {}

  static getInstance(): EnhancedAIService {
    if (!EnhancedAIService.instance) {
      EnhancedAIService.instance = new EnhancedAIService()
    }
    return EnhancedAIService.instance
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(request)
      
      // Check cache first
      const cached = await this.getCachedResponse(cacheKey)
      if (cached) {
        return {
          ...cached,
          cached: true,
          metadata: {
            ...cached.metadata,
            requestId
          }
        }
      }

      // Select optimal model and provider
      const selection = await this.selectOptimalModel(request)
      
      // Process request with selected provider
      const response = await this.executeRequest(request, selection, requestId)
      
      // Cache response if appropriate
      if (response.confidence > 70 && !request.options?.stream) {
        await this.cacheResponse(cacheKey, response)
      }

      // Update statistics
      this.updateStats(response, startTime)

      return response

    } catch (error) {
      console.error('AI request failed:', error)
      return this.createFallbackResponse(request, requestId, error)
    }
  }

  async processNaturalLanguageQuery(
    query: string,
    context: {
      portfolios?: any[]
      kpis?: any[]
      organizationId?: string
      userId?: string
    } = {}
  ): Promise<{
    intent: string
    entities: any[]
    filters: any
    sqlQuery?: string
    response: string
    confidence: number
  }> {
    const request: AIRequest = {
      prompt: query,
      context: {
        type: 'natural_language',
        data: context,
        userId: context.userId,
        organizationId: context.organizationId
      },
      options: {
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.1,
        priority: 'quality'
      }
    }

    try {
      const nlResult = await openRouterService.processNaturalLanguageQuery(query, context)
      
      // Generate SQL query if needed
      const sqlQuery = await this.generateSQLFromNL(nlResult, context)
      
      return {
        ...nlResult,
        sqlQuery
      }

    } catch (error) {
      console.error('Natural language processing error:', error)
      throw error
    }
  }

  async analyzePortfolioRisk(
    portfolioData: any[],
    marketConditions: any = {}
  ): Promise<{
    riskScore: number
    riskFactors: Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }>
    recommendations: string[]
    scenarios: Array<{ name: string; probability: number; impact: string }>
  }> {
    const request: AIRequest = {
      prompt: `Analyze portfolio risk for the following data: ${JSON.stringify(portfolioData)}`,
      context: {
        type: 'portfolio_review',
        data: { portfolioData, marketConditions }
      },
      options: {
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.1,
        priority: 'quality'
      }
    }

    const response = await this.processRequest(request)
    return this.parseRiskAnalysisResponse(response.content)
  }

  async generateMarketInsights(
    industry: string,
    timeframe: string = '12m'
  ): Promise<{
    trends: string[]
    opportunities: string[]
    threats: string[]
    outlook: string
    confidence: number
  }> {
    const request: AIRequest = {
      prompt: `Generate market insights for ${industry} industry over ${timeframe} timeframe`,
      context: {
        type: 'forecast',
        data: { industry, timeframe }
      },
      options: {
        model: 'google/gemini-pro-1.5',
        temperature: 0.2,
        priority: 'quality'
      }
    }

    const response = await this.processRequest(request)
    return this.parseMarketInsightsResponse(response.content)
  }

  private async selectOptimalModel(request: AIRequest): Promise<ModelSelection> {
    const { context, options } = request
    const priority = options?.priority || 'quality'
    const provider = options?.provider || 'auto'

    // If specific provider requested
    if (provider !== 'auto') {
      return this.getProviderSelection(provider, request)
    }

    // Auto-select based on request type and priority
    switch (context?.type) {
      case 'kpi_analysis':
      case 'portfolio_review':
        return {
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          reasoning: 'Best for analytical tasks and reasoning',
          estimatedCost: 0.003,
          estimatedTime: 2000
        }

      case 'forecast':
        return {
          provider: 'openrouter',
          model: 'google/gemini-pro-1.5',
          reasoning: 'Excellent for data analysis and large context',
          estimatedCost: 0.001,
          estimatedTime: 3000
        }

      case 'natural_language':
        return {
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          reasoning: 'Superior natural language understanding',
          estimatedCost: 0.003,
          estimatedTime: 1500
        }

      default:
        if (priority === 'cost') {
          return {
            provider: 'openrouter',
            model: 'meta-llama/llama-3.1-70b-instruct',
            reasoning: 'Cost-effective for general tasks',
            estimatedCost: 0.0009,
            estimatedTime: 2500
          }
        } else {
          return {
            provider: 'openrouter',
            model: 'anthropic/claude-3.5-sonnet',
            reasoning: 'High quality general purpose model',
            estimatedCost: 0.003,
            estimatedTime: 2000
          }
        }
    }
  }

  private getProviderSelection(provider: string, request: AIRequest): ModelSelection {
    if (provider === 'openai') {
      return {
        provider: 'openai',
        model: 'gpt-4o',
        reasoning: 'OpenAI GPT-4o for high quality responses',
        estimatedCost: 0.005,
        estimatedTime: 1800
      }
    } else {
      return {
        provider: 'openrouter',
        model: request.options?.model || 'anthropic/claude-3.5-sonnet',
        reasoning: 'OpenRouter with specified or default model',
        estimatedCost: 0.003,
        estimatedTime: 2000
      }
    }
  }

  private async executeRequest(
    request: AIRequest,
    selection: ModelSelection,
    requestId: string
  ): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      let content: string
      let tokens = { prompt: 0, completion: 0, total: 0 }

      if (selection.provider === 'openrouter') {
        const messages = [{ role: 'user', content: request.prompt }]
        content = await openRouterService.chat(messages, {
          model: selection.model,
          temperature: request.options?.temperature || 0.1,
          maxTokens: request.options?.maxTokens || 4000,
          stream: request.options?.stream || false,
          onStream: request.onStream
        })
      } else {
        const messages = [{ role: 'user', content: request.prompt }]
        content = await openaiService.chat(messages, {
          model: selection.model,
          temperature: request.options?.temperature || 0.1,
          maxTokens: request.options?.maxTokens || 4000
        })
      }

      const processingTime = Date.now() - startTime
      const cost = this.calculateCost(tokens.total, selection.estimatedCost)
      const confidence = this.calculateConfidence(content, request.context?.type)

      return {
        content,
        model: selection.model,
        provider: selection.provider,
        tokens,
        cost,
        confidence,
        processingTime,
        cached: false,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          userId: request.context?.userId,
          organizationId: request.context?.organizationId
        }
      }

    } catch (error) {
      throw new Error(`${selection.provider} request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private generateCacheKey(request: AIRequest): string {
    const keyData = {
      prompt: request.prompt.substring(0, 100),
      type: request.context?.type,
      model: request.options?.model,
      temperature: request.options?.temperature
    }
    return `ai:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`
  }

  private async getCachedResponse(cacheKey: string): Promise<AIResponse | null> {
    try {
      return await redisCache.get<AIResponse>(cacheKey)
    } catch (error) {
      console.warn('Cache retrieval error:', error)
      return null
    }
  }

  private async cacheResponse(cacheKey: string, response: AIResponse): Promise<void> {
    try {
      await redisCache.set(cacheKey, response, 1800) // 30 minutes
    } catch (error) {
      console.warn('Cache storage error:', error)
    }
  }

  private calculateCost(tokens: number, costPer1k: number): number {
    return (tokens / 1000) * costPer1k
  }

  private calculateConfidence(content: string, type?: string): number {
    let confidence = 80 // Base confidence

    // Adjust based on content characteristics
    if (content.length > 100) confidence += 5
    if (content.includes('analysis') || content.includes('data')) confidence += 5
    if (content.includes('uncertain') || content.includes('unclear')) confidence -= 15
    if (type === 'kpi_analysis' && content.includes('KPI')) confidence += 10

    return Math.max(0, Math.min(100, confidence))
  }

  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private updateStats(response: AIResponse, startTime: number): void {
    this.requestCount++
    this.totalCost += response.cost
    
    const responseTime = Date.now() - startTime
    this.averageResponseTime = (this.averageResponseTime * (this.requestCount - 1) + responseTime) / this.requestCount
  }

  private createFallbackResponse(request: AIRequest, requestId: string, error: any): AIResponse {
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
        userId: request.context?.userId,
        organizationId: request.context?.organizationId
      }
    }
  }

  // Response parsing methods
  private parseRiskAnalysisResponse(content: string): any {
    // Parse risk analysis response - would use more sophisticated parsing in production
    return {
      riskScore: 65,
      riskFactors: [],
      recommendations: [],
      scenarios: []
    }
  }

  private parseMarketInsightsResponse(content: string): any {
    // Parse market insights response
    return {
      trends: [],
      opportunities: [],
      threats: [],
      outlook: content,
      confidence: 85
    }
  }

  private async generateSQLFromNL(nlResult: any, context: any): Promise<string | undefined> {
    // Generate SQL query from natural language analysis
    // This would be implemented based on your database schema
    return undefined
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      averageResponseTime: this.averageResponseTime,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0
    }
  }
}

// Export singleton instance
export const enhancedAIService = EnhancedAIService.getInstance()
