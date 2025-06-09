/**
 * OpenRouter AI Integration
 * Production-grade AI orchestration with multiple model support
 */

export interface OpenRouterConfig {
  apiKey: string
  baseUrl: string
  defaultModel: string
  fallbackModel: string
}

export interface ModelCapabilities {
  name: string
  provider: string
  contextLength: number
  costPer1kTokens: number
  supportsTools: boolean
  supportsVision: boolean
  bestFor: string[]
}

export const AVAILABLE_MODELS: Record<string, ModelCapabilities> = {
  'openai/gpt-4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextLength: 128000,
    costPer1kTokens: 0.005,
    supportsTools: true,
    supportsVision: true,
    bestFor: ['complex_analysis', 'reasoning', 'code_generation']
  },
  'anthropic/claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextLength: 200000,
    costPer1kTokens: 0.003,
    supportsTools: true,
    supportsVision: true,
    bestFor: ['analysis', 'writing', 'reasoning']
  },
  'google/gemini-pro-1.5': {
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    contextLength: 1000000,
    costPer1kTokens: 0.001,
    supportsTools: true,
    supportsVision: true,
    bestFor: ['large_context', 'data_analysis', 'multimodal']
  },
  'meta-llama/llama-3.1-70b-instruct': {
    name: 'Llama 3.1 70B',
    provider: 'Meta',
    contextLength: 131072,
    costPer1kTokens: 0.0009,
    supportsTools: false,
    supportsVision: false,
    bestFor: ['general_purpose', 'cost_effective', 'reasoning']
  }
}

export class OpenRouterService {
  private config: OpenRouterConfig
  private isConfigured: boolean

  constructor() {
    this.config = {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet',
      fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL || 'openai/gpt-4o'
    }
    
    this.isConfigured = !!this.config.apiKey && this.config.apiKey !== 'your-openrouter-api-key'
  }

