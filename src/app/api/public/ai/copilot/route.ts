import { NextRequest, NextResponse } from 'next/server'
import { aiOrchestrator } from '@/lib/ai/orchestrator'
import { initializeHybridData } from '@/lib/data/hybrid-data-layer'

// Helper function to get portfolio context (copied from main endpoint)
async function getPortfolioContext(portfolioId: string) {
  try {
    // Use the hybrid data layer to fetch the real portfolio
    const { HybridDataLayer } = await import('@/lib/data/hybrid-data-layer')
    const dataLayer = HybridDataLayer.getInstance()
    await dataLayer.initialize()
    const portfolio = await dataLayer.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        kpis: {
          orderBy: { period: 'desc' },
          take: 10
        },
        fund: true
      }
    })
    if (!portfolio) return null

    // Calculate key metrics from KPIs if available
    let revenue = null, growth = null, margin = null
    if (portfolio.kpis && portfolio.kpis.length > 0) {
      // Example: extract latest values for demo purposes
      const latestKPI = portfolio.kpis[0]
      revenue = latestKPI.name === 'Revenue' ? latestKPI.value : null
      growth = latestKPI.name === 'Growth' ? latestKPI.value : null
      margin = latestKPI.name === 'Margin' ? latestKPI.value : null
    }

    // Map to expected context structure
    return {
      id: portfolio.id,
      name: portfolio.name,
      sector: portfolio.sector || portfolio.fund?.sector || 'Unknown',
      keyMetrics: {
        revenue,
        growth,
        margin
      },
      riskLevel: portfolio.riskLevel || 'Medium',
      performanceScore: portfolio.performanceScore || 80 // fallback if not present
    }
  } catch (error) {
    console.error('Error getting portfolio context:', error)
    return null
  }
}

// Public Copilot handler (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      query,
      type = 'chat',
      portfolioId,
      conversationId,
      context: requestContext = {},
      preferences = {}
    } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Valid query is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }
    if (query.length > 2000) {
      return NextResponse.json({ error: 'Query too long (max 2000 characters)', code: 'QUERY_TOO_LONG' }, { status: 400 })
    }

    await initializeHybridData()

    // Get portfolio context if portfolioId is provided
    const portfolioContext = portfolioId ? await getPortfolioContext(portfolioId) : null

    // Build AI request with portfolio context
    const aiRequest = {
      type,
      input: {
        query,
        portfolioId,
        conversationId: conversationId || `public_copilot_${Date.now()}`,
        context: {
          ...requestContext,
          portfolio: portfolioContext
        }
      },
      preferences: {
        aiProvider: preferences.aiProvider || 'auto',
        priority: preferences.priority || 'quality',
        temperature: preferences.temperature || 0.7,
        maxTokens: preferences.maxTokens || 2000,
        ...preferences
      }
    }

    const startTime = Date.now()
    const result = await aiOrchestrator.processRequest(aiRequest)
    const processingTime = Date.now() - startTime

    if (!result.success) {
      throw new Error(result.error || 'AI processing failed')
    }

    // Generate insights and recommendations if portfolio context is available
    const insights = portfolioContext ? [
      `Analyzing ${portfolioContext.name} (${portfolioContext.sector} sector)`,
      `Current performance score: ${portfolioContext.performanceScore}`,
      `Risk level: ${portfolioContext.riskLevel}`
    ] : []

    const recommendations = portfolioContext ? [
      'Review quarterly KPI trends',
      'Compare with sector benchmarks',
      'Monitor key performance indicators'
    ] : []

    return NextResponse.json({
      success: true,
      response: result.data?.response || result.data?.analysis || result.data?.content || 'AI Copilot response unavailable.',
      analysis: {
        insights,
        recommendations,
        ...result.data?.analysis
      },
      suggestions: result.data?.suggestions || [],
      portfolioContext: portfolioContext ? {
        name: portfolioContext.name,
        sector: portfolioContext.sector,
        keyMetrics: portfolioContext.keyMetrics,
        riskLevel: portfolioContext.riskLevel,
        performanceScore: portfolioContext.performanceScore
      } : undefined,
      metadata: {
        processingTime,
        provider: result.metadata?.provider,
        model: result.metadata?.model,
        confidence: result.metadata?.confidence,
        timestamp: new Date().toISOString(),
        public: true,
        hasPortfolioContext: !!portfolioContext
      }
    })
  } catch (error) {
    console.error('Public AI Copilot error:', error)
    return NextResponse.json({
      success: false,
      response: 'AI Copilot temporarily unavailable (public route)',
      error: error instanceof Error ? error.message : String(error),
      code: 'AI_COPILOT_ERROR',
      metadata: {
        timestamp: new Date().toISOString(),
        fallback: true,
        public: true
      }
    }, { status: 200 })
  }
} 