import { Ollama } from "@langchain/community/llms/ollama"
import { ChatOllama } from "@langchain/community/chat_models/ollama"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

// Llama Configuration
export const LLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: process.env.LLAMA_MODEL || "llama3.2:3b", // Lightweight model for development
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000, // 30 seconds
}

// Portfolio Operations System Prompts
export const PORTFOLIO_SYSTEM_PROMPTS = {
  GENERAL_ASSISTANT: `You are an expert Portfolio Operations AI Assistant specializing in KPI analysis and portfolio management.

Your expertise includes:
- Portfolio company analysis and performance evaluation
- Investment risk assessment and mitigation strategies  
- Financial metrics interpretation (revenue, EBITDA, growth rates)
- Market trend analysis and sector insights
- Investment recommendations and portfolio optimization
- Due diligence support and deal evaluation

Guidelines:
- Provide concise, actionable insights
- Use financial terminology appropriately
- Focus on data-driven recommendations
- Highlight both opportunities and risks
- Be professional and confident in your analysis
- When uncertain, clearly state limitations

Always structure responses with clear sections and bullet points for readability.`,

  KPI_ANALYSIS: `You are a specialized KPI Analysis AI for portfolio operations. 

Focus on:
- Revenue trends and growth patterns
- Profitability metrics (EBITDA, margins)
- Operational efficiency indicators
- Customer acquisition and retention metrics
- Market share and competitive positioning
- Risk indicators and red flags

Provide specific, quantitative insights with clear recommendations for portfolio management.`,

  RISK_ASSESSMENT: `You are a Risk Assessment AI specializing in portfolio company evaluation.

Analyze:
- Financial risks (cash flow, debt levels, liquidity)
- Operational risks (key person dependency, supply chain)
- Market risks (competition, regulatory changes)
- Strategic risks (technology disruption, market shifts)
- ESG risks (environmental, social, governance)

Provide risk ratings (Low/Medium/High) with specific mitigation strategies.`,

  INVESTMENT_ADVISOR: `You are an Investment Advisory AI for private equity portfolio management.

Provide guidance on:
- Additional investment opportunities in existing portfolio companies
- Exit strategy timing and valuation optimization
- Portfolio rebalancing recommendations
- Sector allocation and diversification strategies
- Market timing considerations
- Value creation initiatives

Focus on maximizing returns while managing downside risk.`
}

// Initialize Llama Chat Model
let llamaChat: ChatOllama | null = null

export function initializeLlama(): ChatOllama {
  if (!llamaChat) {
    llamaChat = new ChatOllama({
      baseUrl: LLAMA_CONFIG.baseUrl,
      model: LLAMA_CONFIG.model,
      temperature: LLAMA_CONFIG.temperature,
    })
  }
  return llamaChat
}

// Check if Llama/Ollama is available
export async function isLlamaAvailable(): Promise<boolean> {
  try {
    const llama = initializeLlama()
    await llama.invoke([new HumanMessage("test")])
    return true
  } catch (error) {
    console.warn('Llama/Ollama not available:', error)
    return false
  }
}