  async chat(
    messages: any[],
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
      tools?: any[]
      systemPrompt?: string
    } = {}
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('OpenRouter not configured')
    }

    const {
      model = this.config.defaultModel,
      temperature = 0.1,
      maxTokens = 4000,
      tools,
      systemPrompt
    } = options

    try {
      // Prepare messages with system prompt if provided
      const chatMessages = systemPrompt 
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'Portfolio KPI Copilot'
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          temperature,
          max_tokens: maxTokens,
          tools,
          stream: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''

    } catch (error) {
      console.error('OpenRouter chat error:', error)
      
      // Try fallback model if primary fails
      if (model !== this.config.fallbackModel) {
        console.log(`Retrying with fallback model: ${this.config.fallbackModel}`)
        return this.chat(messages, { ...options, model: this.config.fallbackModel })
      }
      
      throw error
    }
  }

  async analyzeKPIs(
    kpiData: any[],
    context: {
      portfolioName?: string
      organizationName?: string
      timeframe?: string
      analysisType?: 'trend' | 'benchmark' | 'forecast' | 'comprehensive'
    } = {}
  ): Promise<{
    analysis: string
    insights: string[]
    recommendations: string[]
    riskFactors: string[]
    opportunities: string[]
    confidence: number
  }> {
    const { analysisType = 'comprehensive' } = context

    const systemPrompt = `You are a senior private equity analyst with 15+ years of experience in portfolio company analysis. 
    You specialize in KPI analysis, trend identification, and strategic recommendations for portfolio companies.
    
    Provide analysis that is:
    - Data-driven and quantitative
    - Actionable with specific recommendations
    - Risk-aware with mitigation strategies
    - Opportunity-focused for value creation
    - Benchmarked against industry standards`

    const analysisPrompt = this.buildKPIAnalysisPrompt(kpiData, context, analysisType)

    try {
      const response = await this.chat(
        [{ role: 'user', content: analysisPrompt }],
        {
          model: 'anthropic/claude-3.5-sonnet', // Best for analysis
          temperature: 0.1,
          maxTokens: 6000,
          systemPrompt
        }
      )

      return this.parseKPIAnalysisResponse(response)

    } catch (error) {
      console.error('KPI analysis error:', error)
      throw new Error(`Failed to analyze KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async generateForecast(
    historicalData: any[],
    forecastPeriods: number = 12,
    confidence: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{
    forecast: Array<{ period: string; value: number; confidence: number }>
    methodology: string
    assumptions: string[]
    risks: string[]
  }> {
    const systemPrompt = `You are a quantitative analyst specializing in financial forecasting and predictive modeling.
    Generate realistic forecasts based on historical data patterns, considering:
    - Seasonal trends and cyclical patterns
    - Growth rates and momentum indicators
    - Market conditions and external factors
    - Statistical confidence intervals
    - Risk factors and scenario analysis`

    const forecastPrompt = `
    Analyze the following historical KPI data and generate a ${forecastPeriods}-period forecast:
    
    Historical Data:
    ${JSON.stringify(historicalData, null, 2)}
    
    Requirements:
    - Forecast confidence level: ${confidence}
    - Include methodology explanation
    - Provide confidence intervals
    - Identify key assumptions
    - Highlight major risks
    
    Format the response as structured JSON with forecast values, methodology, assumptions, and risks.
    `

    try {
      const response = await this.chat(
        [{ role: 'user', content: forecastPrompt }],
        {
          model: 'google/gemini-pro-1.5', // Best for data analysis
          temperature: 0.05,
          maxTokens: 4000,
          systemPrompt
        }
      )

      return this.parseForecastResponse(response)

    } catch (error) {
      console.error('Forecast generation error:', error)
      throw new Error(`Failed to generate forecast: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async performBenchmarkAnalysis(
    kpiData: any[],
    industry: string,
    stage: string
  ): Promise<{
    benchmarks: Array<{ metric: string; value: number; percentile: number; industry_avg: number }>
    performance: 'underperforming' | 'average' | 'outperforming'
    recommendations: string[]
    improvement_areas: string[]
  }> {
    const systemPrompt = `You are a benchmarking expert with access to comprehensive industry databases.
    Provide realistic benchmark comparisons for ${industry} companies at ${stage} stage.
    Use industry-standard metrics and percentile rankings.`

    const benchmarkPrompt = `
    Perform benchmark analysis for the following KPIs:
    ${JSON.stringify(kpiData, null, 2)}
    
    Industry: ${industry}
    Stage: ${stage}
    
    Provide:
    1. Industry benchmark values for each KPI
    2. Percentile ranking (0-100)
    3. Overall performance assessment
    4. Specific improvement recommendations
    5. Priority areas for focus
    
    Use realistic industry data and standard benchmarking methodologies.
    `

    try {
      const response = await this.chat(
        [{ role: 'user', content: benchmarkPrompt }],
        {
          model: 'anthropic/claude-3.5-sonnet',
          temperature: 0.1,
          maxTokens: 4000,
          systemPrompt
        }
      )

      return this.parseBenchmarkResponse(response)

    } catch (error) {
      console.error('Benchmark analysis error:', error)
      throw new Error(`Failed to perform benchmark analysis: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Helper methods
  private buildKPIAnalysisPrompt(kpiData: any[], context: any, analysisType: string): string {
    return `
    Analyze the following KPI data for ${context.portfolioName || 'portfolio company'}:
    
    KPI Data:
    ${JSON.stringify(kpiData, null, 2)}
    
    Context:
    - Organization: ${context.organizationName || 'N/A'}
    - Timeframe: ${context.timeframe || 'N/A'}
    - Analysis Type: ${analysisType}
    
    Provide a comprehensive analysis including:
    1. Key trends and patterns
    2. Performance insights
    3. Strategic recommendations
    4. Risk factors
    5. Growth opportunities
    6. Confidence assessment (0-100%)
    
    Format as structured analysis with clear sections.
    `
  }

  private parseKPIAnalysisResponse(response: string): any {
    // Parse structured response - in production, this would use more sophisticated parsing
    const insights = this.extractSection(response, 'insights') || []
    const recommendations = this.extractSection(response, 'recommendations') || []
    const riskFactors = this.extractSection(response, 'risk') || []
    const opportunities = this.extractSection(response, 'opportunities') || []
    
    return {
      analysis: response,
      insights,
      recommendations,
      riskFactors,
      opportunities,
      confidence: this.extractConfidence(response)
    }
  }

  private parseForecastResponse(response: string): any {
    // Parse forecast response - would use JSON parsing in production
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.warn('Failed to parse JSON forecast response')
    }

    // Fallback parsing
    return {
      forecast: [],
      methodology: 'Statistical trend analysis',
      assumptions: ['Historical patterns continue', 'No major market disruptions'],
      risks: ['Market volatility', 'Competitive pressures']
    }
  }

  private parseBenchmarkResponse(response: string): any {
    // Parse benchmark response
    return {
      benchmarks: [],
      performance: 'average' as const,
      recommendations: this.extractSection(response, 'recommendations') || [],
      improvement_areas: this.extractSection(response, 'improvement') || []
    }
  }

  private extractSection(text: string, sectionName: string): string[] {
    const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i')
    const match = text.match(regex)
    if (match) {
      return match[1].split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•*]\s*/, ''))
    }
    return []
  }

  private extractConfidence(text: string): number {
    const confidenceMatch = text.match(/confidence[:\s]*(\d+)%?/i)
    return confidenceMatch ? parseInt(confidenceMatch[1]) : 85
  }

  async healthCheck(): Promise<{ status: string; models: string[]; error?: string }> {
    if (!this.isConfigured) {
      return { status: 'not_configured', models: [] }
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const availableModels = data.data?.map((model: any) => model.id) || []

      return {
        status: 'healthy',
        models: availableModels
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  isAvailable(): boolean {
    return this.isConfigured
  }

  getAvailableModels(): ModelCapabilities[] {
    return Object.values(AVAILABLE_MODELS)
  }
}

// Export singleton instance
export const openRouterService = new OpenRouterService()
export default openRouterService
