/**
 * Ollama Local AI Client
 * For local AI inference using Llama models
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

export class OllamaService {
  private baseUrl: string
  private model: string

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.model = process.env.LLAMA_MODEL || 'llama3.2:latest'
  }

  async chat(messages: OllamaMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data: OllamaResponse = await response.json()
      return data.message.content

    } catch (error) {
      console.error('Ollama chat error:', error)
      throw new Error('Failed to get response from Ollama')
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      return data.response

    } catch (error) {
      console.error('Ollama generate error:', error)
      throw new Error('Failed to generate response from Ollama')
    }
  }

  async analyzeKPI(kpiData: any): Promise<string> {
    const prompt = `You are a KPI analysis expert. Analyze the following KPI data and provide insights:

KPI Data: ${JSON.stringify(kpiData, null, 2)}

Please provide:
1. Key insights about the performance
2. Trends and patterns
3. Recommendations for improvement
4. Potential risks or opportunities

Keep your analysis concise and actionable.`

    return this.generate(prompt)
  }

  async generateKPIRecommendations(portfolioData: any): Promise<string> {
    const prompt = `You are a portfolio management expert. Based on the following portfolio data, recommend relevant KPIs to track:

Portfolio Data: ${JSON.stringify(portfolioData, null, 2)}

Please recommend:
1. 5-7 most important KPIs for this portfolio
2. Why each KPI is relevant
3. Target ranges or benchmarks
4. How to measure each KPI

Focus on actionable metrics that drive business value.`

    return this.generate(prompt)
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
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

  getStatus() {
    return {
      baseUrl: this.baseUrl,
      model: this.model,
      configured: !!(this.baseUrl && this.model)
    }
  }
}

// Export singleton instance
export const ollamaService = new OllamaService()

// System prompts for different contexts
export const OLLAMA_SYSTEM_PROMPTS = {
  portfolio_analysis: `You are a senior financial advisor specializing in private equity and portfolio management.
  Provide clear, actionable insights about portfolio performance, KPIs, and investment strategies.
  Focus on practical recommendations that can drive business value.`,

  kpi_explanation: `You are a financial expert. Explain KPIs in clear, practical terms with industry context and benchmarks.
  Help users understand what each metric means and how to improve it.`,

  general: `You are a helpful AI assistant specializing in portfolio management and financial analysis.
  Provide accurate, helpful information about business metrics, KPIs, and investment strategies.`
}

// Utility function to create chat completion with fallback
export async function createChatCompletionWithFallback(
  messages: OllamaMessage[],
  context: string = 'general'
): Promise<string> {
  try {
    // Try Ollama first
    if (await ollamaService.isHealthy()) {
      return await ollamaService.chat(messages)
    }
    
    // Fallback to OpenAI if available
    const { createChatCompletion } = await import('./openai')
    return await createChatCompletion(messages)
    
  } catch (error) {
    console.error('All AI services failed:', error)
    throw new Error('AI services are currently unavailable')
  }
}

export default ollamaService
