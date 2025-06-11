import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * AI Chat API
 * Handles natural language conversations about portfolio KPIs and analytics
 */

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

interface ChatRequest {
  messages: ChatMessage[]
  context?: 'portfolio' | 'kpi' | 'analytics' | 'general'
  portfolioId?: string
  temperature?: number
  maxTokens?: number
}

interface ChatResponse {
  success: boolean
  message?: ChatMessage
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  context?: any
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: ChatRequest = await request.json()
    const { messages, context = 'general', portfolioId, temperature = 0.7, maxTokens = 1000 } = body

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Check if AI services are available
    const aiAvailable = await checkAIAvailability()
    if (!aiAvailable.available) {
      return NextResponse.json({
        success: false,
        error: 'AI services are currently unavailable',
        details: aiAvailable.reason,
        fallback: {
          message: {
            role: 'assistant',
            content: 'I apologize, but AI services are currently unavailable. Please try again later or contact support if the issue persists.',
            timestamp: new Date().toISOString()
          }
        }
      }, { status: 503 })
    }

    // Get context data if needed
    const contextData = await getContextData(context, portfolioId, session.user)

    // Prepare system prompt based on context
    const systemPrompt = generateSystemPrompt(context, contextData)

    // Prepare messages for AI
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    // Call AI service
    const aiResponse = await callAIService(aiMessages, {
      temperature,
      maxTokens,
      context: contextData
    })

    if (!aiResponse.success) {
      return NextResponse.json({
        success: false,
        error: 'AI service error',
        details: aiResponse.error
      }, { status: 500 })
    }

    // Log the conversation for analytics
    await logConversation(session.user.id, messages, aiResponse.message, context)