// Generate portfolio analysis response
export async function generatePortfolioResponse({
  query,
  context,
  systemPrompt = PORTFOLIO_SYSTEM_PROMPTS.GENERAL_ASSISTANT
}: {
  query: string
  context?: any
  systemPrompt?: string
}): Promise<{
  response: string
  model: string
  processingTime: number
  tokensUsed?: number
}> {
  const startTime = Date.now()
  
  try {
    const llama = initializeLlama()
    
    // Prepare context string
    const contextString = context ? `\n\nContext Data:\n${JSON.stringify(context, null, 2)}` : ''
    
    // Create messages
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`${query}${contextString}`)
    ]
    
    // Generate response
    const response = await llama.invoke(messages)
    
    const processingTime = Date.now() - startTime
    
    return {
      response: response.content as string,
      model: LLAMA_CONFIG.model,
      processingTime,
      tokensUsed: response.content.length // Approximate token count
    }
    
  } catch (error) {
    console.error('Llama generation error:', error)
    throw new Error(`Failed to generate Llama response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Specialized portfolio analysis functions
export async function analyzePortfolioPerformance(portfolioData: any): Promise<string> {
  const query = "Analyze the performance of this portfolio company and provide key insights and recommendations."
  
  const response = await generatePortfolioResponse({
    query,
    context: portfolioData,
    systemPrompt: PORTFOLIO_SYSTEM_PROMPTS.KPI_ANALYSIS
  })
  
  return response.response
}

export async function assessPortfolioRisks(portfolioData: any): Promise<string> {
  const query = "Assess the key risks for this portfolio company and provide mitigation strategies."
  
  const response = await generatePortfolioResponse({
    query,
    context: portfolioData,
    systemPrompt: PORTFOLIO_SYSTEM_PROMPTS.RISK_ASSESSMENT
  })
  
  return response.response
}

export async function generateInvestmentRecommendations(portfolioData: any): Promise<string> {
  const query = "Provide investment recommendations and strategic guidance for this portfolio company."
  
  const response = await generatePortfolioResponse({
    query,
    context: portfolioData,
    systemPrompt: PORTFOLIO_SYSTEM_PROMPTS.INVESTMENT_ADVISOR
  })
  
  return response.response
}

// Fallback responses when Llama is not available
export const FALLBACK_RESPONSES = {
  GENERAL: "I'm currently running in demo mode. Llama AI is not available, but I can still provide basic portfolio analysis based on the data patterns I observe.",
  
  PERFORMANCE: "📊 **Portfolio Performance Analysis (Demo Mode)**\n\nBased on the available data, I can see general trends in your portfolio metrics. For detailed AI-powered analysis, please ensure Llama/Ollama is properly configured.",
  
  RISK: "⚠️ **Risk Assessment (Demo Mode)**\n\nI've identified some general risk patterns in your portfolio data. For comprehensive risk analysis with specific mitigation strategies, please configure Llama AI.",
  
  INVESTMENT: "💡 **Investment Recommendations (Demo Mode)**\n\nBased on basic data analysis, I can provide general investment guidance. For sophisticated AI-powered recommendations, please set up Llama integration."
}

// Enhanced KPI Analysis with Hybrid Data Integration
export async function analyzeKPIsWithLlama(options: {
  portfolioId?: string
  organizationId?: string
  query: string
  timeframe?: number
}): Promise<{
  analysis: string
  insights: string[]
  recommendations: string[]
  dataSource: string
  processingTime: number
}> {
  const startTime = Date.now()

  try {
    // Import hybrid data layer
    const { hybridData } = await import('../data/hybrid-data-layer')

    // Get relevant KPI data
    const kpiData = await hybridData.getKPIs({
      portfolioId: options.portfolioId,
      organizationId: options.organizationId,
      timeframe: options.timeframe || 12,
      limit: 50
    })

    // Get portfolio context if specific portfolio
    let portfolioContext = null
    if (options.portfolioId) {
      const portfolioData = await hybridData.getPortfolios({
        limit: 1,
        includeKPIs: true
      })
      portfolioContext = portfolioData.data?.[0]
    }

    // Prepare context for Llama
    const contextData = {
      kpis: kpiData.data,
      portfolio: portfolioContext,
      dataSource: kpiData.source,
      query: options.query,
      timeframe: options.timeframe || 12
    }

    // Generate analysis using Llama
    const response = await generatePortfolioResponse({
      query: `Analyze the following KPI data and provide insights: ${options.query}`,
      context: contextData,
      systemPrompt: PORTFOLIO_SYSTEM_PROMPTS.KPI_ANALYSIS
    })

    // Parse response for structured insights
    const analysis = response.response
    const insights = extractInsights(analysis)
    const recommendations = extractRecommendations(analysis)

    return {
      analysis,
      insights,
      recommendations,
      dataSource: kpiData.source,
      processingTime: Date.now() - startTime
    }

  } catch (error) {
    console.error('KPI analysis with Llama failed:', error)
    throw new Error(`Failed to analyze KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Extract insights from Llama response
function extractInsights(analysis: string): string[] {
  const insights: string[] = []

  // Look for bullet points or numbered lists
  const lines = analysis.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('•') || trimmed.startsWith('-') ||
        trimmed.match(/^\d+\./) || trimmed.toLowerCase().includes('insight')) {
      insights.push(trimmed.replace(/^[•\-\d\.]\s*/, ''))
    }
  }

  return insights.slice(0, 5) // Limit to top 5 insights
}

// Extract recommendations from Llama response
function extractRecommendations(analysis: string): string[] {
  const recommendations: string[] = []

  const lines = analysis.split('\n')
  let inRecommendationSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.toLowerCase().includes('recommend') ||
        trimmed.toLowerCase().includes('suggest') ||
        trimmed.toLowerCase().includes('action')) {
      inRecommendationSection = true
    }

    if (inRecommendationSection && (trimmed.startsWith('•') ||
        trimmed.startsWith('-') || trimmed.match(/^\d+\./))) {
      recommendations.push(trimmed.replace(/^[•\-\d\.]\s*/, ''))
    }
  }

  return recommendations.slice(0, 3) // Limit to top 3 recommendations
}

// Health check for Llama service
export async function llamaHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy' | 'not_configured'
  model?: string
  baseUrl?: string
  responseTime?: number
  error?: string
}> {
  try {
    const startTime = Date.now()
    const available = await isLlamaAvailable()
    const responseTime = Date.now() - startTime

    if (available) {
      return {
        status: 'healthy',
        model: LLAMA_CONFIG.model,
        baseUrl: LLAMA_CONFIG.baseUrl,
        responseTime
      }
    } else {
      return {
        status: 'not_configured',
        error: 'Ollama service not available'
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
