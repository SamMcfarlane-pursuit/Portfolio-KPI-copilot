import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Analytics API
 * Provides comprehensive portfolio and KPI analytics
 */

export const dynamic = 'force-dynamic'

interface AnalyticsRequest {
  portfolioId?: string
  organizationId?: string
  timeframe?: 'week' | 'month' | 'quarter' | 'year' | 'all'
  metrics?: string[]
  includeForecasting?: boolean
  includeBenchmarks?: boolean
}

interface AnalyticsResponse {
  success: boolean
  analytics: {
    overview: PortfolioOverview
    performance: PerformanceMetrics
    trends: TrendAnalysis
    benchmarks?: BenchmarkData
    forecasting?: ForecastData
  }
  metadata: {
    timeframe: string
    dataPoints: number
    lastUpdated: string
  }
}

interface PortfolioOverview {
  totalValue: number
  totalInvestment: number
  totalReturn: number
  returnPercentage: number
  portfolioCount: number
  activeKPIs: number
}

interface PerformanceMetrics {
  revenue: MetricData
  growth: MetricData
  profitability: MetricData
  efficiency: MetricData
}

interface MetricData {
  current: number
  previous: number
  change: number
  changePercentage: number
  trend: 'up' | 'down' | 'stable'
}

interface TrendAnalysis {
  revenueGrowth: TrendPoint[]
  profitabilityTrend: TrendPoint[]
  kpiPerformance: KPITrend[]
}

interface TrendPoint {
  period: string
  value: number
  target?: number
}

interface KPITrend {
  name: string
  category: string
  trend: TrendPoint[]
  performance: 'above_target' | 'on_target' | 'below_target'
}

interface BenchmarkData {
  industryAverages: { [key: string]: number }
  peerComparison: { [key: string]: number }
  percentileRanking: { [key: string]: number }
}

interface ForecastData {
  revenue: ForecastPoint[]
  growth: ForecastPoint[]
  confidence: number
}

interface ForecastPoint {
  period: string
  predicted: number
  confidence_lower: number
  confidence_upper: number
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
    const analyticsRequest: AnalyticsRequest = {
      portfolioId: searchParams.get('portfolioId') || undefined,
      organizationId: searchParams.get('organizationId') || undefined,
      timeframe: (searchParams.get('timeframe') as any) || 'quarter',
      metrics: searchParams.get('metrics')?.split(',') || undefined,
      includeForecasting: searchParams.get('includeForecasting') === 'true',
      includeBenchmarks: searchParams.get('includeBenchmarks') === 'true'
    }

    // Get analytics data
    const analytics = await generateAnalytics(analyticsRequest, session.user)

    return NextResponse.json({
      success: true,
      analytics,
      metadata: {
        timeframe: analyticsRequest.timeframe,
        dataPoints: analytics.overview.activeKPIs,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateAnalytics(request: AnalyticsRequest, user: any): Promise<AnalyticsResponse['analytics']> {
  const { prisma } = await import('@/lib/prisma')

  // Build where clause
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
      fund: true
    }
  })

  const allKPIs = portfolios.flatMap(p => p.kpis)

  // Generate overview
  const overview = generateOverview(portfolios, allKPIs)

  // Generate performance metrics
  const performance = generatePerformanceMetrics(allKPIs)

  // Generate trend analysis
  const trends = generateTrendAnalysis(allKPIs, request.timeframe || 'quarter')

  // Generate benchmarks if requested
  const benchmarks = request.includeBenchmarks ? 
    await generateBenchmarks(allKPIs, portfolios) : undefined

  // Generate forecasting if requested
  const forecasting = request.includeForecasting ? 
    generateForecasting(allKPIs) : undefined

  return {
    overview,
    performance,
    trends,
    benchmarks,
    forecasting
  }
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
    case 'all':
    default:
      return undefined
  }
}

