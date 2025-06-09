/**
 * AI Orchestration Service
 * Intelligent routing and coordination of AI services
 */

import { openRouterService } from './openrouter'
import { openaiService } from './openai'
import { ollamaService } from './ollama'
import { analyticsEngine } from './analytics-engine'

export interface AIRequest {
  type: 'chat' | 'analysis' | 'prediction' | 'explanation' | 'summary'
  input: any
  context?: {
    userId?: string
    organizationId?: string
    portfolioId?: string
    userRole?: string
  }
  preferences?: {
    aiProvider?: 'openrouter' | 'ollama' | 'openai' | 'auto'
    model?: string
    temperature?: number
    maxTokens?: number
    priority?: 'speed' | 'quality' | 'cost'
  }
}

export interface AIResponse {
  success: boolean
  data?: any
  error?: string
  metadata: {
    provider: string
    model: string
    processingTime: number
    confidence: number
    cost?: number
    timestamp: string
  }
}

export interface ProviderCapabilities {
  name: string
  available: boolean
  models: string[]
  strengths: string[]
  limitations: string[]
  costPerToken: number
  avgResponseTime: number
  reliability: number
}

export class AIOrchestrator {
  private providers: Map<string, any> = new Map()
  private capabilities: Map<string, ProviderCapabilities> = new Map()
  private requestHistory: Array<{ request: AIRequest; response: AIResponse; timestamp: number }> = []

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Register available providers
    this.providers.set('openrouter', openRouterService)
    this.providers.set('openai', openaiService)
    this.providers.set('ollama', ollamaService)

    // Initialize capabilities
    this.updateCapabilities()
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      // Select optimal provider
      const provider = await this.selectProvider(request)
      
      if (!provider) {
        throw new Error('No suitable AI provider available')
      }

      // Route request to appropriate handler
      let result: any
      
      switch (request.type) {
        case 'chat':
          result = await this.handleChatRequest(request, provider)
          break
        case 'analysis':
          result = await this.handleAnalysisRequest(request, provider)
          break
        case 'prediction':
          result = await this.handlePredictionRequest(request, provider)
          break
        case 'explanation':
          result = await this.handleExplanationRequest(request, provider)
          break
        case 'summary':
          result = await this.handleSummaryRequest(request, provider)
          break
        default:
          throw new Error(`Unsupported request type: ${request.type}`)
      }

      const response: AIResponse = {
        success: true,
        data: result,
        metadata: {
          provider: provider.name,
          model: provider.model || 'default',
          processingTime: Date.now() - startTime,
          confidence: result.confidence || 85,
          cost: this.calculateCost(provider, result),
          timestamp: new Date().toISOString()
        }
      }

      // Store request history for optimization
      this.requestHistory.push({
        request,
        response,
        timestamp: Date.now()
      })

      // Limit history size
      if (this.requestHistory.length > 1000) {
        this.requestHistory = this.requestHistory.slice(-500)
      }

