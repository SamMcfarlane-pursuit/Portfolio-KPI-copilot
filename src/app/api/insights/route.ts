import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * AI-Powered Insights API
 * Generates intelligent insights and recommendations for portfolios and KPIs
 */

export const dynamic = 'force-dynamic'

interface InsightRequest {
  portfolioId?: string
  organizationId?: string
  type?: 'performance' | 'risk' | 'opportunity' | 'trend' | 'all'
  timeframe?: 'week' | 'month' | 'quarter' | 'year'
  includeRecommendations?: boolean
}

interface Insight {
  id: string
  type: 'performance' | 'risk' | 'opportunity' | 'trend'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: string
  confidence: number
  dataPoints: string[]
  recommendations?: Recommendation[]
  createdAt: string
}

interface Recommendation {
  action: string
  priority: 'low' | 'medium' | 'high'
  timeframe: string
  expectedImpact: string
  resources?: string[]
}

interface InsightsResponse {
  success: boolean
  insights: Insight[]
  summary: {
    total: number
    byType: { [key: string]: number }
    bySeverity: { [key: string]: number }
    actionableInsights: number
  }
  metadata: {
    generatedAt: string
    portfolioId?: string
    organizationId?: string
    timeframe: string
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const insightRequest: InsightRequest = {
      portfolioId: searchParams.get('portfolioId') || undefined,
      organizationId: searchParams.get('organizationId') || undefined,
      type: (searchParams.get('type') as any) || 'all',
      timeframe: (searchParams.get('timeframe') as any) || 'quarter',
      includeRecommendations: searchParams.get('includeRecommendations') === 'true'
    }

    // Generate insights
    const insights = await generateInsights(insightRequest, session.user)

    // Calculate summary
    const summary = {
      total: insights.length,
      byType: insights.reduce((acc, insight) => {
        acc[insight.type] = (acc[insight.type] || 0) + 1
        return acc
      }, {} as { [key: string]: number }),
      bySeverity: insights.reduce((acc, insight) => {
        acc[insight.severity] = (acc[insight.severity] || 0) + 1
        return acc
      }, {} as { [key: string]: number }),
      actionableInsights: insights.filter(i => i.recommendations && i.recommendations.length > 0).length
    }

    const response: InsightsResponse = {
      success: true,
      insights,
      summary,
      metadata: {
        generatedAt: new Date().toISOString(),
        portfolioId: insightRequest.portfolioId,
        organizationId: insightRequest.organizationId,
        timeframe: insightRequest.timeframe || 'quarter'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Insights API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateInsights(request: InsightRequest, user: any): Promise<Insight[]> {
  const { prisma } = await import('@/lib/prisma')

  // Get relevant data
  const whereClause: any = {}
  
  if (request.portfolioId) {
    whereClause.portfolioId = request.portfolioId
  }
  
  if (request.organizationId) {
    whereClause.organizationId = request.organizationId
  }

  // Add timeframe filter
  const timeframeFilter = getTimeframeFilter(request.timeframe || 'quarter')
  if (timeframeFilter) {
    whereClause.period = timeframeFilter
  }

  // Get portfolios and KPIs
  const portfolios = await prisma.portfolio.findMany({
    where: request.portfolioId ? { id: request.portfolioId } : 
           request.organizationId ? { fund: { organizationId: request.organizationId } } : {},
    include: {
      kpis: {
        where: whereClause,
        orderBy: { period: 'desc' }
      },
      fund: {
        include: {
          organization: true
        }
      }
    }
  })

  const allKPIs = portfolios.flatMap(p => p.kpis)

  // Generate different types of insights
  const insights: Insight[] = []

  if (request.type === 'all' || request.type === 'performance') {
    insights.push(...generatePerformanceInsights(portfolios, allKPIs))
  }

  if (request.type === 'all' || request.type === 'risk') {
    insights.push(...generateRiskInsights(portfolios, allKPIs))
  }

  if (request.type === 'all' || request.type === 'opportunity') {
    insights.push(...generateOpportunityInsights(portfolios, allKPIs))
  }

  if (request.type === 'all' || request.type === 'trend') {
    insights.push(...generateTrendInsights(portfolios, allKPIs))
  }

  // Add recommendations if requested
  if (request.includeRecommendations) {
    insights.forEach(insight => {
      insight.recommendations = generateRecommendations(insight, portfolios, allKPIs)
    })
  }

  return insights.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
}

function getTimeframeFilter(timeframe: string) {
  const now = new Date()
  
  switch (timeframe) {
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { gte: weekAgo }
    case 'month':
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      return { gte: monthAgo }
    case 'quarter':
      const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      return { gte: quarterAgo }
    case 'year':
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      return { gte: yearAgo }
    default:
      return undefined
  }
}

function generatePerformanceInsights(portfolios: any[], kpis: any[]): Insight[] {
  const insights: Insight[] = []

  // Revenue growth analysis
  const revenueKPIs = kpis.filter(k => k.category.toLowerCase().includes('revenue'))
  if (revenueKPIs.length >= 2) {
    const sortedRevenue = revenueKPIs.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())
    const latestRevenue = sortedRevenue[0].value
    const previousRevenue = sortedRevenue[1].value
    const growthRate = ((latestRevenue - previousRevenue) / previousRevenue) * 100

    if (growthRate > 20) {
      insights.push({
        id: `perf_revenue_${Date.now()}`,
        type: 'performance',
        severity: 'high',
        title: 'Strong Revenue Growth Detected',
        description: `Revenue has grown by ${growthRate.toFixed(1)}% in the latest period, significantly outperforming typical growth rates.`,
        impact: 'Positive momentum indicates strong market position and execution',
        confidence: 0.85,
        dataPoints: [`Current revenue: $${latestRevenue.toLocaleString()}`, `Growth rate: ${growthRate.toFixed(1)}%`],
        createdAt: new Date().toISOString()
      })
    } else if (growthRate < -10) {
      insights.push({
        id: `perf_revenue_decline_${Date.now()}`,
        type: 'performance',
        severity: 'critical',
        title: 'Revenue Decline Alert',
        description: `Revenue has declined by ${Math.abs(growthRate).toFixed(1)}% in the latest period, requiring immediate attention.`,
        impact: 'Negative trend may indicate market challenges or execution issues',
        confidence: 0.90,
        dataPoints: [`Current revenue: $${latestRevenue.toLocaleString()}`, `Decline rate: ${growthRate.toFixed(1)}%`],
        createdAt: new Date().toISOString()
      })
    }
  }

  // Profitability analysis
  const profitKPIs = kpis.filter(k => k.category.toLowerCase().includes('profit') || k.category.toLowerCase().includes('margin'))
  if (profitKPIs.length > 0) {
    const avgProfitMargin = profitKPIs.reduce((sum, kpi) => sum + kpi.value, 0) / profitKPIs.length

    if (avgProfitMargin > 25) {
      insights.push({
        id: `perf_profit_${Date.now()}`,
        type: 'performance',
        severity: 'high',
        title: 'Excellent Profitability Performance',
        description: `Average profit margin of ${avgProfitMargin.toFixed(1)}% indicates strong operational efficiency and pricing power.`,
        impact: 'High profitability provides flexibility for growth investments',
        confidence: 0.80,
        dataPoints: [`Average profit margin: ${avgProfitMargin.toFixed(1)}%`, `Number of profitable metrics: ${profitKPIs.length}`],
        createdAt: new Date().toISOString()
      })
    } else if (avgProfitMargin < 5) {
      insights.push({
        id: `perf_profit_low_${Date.now()}`,
        type: 'performance',
        severity: 'high',
        title: 'Low Profitability Concern',
        description: `Average profit margin of ${avgProfitMargin.toFixed(1)}% is below healthy thresholds and may impact sustainability.`,
        impact: 'Low margins limit growth investment capacity and financial resilience',
        confidence: 0.85,
        dataPoints: [`Average profit margin: ${avgProfitMargin.toFixed(1)}%`, `Industry benchmark: 15-20%`],
        createdAt: new Date().toISOString()
      })
    }
  }

  return insights
}

function generateRiskInsights(portfolios: any[], kpis: any[]): Insight[] {
  const insights: Insight[] = []

  // Concentration risk
  const sectorConcentration = portfolios.reduce((acc, portfolio) => {
    const sector = portfolio.sector || 'Unknown'
    acc[sector] = (acc[sector] || 0) + (portfolio.investment || 0)
    return acc
  }, {} as { [key: string]: number })

  const totalInvestment = Object.values(sectorConcentration).reduce((sum: number, value: unknown) => sum + (value as number), 0)
  const maxConcentration = Math.max(...Object.values(sectorConcentration) as number[]) / totalInvestment

  if (maxConcentration > 0.5) {
    const dominantSector = Object.entries(sectorConcentration).find(([_, value]) => (value as number) / totalInvestment === maxConcentration)?.[0]
    insights.push({
      id: `risk_concentration_${Date.now()}`,
      type: 'risk',
      severity: 'medium',
      title: 'Sector Concentration Risk',
      description: `${(maxConcentration * 100).toFixed(1)}% of investments are concentrated in ${dominantSector}, creating potential sector-specific risk.`,
      impact: 'High concentration increases vulnerability to sector-specific downturns',
      confidence: 0.90,
      dataPoints: [`Dominant sector: ${dominantSector}`, `Concentration: ${(maxConcentration * 100).toFixed(1)}%`],
      createdAt: new Date().toISOString()
    })
  }

  // Volatility risk
  const revenueKPIs = kpis.filter(k => k.category.toLowerCase().includes('revenue'))
  if (revenueKPIs.length >= 3) {
    const revenues = revenueKPIs.map(k => k.value)
    const mean = revenues.reduce((sum, val) => sum + val, 0) / revenues.length
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length
    const volatility = Math.sqrt(variance) / mean

    if (volatility > 0.3) {
      insights.push({
        id: `risk_volatility_${Date.now()}`,
        type: 'risk',
        severity: 'medium',
        title: 'High Revenue Volatility',
        description: `Revenue volatility of ${(volatility * 100).toFixed(1)}% indicates inconsistent performance patterns.`,
        impact: 'High volatility makes financial planning and forecasting more challenging',
        confidence: 0.75,
        dataPoints: [`Volatility coefficient: ${(volatility * 100).toFixed(1)}%`, `Data points analyzed: ${revenues.length}`],
        createdAt: new Date().toISOString()
      })
    }
  }

  return insights
}

function generateOpportunityInsights(portfolios: any[], kpis: any[]): Insight[] {
  const insights: Insight[] = []

  // Growth opportunity
  const growthKPIs = kpis.filter(k => k.category.toLowerCase().includes('growth') || k.category.toLowerCase().includes('customer'))
  if (growthKPIs.length > 0) {
    const avgGrowthRate = growthKPIs.reduce((sum, kpi) => sum + kpi.value, 0) / growthKPIs.length

    if (avgGrowthRate > 30) {
      insights.push({
        id: `opp_growth_${Date.now()}`,
        type: 'opportunity',
        severity: 'high',
        title: 'Accelerated Growth Opportunity',
        description: `Strong growth metrics averaging ${avgGrowthRate.toFixed(1)}% suggest potential for scaling operations.`,
        impact: 'High growth rates indicate market demand and scalability potential',
        confidence: 0.80,
        dataPoints: [`Average growth rate: ${avgGrowthRate.toFixed(1)}%`, `Growth metrics tracked: ${growthKPIs.length}`],
        createdAt: new Date().toISOString()
      })
    }
  }

  // Efficiency opportunity
  const efficiencyKPIs = kpis.filter(k => k.category.toLowerCase().includes('efficiency') || k.category.toLowerCase().includes('cost'))
  if (efficiencyKPIs.length > 0) {
    const improvementPotential = efficiencyKPIs.filter(kpi => 
      kpi.targetValue && kpi.value < kpi.targetValue * 0.9
    )

    if (improvementPotential.length > 0) {
      insights.push({
        id: `opp_efficiency_${Date.now()}`,
        type: 'opportunity',
        severity: 'medium',
        title: 'Operational Efficiency Opportunity',
        description: `${improvementPotential.length} efficiency metrics are below target, presenting optimization opportunities.`,
        impact: 'Improving operational efficiency can directly impact profitability',
        confidence: 0.85,
        dataPoints: [`Metrics below target: ${improvementPotential.length}`, `Total efficiency metrics: ${efficiencyKPIs.length}`],
        createdAt: new Date().toISOString()
      })
    }
  }

  return insights
}

function generateTrendInsights(portfolios: any[], kpis: any[]): Insight[] {
  const insights: Insight[] = []

  // Trend analysis by category
  const categories = Array.from(new Set(kpis.map(k => k.category)))
  
  categories.forEach(category => {
    const categoryKPIs = kpis.filter(k => k.category === category)
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())

    if (categoryKPIs.length >= 3) {
      // Simple trend detection
      const values = categoryKPIs.map(k => k.value)
      const isIncreasing = values.every((val, i) => i === 0 || val >= values[i - 1])
      const isDecreasing = values.every((val, i) => i === 0 || val <= values[i - 1])

      if (isIncreasing && values[values.length - 1] > values[0] * 1.2) {
        insights.push({
          id: `trend_up_${category}_${Date.now()}`,
          type: 'trend',
          severity: 'medium',
          title: `Positive Trend in ${category}`,
          description: `${category} metrics show consistent upward trend with ${((values[values.length - 1] / values[0] - 1) * 100).toFixed(1)}% improvement.`,
          impact: 'Positive trend indicates successful strategy execution',
          confidence: 0.80,
          dataPoints: [`Category: ${category}`, `Improvement: ${((values[values.length - 1] / values[0] - 1) * 100).toFixed(1)}%`],
          createdAt: new Date().toISOString()
        })
      } else if (isDecreasing && values[values.length - 1] < values[0] * 0.8) {
        insights.push({
          id: `trend_down_${category}_${Date.now()}`,
          type: 'trend',
          severity: 'high',
          title: `Declining Trend in ${category}`,
          description: `${category} metrics show consistent downward trend with ${((1 - values[values.length - 1] / values[0]) * 100).toFixed(1)}% decline.`,
          impact: 'Declining trend requires strategic intervention',
          confidence: 0.85,
          dataPoints: [`Category: ${category}`, `Decline: ${((1 - values[values.length - 1] / values[0]) * 100).toFixed(1)}%`],
          createdAt: new Date().toISOString()
        })
      }
    }
  })

  return insights
}

function generateRecommendations(insight: Insight, portfolios: any[], kpis: any[]): Recommendation[] {
  const recommendations: Recommendation[] = []

  switch (insight.type) {
    case 'performance':
      if (insight.severity === 'critical' && insight.title.includes('Revenue Decline')) {
        recommendations.push({
          action: 'Conduct immediate revenue analysis and implement recovery plan',
          priority: 'high',
          timeframe: '2-4 weeks',
          expectedImpact: 'Stabilize revenue decline and identify growth opportunities',
          resources: ['Revenue team', 'Analytics team', 'External consultants']
        })
      }
      break

    case 'risk':
      if (insight.title.includes('Concentration Risk')) {
        recommendations.push({
          action: 'Diversify portfolio across multiple sectors to reduce concentration risk',
          priority: 'medium',
          timeframe: '6-12 months',
          expectedImpact: 'Reduce portfolio volatility and improve risk-adjusted returns',
          resources: ['Investment team', 'Due diligence team']
        })
      }
      break

    case 'opportunity':
      if (insight.title.includes('Growth Opportunity')) {
        recommendations.push({
          action: 'Develop scaling strategy to capitalize on growth momentum',
          priority: 'high',
          timeframe: '1-3 months',
          expectedImpact: 'Accelerate growth and market share expansion',
          resources: ['Strategy team', 'Operations team', 'Capital allocation']
        })
      }
      break

    case 'trend':
      if (insight.title.includes('Declining Trend')) {
        recommendations.push({
          action: 'Investigate root causes and implement corrective measures',
          priority: 'high',
          timeframe: '4-8 weeks',
          expectedImpact: 'Reverse negative trend and restore performance',
          resources: ['Operations team', 'Analytics team']
        })
      }
      break
  }

  return recommendations
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, insightId, ...params } = body

    switch (action) {
      case 'mark_reviewed':
        return await markInsightReviewed(insightId, session.user)
      case 'implement_recommendation':
        return await implementRecommendation(insightId, params.recommendationIndex, session.user)
      case 'generate_custom_insight':
        return await generateCustomInsight(params, session.user)
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Insights POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Insights operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function markInsightReviewed(insightId: string, user: any) {
  // In a production system, this would update the insight status in the database
  return NextResponse.json({
    success: true,
    message: 'Insight marked as reviewed',
    insightId,
    reviewedBy: user.id,
    reviewedAt: new Date().toISOString()
  })
}

async function implementRecommendation(insightId: string, recommendationIndex: number, user: any) {
  // In a production system, this would track recommendation implementation
  return NextResponse.json({
    success: true,
    message: 'Recommendation implementation tracked',
    insightId,
    recommendationIndex,
    implementedBy: user.id,
    implementedAt: new Date().toISOString()
  })
}

async function generateCustomInsight(params: any, user: any) {
  // Generate custom insights based on specific parameters
  const insights = await generateInsights(params, user)
  
  return NextResponse.json({
    success: true,
    customInsights: insights,
    generatedAt: new Date().toISOString()
  })
}