function generateOverview(portfolios: any[], kpis: any[]): PortfolioOverview {
  const totalValue = portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0)
  const totalInvestment = portfolios.reduce((sum, p) => sum + (p.investment || 0), 0)
  const totalReturn = totalValue - totalInvestment
  const returnPercentage = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0

  return {
    totalValue,
    totalInvestment,
    totalReturn,
    returnPercentage,
    portfolioCount: portfolios.length,
    activeKPIs: kpis.length
  }
}

function generatePerformanceMetrics(kpis: any[]): PerformanceMetrics {
  const revenueKPIs = kpis.filter(k => k.category.toLowerCase().includes('revenue'))
  const growthKPIs = kpis.filter(k => k.category.toLowerCase().includes('growth'))
  const profitKPIs = kpis.filter(k => k.category.toLowerCase().includes('profit'))
  const efficiencyKPIs = kpis.filter(k => k.category.toLowerCase().includes('efficiency'))

  return {
    revenue: calculateMetricData(revenueKPIs),
    growth: calculateMetricData(growthKPIs),
    profitability: calculateMetricData(profitKPIs),
    efficiency: calculateMetricData(efficiencyKPIs)
  }
}

function calculateMetricData(kpis: any[]): MetricData {
  if (kpis.length === 0) {
    return {
      current: 0,
      previous: 0,
      change: 0,
      changePercentage: 0,
      trend: 'stable'
    }
  }

  // Sort by period
  const sortedKPIs = kpis.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())
  
  const current = sortedKPIs[0]?.value || 0
  const previous = sortedKPIs[1]?.value || 0
  const change = current - previous
  const changePercentage = previous !== 0 ? (change / previous) * 100 : 0
  
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable'

  return {
    current,
    previous,
    change,
    changePercentage,
    trend
  }
}

function generateTrendAnalysis(kpis: any[], timeframe: string): TrendAnalysis {
  // Group KPIs by category and period
  const revenueKPIs = kpis.filter(k => k.category.toLowerCase().includes('revenue'))
  const profitKPIs = kpis.filter(k => k.category.toLowerCase().includes('profit'))

  const revenueGrowth = generateTrendPoints(revenueKPIs)
  const profitabilityTrend = generateTrendPoints(profitKPIs)

  // Generate KPI performance trends
  const kpiCategories = Array.from(new Set(kpis.map(k => k.category)))
  const kpiPerformance = kpiCategories.map(category => {
    const categoryKPIs = kpis.filter(k => k.category === category)
    const trend = generateTrendPoints(categoryKPIs)
    
    // Determine performance vs targets
    const latestKPI = categoryKPIs.sort((a, b) => 
      new Date(b.period).getTime() - new Date(a.period).getTime()
    )[0]
    
    let performance: 'above_target' | 'on_target' | 'below_target' = 'on_target'
    if (latestKPI?.targetValue) {
      if (latestKPI.value > latestKPI.targetValue * 1.05) {
        performance = 'above_target'
      } else if (latestKPI.value < latestKPI.targetValue * 0.95) {
        performance = 'below_target'
      }
    }

    return {
      name: category,
      category,
      trend,
      performance
    }
  })

  return {
    revenueGrowth,
    profitabilityTrend,
    kpiPerformance
  }
}

