/**
 * Natural Language KPI Query API
 * Process natural language queries and convert to structured data requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { enhancedAIService } from '@/lib/ai/enhanced-ai-service'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import { rateLimiter } from '@/lib/middleware/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      {
        maxRequests: 20,
        windowMs: 60000, // 20 requests per minute
        strategy: 'fixed-window'
      }
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      )
    }

    // Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      query, 
      organizationId, 
      portfolioId,
      includeContext = true,
      executeQuery = false 
    } = body

    // Validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long (max 500 characters)' },
        { status: 400 }
      )
    }

    // Get context data if requested
    let context: any = {}
    if (includeContext) {
      context = await getQueryContext(organizationId, portfolioId, session.user.id)
    }

    // Process natural language query
    const nlResult = await enhancedAIService.processNaturalLanguageQuery(query, {
      ...context,
      userId: session.user.id,
      organizationId
    })

    // Execute the query if requested and safe
    let results: any = null
    if (executeQuery && nlResult.confidence > 70) {
      try {
        results = await executeStructuredQuery(nlResult, context, session.user.id)
      } catch (error) {
        console.error('Query execution error:', error)
        // Don't fail the whole request if query execution fails
      }
    }

    // Generate response
    const response = {
      success: true,
      query: {
        original: query,
        intent: nlResult.intent,
        entities: nlResult.entities,
        filters: nlResult.filters,
        confidence: nlResult.confidence,
        sqlQuery: nlResult.sqlQuery
      },
      response: nlResult.response,
      results,
      suggestions: generateQuerySuggestions(nlResult, context),
      metadata: {
        processingTime: Date.now(),
        userId: session.user.id,
        organizationId,
        portfolioId
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Natural language query error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process natural language query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    // Get available query examples and capabilities
    const capabilities = await getNLQueryCapabilities(organizationId || undefined, session.user.id)

    return NextResponse.json({
      success: true,
      capabilities,
      examples: getQueryExamples(),
      tips: getQueryTips()
    })

  } catch (error) {
    console.error('NL capabilities error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get capabilities' 
      },
      { status: 500 }
    )
  }
}

async function getQueryContext(
  organizationId?: string, 
  portfolioId?: string, 
  userId?: string
): Promise<any> {
  try {
    const context: any = {}

    // Get available portfolios
    if (organizationId) {
      const portfolios = await hybridData.getPortfolios({
        organizationId,
        limit: 100
      })
      context.portfolios = portfolios.data
    }

    // Get available KPIs
    if (portfolioId) {
      const kpis = await hybridData.getKPIs({
        portfolioId,
        limit: 1000
      })
      context.kpis = kpis.data
    } else if (organizationId) {
      // Get KPIs across all portfolios in organization
      const kpis = await hybridData.getKPIs({
        organizationId,
        limit: 1000
      })
      context.kpis = kpis.data
    }

    // Get KPI categories and types
    context.kpiCategories = ['financial', 'operational', 'growth', 'efficiency', 'risk']
    context.kpiTypes = extractKPITypes(context.kpis || [])
    context.industries = extractIndustries(context.portfolios || [])
    context.stages = extractStages(context.portfolios || [])

    return context

  } catch (error) {
    console.error('Context retrieval error:', error)
    return {}
  }
}

async function executeStructuredQuery(
  nlResult: any, 
  context: any, 
  userId: string
): Promise<any> {
  const { intent, entities, filters } = nlResult

  switch (intent) {
    case 'search':
    case 'analyze':
      return await executeSearchQuery(entities, filters, context, userId)
    
    case 'compare':
      return await executeComparisonQuery(entities, filters, context, userId)
    
    case 'forecast':
      return await executeForecastQuery(entities, filters, context, userId)
    
    case 'benchmark':
      return await executeBenchmarkQuery(entities, filters, context, userId)
    
    default:
      throw new Error(`Unsupported query intent: ${intent}`)
  }
}

async function executeSearchQuery(
  entities: any[],
  filters: any,
  context: any,
  userId: string
): Promise<any> {
  // Build search parameters from entities and filters
  const searchParams: any = {}

  // Extract KPI types from entities
  const kpiEntities = entities.filter(e => e.type === 'kpi')
  if (kpiEntities.length > 0) {
    // For now, we'll search by category since we don't have exact name matching
    searchParams.category = kpiEntities[0].value.toLowerCase()
  }

  // Apply filters
  if (filters.comparison) {
    // Note: The current getKPIs doesn't support value filtering
    // This would need to be implemented in the hybrid data layer
    console.log('Value filtering not yet implemented:', filters.comparison)
  }

  // Execute search using getKPIs
  const results = await hybridData.getKPIs({
    ...searchParams,
    limit: 50
  })

  return {
    type: 'search',
    results: results.data,
    count: results.count,
    source: results.source
  }
}

async function executeComparisonQuery(
  entities: any[], 
  filters: any, 
  context: any, 
  userId: string
): Promise<any> {
  // Implementation for comparison queries
  return { type: 'comparison', message: 'Comparison query execution not yet implemented' }
}

async function executeForecastQuery(
  entities: any[], 
  filters: any, 
  context: any, 
  userId: string
): Promise<any> {
  // Implementation for forecast queries
  return { type: 'forecast', message: 'Forecast query execution not yet implemented' }
}

async function executeBenchmarkQuery(
  entities: any[], 
  filters: any, 
  context: any, 
  userId: string
): Promise<any> {
  // Implementation for benchmark queries
  return { type: 'benchmark', message: 'Benchmark query execution not yet implemented' }
}

async function getNLQueryCapabilities(
  organizationId?: string, 
  userId?: string
): Promise<any> {
  return {
    supportedIntents: ['search', 'analyze', 'compare', 'forecast', 'benchmark'],
    supportedEntities: ['kpi', 'portfolio', 'company', 'value', 'date', 'industry'],
    supportedFilters: ['comparison', 'date_range', 'category', 'industry', 'stage'],
    supportedOperators: ['>', '<', '>=', '<=', '=', 'between'],
    maxQueryLength: 500,
    confidenceThreshold: 70
  }
}

function generateQuerySuggestions(nlResult: any, context: any): string[] {
  const suggestions: string[] = []

  // Generate suggestions based on available data
  if (context.portfolios?.length > 0) {
    suggestions.push('Show me all portfolios with ROE > 15%')
    suggestions.push('Compare revenue growth across tech companies')
  }

  if (context.kpis?.length > 0) {
    suggestions.push('Analyze EBITDA trends for Q4')
    suggestions.push('Find companies with declining profit margins')
  }

  // Add intent-specific suggestions
  switch (nlResult.intent) {
    case 'search':
      suggestions.push('Show me companies in healthcare industry')
      suggestions.push('Find portfolios with high debt-to-equity ratio')
      break
    case 'analyze':
      suggestions.push('Analyze performance trends for Series A companies')
      suggestions.push('Review risk factors for underperforming portfolios')
      break
    case 'compare':
      suggestions.push('Compare SaaS companies vs traditional software')
      suggestions.push('Benchmark our portfolio against industry averages')
      break
  }

  return suggestions.slice(0, 5) // Return top 5 suggestions
}

function getQueryExamples(): Array<{ query: string; description: string; intent: string }> {
  return [
    {
      query: "Show me tech companies with ROE > 15%",
      description: "Find technology companies with Return on Equity above 15%",
      intent: "search"
    },
    {
      query: "Compare revenue growth for Series A vs Series B companies",
      description: "Analyze revenue growth differences between funding stages",
      intent: "compare"
    },
    {
      query: "Analyze EBITDA trends for healthcare portfolios",
      description: "Review EBITDA performance trends in healthcare sector",
      intent: "analyze"
    },
    {
      query: "Forecast next quarter revenue for SaaS companies",
      description: "Predict Q1 revenue for Software-as-a-Service portfolios",
      intent: "forecast"
    },
    {
      query: "Benchmark our fintech portfolio against industry",
      description: "Compare fintech portfolio performance to industry standards",
      intent: "benchmark"
    }
  ]
}

function getQueryTips(): string[] {
  return [
    "Use specific KPI names like 'ROE', 'EBITDA', 'revenue growth'",
    "Include comparison operators: '>', '<', '>=', '<=', '='",
    "Specify industries: 'tech', 'healthcare', 'fintech', 'SaaS'",
    "Mention time periods: 'Q4', 'last quarter', 'YTD', '2023'",
    "Use company stages: 'Series A', 'growth stage', 'mature'",
    "Be specific about what you want to see or analyze"
  ]
}

// Helper functions
function extractKPITypes(kpis: any[]): string[] {
  const uniqueNames = new Set(kpis.map(kpi => kpi.name).filter(Boolean))
  return Array.from(uniqueNames)
}

function extractIndustries(portfolios: any[]): string[] {
  const uniqueIndustries = new Set(portfolios.map(p => p.industry).filter(Boolean))
  return Array.from(uniqueIndustries)
}

function extractStages(portfolios: any[]): string[] {
  const uniqueStages = new Set(portfolios.map(p => p.stage).filter(Boolean))
  return Array.from(uniqueStages)
}