      return response

    } catch (error) {
      console.error('AI orchestration error:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          provider: 'none',
          model: 'none',
          processingTime: Date.now() - startTime,
          confidence: 0,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  private async selectProvider(request: AIRequest): Promise<any> {
    const { preferences = {} } = request
    
    // If specific provider requested, try it first
    if (preferences.aiProvider && preferences.aiProvider !== 'auto') {
      const provider = this.providers.get(preferences.aiProvider)
      if (provider && await this.isProviderAvailable(preferences.aiProvider)) {
        return {
          name: preferences.aiProvider,
          instance: provider,
          model: preferences.model
        }
      }
    }

    // Auto-select based on request type and preferences
    return await this.autoSelectProvider(request)
  }

  private async autoSelectProvider(request: AIRequest): Promise<any> {
    const { type, preferences = {} } = request
    const priority = preferences.priority || 'quality'

    // Provider selection logic based on request type and priority
    const providerRanking = this.rankProviders(type, priority)

    for (const providerName of providerRanking) {
      if (await this.isProviderAvailable(providerName)) {
        const provider = this.providers.get(providerName)
        return {
          name: providerName,
          instance: provider,
          model: this.selectOptimalModel(providerName, type)
        }
      }
    }

    return null
  }

  private rankProviders(requestType: string, priority: string): string[] {
    // Provider ranking based on capabilities and priorities
    const rankings = {
      analysis: {
        quality: ['openrouter', 'openai', 'ollama'],
        speed: ['ollama', 'openrouter', 'openai'],
        cost: ['ollama', 'openrouter', 'openai']
      },
      prediction: {
        quality: ['openrouter', 'openai', 'ollama'],
        speed: ['openrouter', 'ollama', 'openai'],
        cost: ['ollama', 'openrouter', 'openai']
      },
      chat: {
        quality: ['openrouter', 'openai', 'ollama'],
        speed: ['ollama', 'openrouter', 'openai'],
        cost: ['ollama', 'openrouter', 'openai']
      },
      explanation: {
        quality: ['openrouter', 'openai', 'ollama'],
        speed: ['ollama', 'openrouter', 'openai'],
        cost: ['ollama', 'openrouter', 'openai']
      },
      summary: {
        quality: ['openrouter', 'openai', 'ollama'],
        speed: ['ollama', 'openrouter', 'openai'],
        cost: ['ollama', 'openrouter', 'openai']
      }
    }

    return rankings[requestType as keyof typeof rankings]?.[priority as keyof typeof rankings.analysis] || 
           rankings.chat[priority as keyof typeof rankings.chat]
  }

  private selectOptimalModel(providerName: string, requestType: string): string {
    const modelMappings = {
      openrouter: {
        analysis: 'anthropic/claude-3.5-sonnet',
        prediction: 'google/gemini-pro-1.5',
        chat: 'openai/gpt-4o',
        explanation: 'anthropic/claude-3.5-sonnet',
        summary: 'openai/gpt-4o'
      },
      ollama: {
        analysis: 'llama3.2:latest',
        prediction: 'llama3.2:latest',
        chat: 'llama3.2:latest',
        explanation: 'llama3.2:latest',
        summary: 'llama3.2:latest'
      },
      openai: {
        analysis: 'gpt-4o',
        prediction: 'gpt-4o',
        chat: 'gpt-4o-mini',
        explanation: 'gpt-4o',
        summary: 'gpt-4o-mini'
      }
    }

    return modelMappings[providerName as keyof typeof modelMappings]?.[requestType as keyof typeof modelMappings.openrouter] || 'default'
  }

  private async isProviderAvailable(providerName: string): Promise<boolean> {
    try {
      switch (providerName) {
        case 'openrouter':
          return openRouterService.isAvailable()
        case 'ollama':
          return ollamaService.isAvailable()
        case 'openai':
          return !!process.env.OPENAI_API_KEY && process.env.DISABLE_OPENAI !== 'true'
        default:
          return false
      }
    } catch (error) {
      console.warn(`Provider ${providerName} availability check failed:`, error)
      return false
    }
  }

  // Request handlers
  private async handleChatRequest(request: AIRequest, provider: any): Promise<any> {
    const { input, preferences = {} } = request
    const { instance, model } = provider

    if (provider.name === 'openrouter') {
      return await instance.chat(input.messages, {
        model,
        temperature: preferences.temperature || 0.7,
        maxTokens: preferences.maxTokens || 1000
      })
    }

    if (provider.name === 'ollama') {
      return await instance.chat(input.messages, {
        temperature: preferences.temperature || 0.7,
        maxTokens: preferences.maxTokens || 1000
      })
    }

    if (provider.name === 'openai') {
      return await instance.chat(input.messages, {
        model,
        temperature: preferences.temperature || 0.7,
        maxTokens: preferences.maxTokens || 1000
      })
    }

    throw new Error(`Chat not supported for provider: ${provider.name}`)
  }

  private async handleAnalysisRequest(request: AIRequest, provider: any): Promise<any> {
    const { input } = request

    // Use analytics engine for comprehensive analysis
    return await analyticsEngine.performAnalysis({
      userId: request.context?.userId || 'system',
      organizationId: request.context?.organizationId,
      portfolioId: request.context?.portfolioId,
      analysisType: input.analysisType || 'comprehensive',
      timeframe: input.timeframe,
      kpiCategories: input.kpiCategories,
      customQuery: input.customQuery
    })
  }

  private async handlePredictionRequest(request: AIRequest, provider: any): Promise<any> {
    const { input } = request
    const { instance } = provider

    if (provider.name === 'openrouter') {
      return await instance.generateForecast(
        input.historicalData,
        input.forecastPeriods || 12,
        input.confidence || 'medium'
      )
    }

    // Fallback to basic prediction
    return {
      forecast: [],
      methodology: 'Basic statistical analysis',
      confidence: 70
    }
  }

  private async handleExplanationRequest(request: AIRequest, provider: any): Promise<any> {
    const { input } = request
    const { instance, model } = provider

    const explanationPrompt = `Explain the following KPI or financial concept in clear, practical terms:

${input.query}

Context: ${input.context || 'Portfolio management and private equity'}

Provide:
1. Clear definition
2. Why it matters
3. How to interpret it
4. Industry benchmarks (if applicable)
5. Actionable insights`

    if (provider.name === 'openrouter') {
      return await instance.chat(
        [{ role: 'user', content: explanationPrompt }],
        {
          model,
          systemPrompt: 'You are a senior financial advisor explaining concepts to portfolio managers.',
          temperature: 0.1
        }
      )
    }

    if (provider.name === 'ollama') {
      return await instance.explainConcept(input.query, input.context)
    }

    return 'Explanation service temporarily unavailable'
  }

  private async handleSummaryRequest(request: AIRequest, provider: any): Promise<any> {
    const { input } = request
    const { instance, model } = provider

    const summaryPrompt = `Summarize the following data/information concisely:

${JSON.stringify(input.data, null, 2)}

Focus on:
- Key metrics and trends
- Important insights
- Critical issues or opportunities
- Actionable recommendations

Keep the summary clear and executive-friendly.`

    if (provider.name === 'openrouter') {
      return await instance.chat(
        [{ role: 'user', content: summaryPrompt }],
        {
          model,
          systemPrompt: 'You are an executive assistant creating concise summaries for senior management.',
          temperature: 0.1,
          maxTokens: 500
        }
      )
    }

    if (provider.name === 'ollama') {
      return await instance.chat(
        [{ role: 'user', content: summaryPrompt }],
        {
          temperature: 0.1,
          maxTokens: 500
        }
      )
    }

    return 'Summary service temporarily unavailable'
  }

  private calculateCost(provider: any, result: any): number {
    // Simplified cost calculation
    const costPerToken = {
      openrouter: 0.001,
      ollama: 0, // Local processing
      openai: 0.002
    }

    const estimatedTokens = JSON.stringify(result).length / 4 // Rough estimate
    return (costPerToken[provider.name as keyof typeof costPerToken] || 0) * estimatedTokens
  }

  // Public methods for capabilities and status
  async updateCapabilities(): Promise<void> {
    const providers = ['openrouter', 'ollama', 'openai']

    for (const providerName of providers) {
      try {
        const available = await this.isProviderAvailable(providerName)
        
        this.capabilities.set(providerName, {
          name: providerName,
          available,
          models: await this.getProviderModels(providerName),
          strengths: this.getProviderStrengths(providerName),
          limitations: this.getProviderLimitations(providerName),
          costPerToken: this.getProviderCost(providerName),
          avgResponseTime: this.getProviderResponseTime(providerName),
          reliability: this.getProviderReliability(providerName)
        })
      } catch (error) {
        console.warn(`Failed to update capabilities for ${providerName}:`, error)
      }
    }
  }

  getCapabilities(): ProviderCapabilities[] {
    return Array.from(this.capabilities.values())
  }

  async getStatus(): Promise<{
    available: boolean
    openrouter: { available: boolean; models: string[] }
    ollama: { available: boolean; models: string[] }
    openai: { available: boolean; models: string[] }
  }> {
    await this.updateCapabilities()
    const capabilities = this.getCapabilities()

    const openrouter = capabilities.find(c => c.name === 'openrouter')
    const ollama = capabilities.find(c => c.name === 'ollama')
    const openai = capabilities.find(c => c.name === 'openai')

    return {
      available: capabilities.some(c => c.available),
      openrouter: {
        available: openrouter?.available || false,
        models: openrouter?.models || []
      },
      ollama: {
        available: ollama?.available || false,
        models: ollama?.models || []
      },
      openai: {
        available: openai?.available || false,
        models: openai?.models || []
      }
    }
  }

  getRequestHistory(): Array<{ request: AIRequest; response: AIResponse; timestamp: number }> {
    return this.requestHistory.slice(-100) // Return last 100 requests
  }

  getPerformanceMetrics(): any {
    const recentRequests = this.requestHistory.slice(-50)
    
    return {
      totalRequests: this.requestHistory.length,
      avgResponseTime: recentRequests.reduce((sum, r) => sum + r.response.metadata.processingTime, 0) / recentRequests.length,
      successRate: recentRequests.filter(r => r.response.success).length / recentRequests.length,
      providerUsage: this.calculateProviderUsage(recentRequests),
      costAnalysis: this.calculateCostAnalysis(recentRequests)
    }
  }

  // Helper methods
  private async getProviderModels(providerName: string): Promise<string[]> {
    switch (providerName) {
      case 'openrouter':
        try {
          const health = await openRouterService.healthCheck()
          return health.models || []
        } catch {
          return []
        }
      case 'ollama':
        try {
          return await ollamaService.listModels()
        } catch {
          return ['llama3.2:latest']
        }
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini']
      default:
        return []
    }
  }

  private getProviderStrengths(providerName: string): string[] {
    const strengths = {
      openrouter: ['Multiple models', 'High quality', 'Advanced reasoning'],
      ollama: ['Local processing', 'Privacy', 'No API costs'],
      openai: ['Reliability', 'Speed', 'Tool support']
    }

    return strengths[providerName as keyof typeof strengths] || []
  }

  private getProviderLimitations(providerName: string): string[] {
    const limitations = {
      openrouter: ['API costs', 'Rate limits', 'Internet required'],
      ollama: ['Local resources', 'Model size limits', 'Setup complexity'],
      openai: ['API costs', 'Rate limits', 'Data privacy']
    }

    return limitations[providerName as keyof typeof limitations] || []
  }

  private getProviderCost(providerName: string): number {
    const costs = {
      openrouter: 0.001,
      ollama: 0,
      openai: 0.002
    }

    return costs[providerName as keyof typeof costs] || 0
  }

  private getProviderResponseTime(providerName: string): number {
    const times = {
      openrouter: 2000,
      ollama: 5000,
      openai: 1500
    }

    return times[providerName as keyof typeof times] || 3000
  }

  private getProviderReliability(providerName: string): number {
    const reliability = {
      openrouter: 0.95,
      ollama: 0.90,
      openai: 0.98
    }

    return reliability[providerName as keyof typeof reliability] || 0.85
  }

  private calculateProviderUsage(requests: any[]): any {
    const usage = requests.reduce((acc, req) => {
      const provider = req.response.metadata.provider
      acc[provider] = (acc[provider] || 0) + 1
      return acc
    }, {})

    return usage
  }

  private calculateCostAnalysis(requests: any[]): any {
    const totalCost = requests.reduce((sum, req) => sum + (req.response.metadata.cost || 0), 0)
    const avgCost = totalCost / requests.length

    return {
      totalCost: totalCost.toFixed(4),
      avgCost: avgCost.toFixed(4),
      currency: 'USD'
    }
  }
}

// Export singleton instance
export const aiOrchestrator = new AIOrchestrator()
export default aiOrchestrator