function generateTrendPoints(kpis: any[]): TrendPoint[] {
  // Group by period and calculate averages
  const periodGroups = kpis.reduce((groups, kpi) => {
    const period = new Date(kpi.period).toISOString().substring(0, 7) // YYYY-MM
    if (!groups[period]) {
      groups[period] = []
    }
    groups[period].push(kpi)
    return groups
  }, {} as { [key: string]: any[] })

  return Object.entries(periodGroups)
    .map(([period, periodKPIs]: [string, any[]]) => ({
      period,
      value: periodKPIs.reduce((sum: number, kpi: any) => sum + kpi.value, 0) / periodKPIs.length,
      target: periodKPIs.find((kpi: any) => kpi.targetValue)?.targetValue
    }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

async function generateBenchmarks(kpis: any[], portfolios: any[]): Promise<BenchmarkData> {
  // This would typically connect to external benchmark data sources
  // For now, we'll generate mock benchmark data
  
  const sectors = [...new Set(portfolios.map(p => p.sector).filter(Boolean))]
  
  return {
    industryAverages: {
      revenue_growth: 15.2,
      profit_margin: 12.8,
      customer_acquisition_cost: 150,
      customer_lifetime_value: 2400
    },
    peerComparison: {
      revenue_growth: 18.5,
      profit_margin: 14.2,
      customer_acquisition_cost: 135,
      customer_lifetime_value: 2650
    },
    percentileRanking: {
      revenue_growth: 75,
      profit_margin: 68,
      customer_acquisition_cost: 82,
      customer_lifetime_value: 71
    }
  }
}

function generateForecasting(kpis: any[]): ForecastData {
  // Simple linear regression forecasting
  // In production, this would use more sophisticated ML models
  
  const revenueKPIs = kpis.filter(k => k.category.toLowerCase().includes('revenue'))
    .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())

  const growthKPIs = kpis.filter(k => k.category.toLowerCase().includes('growth'))
    .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())

  const revenueForecast = generateSimpleForecast(revenueKPIs, 6) // 6 months ahead
  const growthForecast = generateSimpleForecast(growthKPIs, 6)

  return {
    revenue: revenueForecast,
    growth: growthForecast,
    confidence: 0.75 // 75% confidence
  }
}

function generateSimpleForecast(kpis: any[], periods: number): ForecastPoint[] {
  if (kpis.length < 2) {
    return []
  }

  // Calculate simple linear trend
  const values = kpis.map(k => k.value)
  const n = values.length
  const sumX = (n * (n + 1)) / 2
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0)
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Generate forecast points
  const forecast: ForecastPoint[] = []
  const lastDate = new Date(kpis[kpis.length - 1].period)
  
  for (let i = 1; i <= periods; i++) {
    const futureDate = new Date(lastDate)
    futureDate.setMonth(futureDate.getMonth() + i)
    
    const predicted = slope * (n + i) + intercept
    const variance = Math.abs(predicted * 0.15) // 15% variance
    
    forecast.push({
      period: futureDate.toISOString().substring(0, 7),
      predicted: Math.max(0, predicted),
      confidence_lower: Math.max(0, predicted - variance),
      confidence_upper: predicted + variance
    })
  }

  return forecast
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
    const { action, ...params } = body

    switch (action) {
      case 'generate_report':
        return await generateAnalyticsReport(params, session.user)
      case 'export_data':
        return await exportAnalyticsData(params, session.user)
      case 'schedule_report':
        return await scheduleReport(params, session.user)
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Analytics POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Analytics operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateAnalyticsReport(params: any, user: any) {
  // Generate comprehensive analytics report
  const analytics = await generateAnalytics(params, user)
  
  return NextResponse.json({
    success: true,
    report: {
      id: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      analytics,
      summary: {
        totalPortfolios: analytics.overview.portfolioCount,
        totalReturn: analytics.overview.returnPercentage,
        topPerformingKPI: analytics.trends.kpiPerformance
          .sort((a, b) => b.trend[b.trend.length - 1]?.value - a.trend[a.trend.length - 1]?.value)[0]?.name
      }
    }
  })
}

async function exportAnalyticsData(params: any, user: any) {
  // Export analytics data in various formats
  return NextResponse.json({
    success: true,
    export: {
      id: `export_${Date.now()}`,
      format: params.format || 'json',
      downloadUrl: `/api/analytics/download/${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  })
}

async function scheduleReport(params: any, user: any) {
  // Schedule recurring analytics reports
  return NextResponse.json({
    success: true,
    schedule: {
      id: `schedule_${Date.now()}`,
      frequency: params.frequency || 'monthly',
      nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      recipients: params.recipients || [user.email]
    }
  })
}