    return NextResponse.json({
      success: true,
      message: {
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date().toISOString()
      },
      usage: aiResponse.usage,
      context: contextData ? {
        type: context,
        portfolioId,
        dataPoints: contextData.summary
      } : undefined
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function checkAIAvailability() {
  // Check OpenAI
  if (process.env.OPENAI_API_KEY && process.env.DISABLE_OPENAI !== 'true') {
    return { available: true, service: 'openai' }
  }

  // Check OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    return { available: true, service: 'openrouter' }
  }

  // Check Ollama
  if (process.env.OLLAMA_BASE_URL) {
    try {
      const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      if (response.ok) {
        return { available: true, service: 'ollama' }
      }
    } catch (error) {
      // Ollama not available
    }
  }

  return { 
    available: false, 
    reason: 'No AI services configured. Please set OPENAI_API_KEY, OPENROUTER_API_KEY, or OLLAMA_BASE_URL' 
  }
}

async function getContextData(context: string, portfolioId?: string, user?: any) {
  if (!portfolioId || context === 'general') {
    return null
  }

  try {
    const { prisma } = await import('@/lib/prisma')

    switch (context) {
      case 'portfolio':
        const portfolio = await prisma.portfolio.findFirst({
          where: { id: portfolioId },
          include: {
            kpis: {
              orderBy: { period: 'desc' },
              take: 10
            },
            fund: {
              include: {
                organization: true
              }
            }
          }
        })

        if (!portfolio) return null

        return {
          portfolio: {
            name: portfolio.name,
            sector: portfolio.sector,
            geography: portfolio.geography,
            investment: portfolio.investment,
            ownership: portfolio.ownership
          },
          recentKPIs: portfolio.kpis.map(kpi => ({
            name: kpi.name,
            category: kpi.category,
            value: kpi.value,
            unit: kpi.unit,
            period: kpi.period
          })),
          summary: {
            totalKPIs: portfolio.kpis.length,
            sectors: [portfolio.sector],
            lastUpdated: portfolio.kpis[0]?.period || portfolio.updatedAt
          }
        }

      case 'kpi':
        const kpis = await prisma.kPI.findMany({
          where: { portfolioId },
          orderBy: { period: 'desc' },
          take: 20,
          include: {
            portfolio: {
              select: { name: true, sector: true }
            }
          }
        })

        return {
          kpis: kpis.map(kpi => ({
            name: kpi.name,
            category: kpi.category,
            value: kpi.value,
            unit: kpi.unit,
            period: kpi.period,
            targetValue: kpi.targetValue
          })),
          summary: {
            totalKPIs: kpis.length,
            categories: [...new Set(kpis.map(k => k.category))],
            dateRange: {
              from: kpis[kpis.length - 1]?.period,
              to: kpis[0]?.period
            }
          }
        }

      default:
        return null
    }
  } catch (error) {
    console.error('Error getting context data:', error)
    return null
  }
}

function generateSystemPrompt(context: string, contextData?: any) {
  const basePrompt = `You are an AI assistant specialized in portfolio KPI analysis and private equity/venture capital insights. You help users understand their portfolio performance, analyze KPIs, and make data-driven decisions.

Key capabilities:
- Analyze portfolio performance metrics
- Explain KPI trends and patterns
- Provide investment insights and recommendations
- Answer questions about financial metrics and benchmarks
- Help with strategic decision-making

Guidelines:
- Be concise but thorough in your responses
- Use specific data when available
- Provide actionable insights
- Ask clarifying questions when needed
- Focus on practical business implications`

  switch (context) {
    case 'portfolio':
      if (contextData?.portfolio) {
        return `${basePrompt}

Current portfolio context:
- Portfolio: ${contextData.portfolio.name}
- Sector: ${contextData.portfolio.sector}
- Geography: ${contextData.portfolio.geography}
- Investment: $${contextData.portfolio.investment?.toLocaleString() || 'N/A'}
- Ownership: ${contextData.portfolio.ownership || 'N/A'}%
- Recent KPIs: ${contextData.recentKPIs?.length || 0} data points available

Focus on this specific portfolio when providing insights and recommendations.`
      }
      break

    case 'kpi':
      if (contextData?.kpis) {
        return `${basePrompt}

Current KPI context:
- Total KPIs: ${contextData.summary.totalKPIs}
- Categories: ${contextData.summary.categories?.join(', ') || 'Various'}
- Date range: ${contextData.summary.dateRange?.from} to ${contextData.summary.dateRange?.to}

Focus on KPI analysis, trends, and performance insights based on the available data.`
      }
      break

    case 'analytics':
      return `${basePrompt}

Focus on analytical insights, data interpretation, and strategic recommendations based on portfolio analytics and performance metrics.`
  }

  return basePrompt
}

async function callAIService(messages: any[], options: any) {
  try {
    // Try OpenAI first
    if (process.env.OPENAI_API_KEY && process.env.DISABLE_OPENAI !== 'true') {
      return await callOpenAI(messages, options)
    }

    // Try OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      return await callOpenRouter(messages, options)
    }

    // Try Ollama
    if (process.env.OLLAMA_BASE_URL) {
      return await callOllama(messages, options)
    }

    return {
      success: false,
      error: 'No AI service available'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI service error'
    }
  }
}

async function callOpenAI(messages: any[], options: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    message: data.choices[0].message.content,
    usage: data.usage
  }
}

async function callOpenRouter(messages: any[], options: any) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens
    })
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    message: data.choices[0].message.content,
    usage: data.usage
  }
}

async function callOllama(messages: any[], options: any) {
  const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
      messages,
      stream: false,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    message: data.message.content,
    usage: {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    }
  }
}

async function logConversation(userId: string, messages: ChatMessage[], response: string, context: string) {
  try {
    // In a production environment, you might want to log conversations for analytics
    // This is a placeholder for conversation logging
    console.log(`Chat logged for user ${userId} in context ${context}`)
  } catch (error) {
    console.error('Error logging conversation:', error)
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    service: 'AI Chat API',
    version: '1.0.0',
    capabilities: {
      contexts: ['portfolio', 'kpi', 'analytics', 'general'],
      aiServices: {
        openai: !!process.env.OPENAI_API_KEY && process.env.DISABLE_OPENAI !== 'true',
        openrouter: !!process.env.OPENROUTER_API_KEY,
        ollama: !!process.env.OLLAMA_BASE_URL
      }
    },
    usage: {
      endpoint: 'POST /api/chat',
      authentication: 'required',
      rateLimit: '100 requests per minute'
    }
  })
}
