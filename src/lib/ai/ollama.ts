/**
 * Ollama Service
 * Local AI processing with Llama models
 */

export interface OllamaConfig {
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  timeout: number
}

export interface OllamaResponse {
  model: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export class OllamaService {
  private config: OllamaConfig
  private isConfigured: boolean

  constructor() {
    this.config = {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.1:latest',
      temperature: parseFloat(process.env.LLAMA_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.LLAMA_MAX_TOKENS || '2000'),
      timeout: parseInt(process.env.LLAMA_TIMEOUT || '30000')
    }
    
    this.isConfigured = !!this.config.baseUrl
  }

  async chat(messages: any[], options?: any): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Ollama not configured')
    }

    // Convert messages to a single prompt
    const prompt = this.formatMessagesAsPrompt(messages)
    
    const response = await this.generate(prompt, {
      temperature: options?.temperature || this.config.temperature,
      max_tokens: options?.maxTokens || this.config.maxTokens,
      ...options
    })

    return response.response
  }

  async generate(prompt: string, options?: any): Promise<OllamaResponse> {
    if (!this.isConfigured) {
      throw new Error('Ollama not configured')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.config.model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature || this.config.temperature,
            num_predict: options?.max_tokens || this.config.maxTokens,
            top_p: options?.top_p || 0.9,
            top_k: options?.top_k || 40,
          }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result as OllamaResponse
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Ollama request timeout')
      }
      throw error
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.isConfigured) {
      return []
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`)
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch (error) {
      console.warn('Failed to list Ollama models:', error)
      return []
    }
  }

  async healthCheck(): Promise<{ status: string; models: string[]; responseTime: number }> {
    const startTime = Date.now()
    
    try {
      if (!this.isConfigured) {
        return {
          status: 'not_configured',
          models: [],
          responseTime: 0
        }
      }

      // Test basic connectivity
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`)
      }

      const data = await response.json()
      const models = data.models?.map((model: any) => model.name) || []
      
      // Test model availability
      const hasRequiredModel = models.includes(this.config.model)
      
      return {
        status: hasRequiredModel ? 'healthy' : 'degraded',
        models,
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        models: [],
        responseTime: Date.now() - startTime
      }
    }
  }

  isAvailable(): boolean {
    return this.isConfigured && process.env.USE_OLLAMA_PRIMARY === 'true'
  }

  private formatMessagesAsPrompt(messages: any[]): string {
    // Convert OpenAI-style messages to a single prompt
    return messages.map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`
      } else if (msg.role === 'user') {
        return `Human: ${msg.content}`
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`
      }
      return msg.content
    }).join('\n\n') + '\n\nAssistant:'
  }

  getConfig(): OllamaConfig {
    return { ...this.config }
  }

  async analyzeKPI(kpiData: any, query?: string): Promise<any> {
    const prompt = `You are a financial analyst. Analyze the following KPI data and provide insights:

KPI Data:
${JSON.stringify(kpiData, null, 2)}

${query ? `Specific Question: ${query}` : ''}

Please provide:
1. Key insights from the data
2. Trends and patterns
3. Potential concerns or opportunities
4. Actionable recommendations

Format your response as a structured analysis.`

    const response = await this.generate(prompt, {
      temperature: 0.1,
      max_tokens: 1500
    })

    return {
      analysis: response.response,
      processingTime: response.total_duration || 0,
      model: response.model
    }
  }

  async explainConcept(concept: string, context?: string): Promise<string> {
    const prompt = `Explain the following financial/business concept in clear, practical terms:

Concept: ${concept}
${context ? `Context: ${context}` : ''}

Provide:
1. Clear definition
2. Why it matters in portfolio management
3. How to interpret it
4. Industry benchmarks (if applicable)
5. Actionable insights

Keep the explanation professional but accessible.`

    const response = await this.generate(prompt, {
      temperature: 0.2,
      max_tokens: 1000
    })

    return response.response
  }
}

// Export singleton instance
export const ollamaService = new OllamaService()
export default ollamaService
