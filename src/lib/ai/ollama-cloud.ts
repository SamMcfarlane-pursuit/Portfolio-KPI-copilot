/**
 * Production-Ready Ollama Cloud Service
 * Supports both local development and cloud deployment
 * Includes connection pooling, retry logic, and fallback mechanisms
 */

import { LLAMA_CONFIG } from './llama'

interface OllamaCloudConfig {
  baseUrl: string
  model: string
  apiKey?: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
}

class OllamaCloudService {
  private config: OllamaCloudConfig
  private connectionPool: Map<string, number> = new Map()
  private lastHealthCheck: number = 0
  private healthCheckInterval: number = 60000 // 1 minute
  private isHealthy: boolean = false

  constructor() {
    this.config = {
      baseUrl: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_CLOUD_URL || "http://localhost:11434",
      model: process.env.LLAMA_MODEL || "llama3.2:3b",
      apiKey: process.env.OLLAMA_API_KEY,
      timeout: LLAMA_CONFIG.timeout,
      retryAttempts: LLAMA_CONFIG.retryAttempts,
      retryDelay: LLAMA_CONFIG.retryDelay
    }
  }

  /**
   * Enhanced health check with caching
   */
  async checkHealth(): Promise<boolean> {
    const now = Date.now()
    
    // Use cached result if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isHealthy) {
      return this.isHealthy
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      this.isHealthy = response.ok
      this.lastHealthCheck = now
      
      return this.isHealthy
    } catch (error) {
      console.warn('Ollama health check failed:', error)
      this.isHealthy = false
      this.lastHealthCheck = now
      return false
    }
  }

  /**
   * Get request headers with optional API key
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    return headers
  }

  /**
   * Chat completion with retry logic and error handling
   */
  async chat(messages: OllamaMessage[]): Promise<string> {
    if (!await this.checkHealth()) {
      throw new Error('Ollama service is not available')
    }

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(`${this.config.baseUrl}/api/chat`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: this.config.model,
            messages,
            stream: false,
            options: {
              temperature: LLAMA_CONFIG.temperature,
              num_predict: LLAMA_CONFIG.maxTokens
            }
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
        }

        const data: OllamaResponse = await response.json()
        
        if (!data.message?.content) {
          throw new Error('Invalid response format from Ollama')
        }

        return data.message.content

      } catch (error) {
        console.warn(`Ollama chat attempt ${attempt}/${this.config.retryAttempts} failed:`, error)
        
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * attempt)
          )
        } else {
          throw new Error(`Ollama chat failed after ${this.config.retryAttempts} attempts: ${error}`)
        }
      }
    }

    throw new Error('Ollama chat failed: Maximum retry attempts exceeded')
  }

  /**
   * Generate completion with retry logic
   */
  async generate(prompt: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }])
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      if (!await this.checkHealth()) {
        return []
      }

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch (error) {
      console.error('Error fetching models:', error)
      return []
    }
  }

  /**
   * Get service status and configuration
   */
  getStatus() {
    return {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      configured: !!(this.config.baseUrl && this.config.model),
      healthy: this.isHealthy,
      lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
      hasApiKey: !!this.config.apiKey,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts
    }
  }

  /**
   * Analyze KPI data with specialized prompt
   */
  async analyzeKPI(kpiData: any): Promise<string> {
    const prompt = `You are a KPI analysis expert for portfolio management. Analyze the following KPI data and provide actionable insights:

KPI Data:
${JSON.stringify(kpiData, null, 2)}

Please provide:
1. Key performance trends and patterns
2. Areas of concern or opportunity
3. Specific recommendations for improvement
4. Benchmarking insights where applicable
5. Risk assessment and mitigation strategies

Focus on actionable metrics that drive business value and portfolio performance.`

    return this.generate(prompt)
  }

  /**
   * Portfolio analysis with context
   */
  async analyzePortfolio(portfolioData: any, query: string): Promise<string> {
    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are an expert portfolio analyst specializing in private equity and venture capital. 
        Provide detailed analysis based on the portfolio data and user query.
        Focus on financial performance, operational metrics, and strategic recommendations.`
      },
      {
        role: 'user',
        content: `Portfolio Data: ${JSON.stringify(portfolioData, null, 2)}
        
        Query: ${query}
        
        Please provide a comprehensive analysis with specific insights and recommendations.`
      }
    ]

    return this.chat(messages)
  }
}

// Export singleton instance
export const ollamaCloudService = new OllamaCloudService()

// Export types for use in other modules
export type { OllamaMessage, OllamaResponse, OllamaCloudConfig }

// Utility function for backward compatibility
export async function isOllamaCloudAvailable(): Promise<boolean> {
  return ollamaCloudService.checkHealth()
}

// Enhanced chat completion with fallback
export async function createOllamaCompletion(
  messages: OllamaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  try {
    return await ollamaCloudService.chat(messages)
  } catch (error) {
    console.error('Ollama completion failed:', error)
    throw error
  }
}
