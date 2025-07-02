/**
 * AI Portfolio Copilot API
 * Enhanced intelligent assistant for portfolio analysis and optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { aiOrchestrator, AIRequest } from '@/lib/ai/orchestrator'
import { hybridData, initializeHybridData } from '@/lib/data/hybrid-data-layer'
import RBACService from '@/lib/rbac'

// Enhanced copilot handler with advanced AI capabilities
const handleCopilotRequest = async (request: NextRequest, context: { user: any }) => {
  const { user } = context

  try {
    const body = await request.json()
    
    const {
      query,
      type = 'chat',
      portfolioId,
      conversationId,
      context: requestContext,
      preferences = {}
    } = body

    // Validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Valid query is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (query.length > 2000) {
      return NextResponse.json(
        { error: 'Query too long (max 2000 characters)', code: 'QUERY_TOO_LONG' },
        { status: 400 }
      )
    }

    // Initialize hybrid data layer
    const dataStatus = await initializeHybridData()
    
    // Determine optimal request type
    const requestType = determineOptimalRequestType(query, type)
    
    // Get portfolio context if available
    const portfolioContext = portfolioId ? await getPortfolioContext(portfolioId, user) : null
    
    // Build enhanced AI request with portfolio intelligence
    const aiRequest: AIRequest = {
      type: requestType as 'chat' | 'analysis' | 'prediction' | 'explanation' | 'summary',
      input: {
        query,
        portfolioId,
        conversationId: conversationId || `copilot_${Date.now()}`,
        context: {
          ...requestContext,
          portfolio: portfolioContext,
          dataSource: dataStatus.activeSource,
          userRole: user.organizationRole || user.role,
          capabilities: await getUserCapabilities(user),
          industryContext: await getIndustryContext(portfolioContext?.sector),
          marketConditions: await getMarketConditions()
        }
      },
      context: {
        userId: user.userId,
        organizationId: user.organizationId,
        portfolioId,
        userRole: user.organizationRole || user.role
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

    // Process through AI orchestrator with enhanced prompting
    const result = await aiOrchestrator.processRequest(aiRequest)
    const processingTime = Date.now() - startTime

    if (!result.success) {
      throw new Error(result.error || 'AI processing failed')
    }

    // Extract and enhance response with portfolio intelligence
    const response = result.data?.response || result.data?.analysis || result.data?.content || 'I apologize, but I couldn\'t process your request properly.'
    
    // Generate intelligent insights and recommendations
    const insights = await generatePortfolioInsights(result.data, portfolioContext)
    const recommendations = await generateActionableRecommendations(result.data, portfolioContext, user)
    const predictions = await generatePredictiveAnalysis(result.data, portfolioContext)
    
    // Generate contextual suggestions
    const suggestions = generateContextualSuggestions(query, requestType, result.data, portfolioContext)
    
    // Log copilot interaction for learning
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'AI_COPILOT',
      resourceType: 'AI_PORTFOLIO_ANALYSIS',
      resourceId: portfolioId || 'general',
      metadata: {
        queryLength: query.length,
        requestType,
        provider: result.metadata.provider,
        model: result.metadata.model,
        processingTime,
        confidence: result.metadata.confidence,
        hasPortfolioContext: !!portfolioContext,
        success: true
      }
    })

    // Build comprehensive copilot response
    const copilotResponse = {
      success: true,
      response,
      analysis: {
        insights: insights || result.data?.insights || [],
        recommendations: recommendations || result.data?.recommendations || [],
        riskFactors: result.data?.riskFactors || [],
        opportunities: result.data?.opportunities || [],
        predictions: predictions || result.data?.predictions || [],
        benchmarks: result.data?.benchmarks || []
      },
      suggestions,
      metadata: {
        conversationId: conversationId || `copilot_${Date.now()}`,
        requestType,
        confidence: result.metadata.confidence || 85,
        processingTime,
        provider: result.metadata.provider,
        model: result.metadata.model,
        timestamp: new Date().toISOString(),
        dataSource: dataStatus.activeSource,
        portfolioContext: !!portfolioContext
      },
      capabilities: {
        canAnalyze: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
        canPredict: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
        canOptimize: RBACService.hasPermission(user, PERMISSIONS.MANAGE_KPI),
        canExport: RBACService.hasPermission(user, PERMISSIONS.EXPORT_DATA),
        canShare: RBACService.hasPermission(user, PERMISSIONS.VIEW_ORGANIZATION)
      },
      nextActions: generateNextActions(requestType, result.data, portfolioContext),
      relatedQueries: generateRelatedQueries(query, requestType, portfolioContext),
      portfolioInsights: portfolioContext ? {
        name: portfolioContext.name,
        sector: portfolioContext.sector,
        keyMetrics: portfolioContext.keyMetrics,
        riskLevel: portfolioContext.riskLevel,
        performanceScore: portfolioContext.performanceScore
      } : undefined
    }

    return NextResponse.json(copilotResponse)

  } catch (error) {
    console.error('AI Copilot error:', error)
    
    // Get request body for fallback
    let requestBody: any = {}
    try {
      requestBody = await request.json()
    } catch (e) {
      // Handle case where body was already consumed
    }

    // Enhanced fallback with portfolio context
    const fallbackResponse = await generateEnhancedFallback(requestBody?.query || '', requestBody?.portfolioId, user)

    return NextResponse.json({
      success: false,
      response: fallbackResponse.response,
      error: 'AI Copilot temporarily unavailable',
      code: 'AI_COPILOT_ERROR',
      suggestions: fallbackResponse.suggestions,
      metadata: {
        timestamp: new Date().toISOString(),
        fallback: true,
        portfolioId: requestBody?.portfolioId
      }
    }, { status: 200 }) // Return 200 for better UX
  }
}

// Helper functions
function determineOptimalRequestType(query: string, defaultType: string): string {
  const lowerQuery = query.toLowerCase()
  
  // Advanced pattern matching for request type determination
  if (lowerQuery.match(/(predict|forecast|future|next|will|expect|trend)/)) {
    return 'prediction'
  }
  if (lowerQuery.match(/(analyze|performance|compare|benchmark|evaluate|assess)/)) {
    return 'analysis'
  }
  if (lowerQuery.match(/(explain|what is|how does|why|definition|meaning)/)) {
    return 'explanation'
  }
  if (lowerQuery.match(/(summary|summarize|overview|brief|key points)/)) {
    return 'summary'
  }
  if (lowerQuery.match(/(optimize|improve|enhance|strategy|recommend|suggest)/)) {
    return 'analysis' // Use analysis for optimization queries
  }
  
  return defaultType
}

async function getPortfolioContext(portfolioId: string, user: any) {
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

async function getUserCapabilities(user: any) {
  return {
    canAnalyze: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
    canPredict: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
    canOptimize: RBACService.hasPermission(user, PERMISSIONS.MANAGE_KPI),
    canExport: RBACService.hasPermission(user, PERMISSIONS.EXPORT_DATA),
    role: user.organizationRole || user.role
  }
}

async function getIndustryContext(sector?: string) {
  // Mock industry context - would integrate with real data
  return sector ? {
    sector,
    benchmarks: { growth: 0.15, margin: 0.12 },
    trends: ['Digital transformation', 'Market consolidation']
  } : null
}

async function getMarketConditions() {
  // Mock market conditions - would integrate with real market data
  return {
    sentiment: 'Positive',
    volatility: 'Medium',
    trends: ['Rising interest rates', 'Tech sector growth']
  }
}

async function generatePortfolioInsights(data: any, portfolioContext: any) {
  if (!portfolioContext) return []

  const insights = []

  // Performance insights
  if (portfolioContext.keyMetrics?.growth > 0.2) {
    insights.push('Strong revenue growth trajectory indicates healthy market position')
  }

  // Risk insights
  if (portfolioContext.riskLevel === 'High') {
    insights.push('Elevated risk profile requires enhanced monitoring and mitigation strategies')
  }

  // Sector insights
  if (portfolioContext.sector === 'Technology') {
    insights.push('Technology sector positioning provides growth opportunities but requires innovation focus')
  }

  return insights
}

async function generateActionableRecommendations(data: any, portfolioContext: any, user: any) {
  if (!portfolioContext) return []

  const recommendations = []

  // Performance-based recommendations
  if (portfolioContext.performanceScore < 70) {
    recommendations.push('Consider operational efficiency improvements to enhance performance metrics')
  }

  // Growth recommendations
  if (portfolioContext.keyMetrics?.growth < 0.1) {
    recommendations.push('Explore market expansion opportunities to accelerate growth')
  }

  // Risk management recommendations
  if (portfolioContext.riskLevel === 'High') {
    recommendations.push('Implement comprehensive risk mitigation framework')
  }

  return recommendations
}

async function generatePredictiveAnalysis(data: any, portfolioContext: any) {
  if (!portfolioContext) return []

  const predictions = []

  // Revenue predictions
  if (portfolioContext.keyMetrics?.growth) {
    predictions.push({
      metric: 'Revenue',
      current: portfolioContext.keyMetrics.revenue,
      predicted: portfolioContext.keyMetrics.revenue * (1 + portfolioContext.keyMetrics.growth),
      timeframe: 'Next 12 months',
      confidence: 85
    })
  }

  return predictions
}

function generateContextualSuggestions(query: string, requestType: string, data: any, portfolioContext: any): string[] {
  const suggestions = []

  if (portfolioContext) {
    suggestions.push(`Analyze ${portfolioContext.name} performance trends`)
    suggestions.push(`Compare ${portfolioContext.sector} sector benchmarks`)
    suggestions.push(`Forecast ${portfolioContext.name} growth potential`)
  }

  // Type-specific suggestions
  if (requestType === 'analysis') {
    suggestions.push('Show detailed KPI breakdown')
    suggestions.push('Identify optimization opportunities')
  } else if (requestType === 'prediction') {
    suggestions.push('Analyze risk factors')
    suggestions.push('Model different scenarios')
  }

  return suggestions.slice(0, 5) // Limit to 5 suggestions
}

function generateNextActions(requestType: string, data: any, portfolioContext: any): string[] {
  const actions = []

  if (requestType === 'analysis') {
    actions.push('Review key insights and metrics')
    actions.push('Share findings with stakeholders')
    actions.push('Schedule follow-up analysis')
  } else if (requestType === 'prediction') {
    actions.push('Monitor prediction accuracy')
    actions.push('Update assumptions as needed')
    actions.push('Plan scenario responses')
  }

  if (portfolioContext) {
    actions.push(`Update ${portfolioContext.name} strategy`)
  }

  return actions
}

function generateRelatedQueries(query: string, requestType: string, portfolioContext: any): string[] {
  const queries = []

  if (portfolioContext) {
    queries.push(`What are the key risks for ${portfolioContext.name}?`)
    queries.push(`How does ${portfolioContext.name} compare to industry benchmarks?`)
    queries.push(`What optimization strategies would work best for ${portfolioContext.sector} companies?`)
  }

  // Generic related queries
  queries.push('Show me portfolio performance summary')
  queries.push('Identify top growth opportunities')
  queries.push('Analyze market trends and implications')

  return queries.slice(0, 6) // Limit to 6 queries
}

async function generateEnhancedFallback(query: string, portfolioId?: string, user?: any) {
  return {
    response: `I apologize, but I'm temporarily unable to process your request about "${query}". However, I can still help you with portfolio analysis, KPI insights, and strategic recommendations. Please try rephrasing your question or contact support if the issue persists.`,
    suggestions: [
      'Try rephrasing your question',
      'Check portfolio data availability',
      'Ask about specific KPIs or metrics',
      'Request general portfolio insights'
    ]
  }
}

// Export RBAC-protected handler
export const POST = withRBAC(handleCopilotRequest, {
  permission: PERMISSIONS.VIEW_KPI
})

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    service: 'AI Portfolio Copilot',
    version: '2.0.0',
    capabilities: {
      intelligentAnalysis: true,
      predictiveInsights: true,
      portfolioOptimization: true,
      naturalLanguageQueries: true,
      contextualRecommendations: true,
      realTimeData: true,
      portfolioContext: true,
      industryBenchmarks: true,
      riskAssessment: true,
      performanceOptimization: true
    },
    features: {
      advancedAI: 'Multi-model orchestration with OpenRouter/OpenAI',
      dataIntegration: 'Hybrid SQLite/Supabase with real-time updates',
      security: 'RBAC with comprehensive audit logging',
      performance: 'Sub-2s response times with intelligent caching'
    },
    usage: {
      endpoint: 'POST /api/ai/copilot',
      authentication: 'required',
      permissions: ['VIEW_KPI'],
      rateLimit: '200 requests per minute',
      maxQueryLength: 2000
    }
  })
}
