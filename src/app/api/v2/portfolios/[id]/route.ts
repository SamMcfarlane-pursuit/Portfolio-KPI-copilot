/**
 * Individual Portfolio API v2
 * Enhanced single portfolio operations with comprehensive data
 */

import { NextRequest } from 'next/server'
import { apiGateway, APIError, APIErrorCode } from '@/lib/api/gateway'
import { validationSchemas } from '@/lib/api/validation'
import { PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import { copilotService } from '@/lib/ai/copilot-service'
import RBACService from '@/lib/rbac'

// GET /api/v2/portfolios/[id] - Get portfolio details
export const GET = apiGateway.createHandler(
  async (request, context, config) => {
    const { searchParams } = new URL(request.url)
    const portfolioId = context.path.split('/').pop()!
    
    const includeKPIs = searchParams.get('includeKPIs') === 'true'
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'
    const includeInsights = searchParams.get('includeInsights') === 'true'
    const timeframe = searchParams.get('timeframe') || '30d'
    
    // Get portfolio with comprehensive data
    const portfolio = await hybridData.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        organization: true,
        fund: true,
        kpis: includeKPIs ? {
          orderBy: { period: 'desc' },
          take: 50
        } : false,
        _count: {
          select: { 
            kpis: true,
            documents: true
          }
        }
      }
    })
    
    if (!portfolio) {
      throw new APIError(APIErrorCode.RESOURCE_NOT_FOUND, 'Portfolio not found')
    }
    
    // Check access permissions
    if (!RBACService.canAccessOrganization(context.user, portfolio.organizationId)) {
      throw new APIError(APIErrorCode.FORBIDDEN, 'Access denied to this portfolio')
    }
    
    // Build comprehensive response
    const response: any = {
      portfolio: {
        ...portfolio,
        permissions: {
          canEdit: RBACService.hasPermission(context.user, PERMISSIONS.MANAGE_PORTFOLIO),
          canDelete: RBACService.hasPermission(context.user, PERMISSIONS.DELETE_PORTFOLIO),
          canViewKPIs: RBACService.hasPermission(context.user, PERMISSIONS.VIEW_KPI),
          canManageKPIs: RBACService.hasPermission(context.user, PERMISSIONS.MANAGE_KPI),
          canExport: RBACService.hasPermission(context.user, PERMISSIONS.EXPORT_DATA)
        }
      }
    }
    
    // Add analytics if requested
    if (includeAnalytics) {
      response.analytics = await getComprehensiveAnalytics(portfolioId, timeframe)
    }
    
    // Add AI insights if requested
    if (includeInsights) {
      response.insights = await getAIInsights(portfolioId, context.user)
    }
    
    // Add KPI summary
    if (includeKPIs && portfolio.kpis) {
      response.kpiSummary = await generateKPISummary(portfolio.kpis)
    }
    
    // Add recent activity
    response.recentActivity = await getRecentActivity(portfolioId, 10)
    
    // Add performance score
    response.performanceScore = await calculatePerformanceScore(portfolioId)
    
    return {
      success: true,
      data: response
    }
  },
  {
    requireAuth: true,
    permissions: [PERMISSIONS.VIEW_PORTFOLIO],
    cache: { ttl: 300 }, // 5 minutes
    rateLimit: { requests: 500, window: 3600 }
  }
)

// PUT /api/v2/portfolios/[id] - Update portfolio
export const PUT = apiGateway.createHandler(
  async (request, context) => {
    const portfolioId = context.path.split('/').pop()!
    const body = await request.json()
    const updateData = validationSchemas.portfolio.update.parse(body)
    
    // Check if portfolio exists and user has access
    const existingPortfolio = await hybridData.portfolio.findUnique({
      where: { id: portfolioId },
      select: { id: true, organizationId: true, name: true }
    })
    
    if (!existingPortfolio) {
      throw new APIError(APIErrorCode.RESOURCE_NOT_FOUND, 'Portfolio not found')
    }
    
    if (!RBACService.canAccessOrganization(context.user, existingPortfolio.organizationId)) {
      throw new APIError(APIErrorCode.FORBIDDEN, 'Access denied to this portfolio')
    }
    
    // Update portfolio
    const updatedPortfolio = await hybridData.portfolio.update({
      where: { id: portfolioId },
      data: {
        ...updateData,
        updatedBy: context.user.userId,
        updatedAt: new Date()
      },
      include: {
        organization: true,
        fund: true,
        _count: {
          select: { kpis: true }
        }
      }
    })
    
    // Log audit event
    await RBACService.logAuditEvent({
      userId: context.user.userId,
      action: 'PORTFOLIO_UPDATED',
      resourceType: 'PORTFOLIO',
      resourceId: portfolioId,
      metadata: {
        changes: updateData,
        previousName: existingPortfolio.name,
        newName: updatedPortfolio.name
      }
    })
    
    // Generate update insights
    const insights = await generateUpdateInsights(existingPortfolio, updatedPortfolio)
    
    return {
      success: true,
      data: {
        portfolio: {
          ...updatedPortfolio,
          permissions: {
            canEdit: true,
            canDelete: RBACService.hasPermission(context.user, PERMISSIONS.DELETE_PORTFOLIO),
            canViewKPIs: true,
            canManageKPIs: true
          }
        },
        insights,
        changes: Object.keys(updateData)
      }
    }
  },
  {
    requireAuth: true,
    permissions: [PERMISSIONS.MANAGE_PORTFOLIO],
    validation: {
      body: validationSchemas.portfolio.update
    },
    rateLimit: { requests: 200, window: 3600 }
  }
)

// DELETE /api/v2/portfolios/[id] - Delete portfolio
export const DELETE = apiGateway.createHandler(
  async (request, context) => {
    const portfolioId = context.path.split('/').pop()!
    
    // Check if portfolio exists and user has access
    const portfolio = await hybridData.portfolio.findUnique({
      where: { id: portfolioId },
      select: { 
        id: true, 
        organizationId: true, 
        name: true,
        _count: {
          select: { kpis: true }
        }
      }
    })
    
    if (!portfolio) {
      throw new APIError(APIErrorCode.RESOURCE_NOT_FOUND, 'Portfolio not found')
    }
    
    if (!RBACService.canAccessOrganization(context.user, portfolio.organizationId)) {
      throw new APIError(APIErrorCode.FORBIDDEN, 'Access denied to this portfolio')
    }
    
    // Check if portfolio has KPIs (might want to prevent deletion)
    if (portfolio._count.kpis > 0) {
      const force = new URL(request.url).searchParams.get('force') === 'true'
      if (!force) {
        throw new APIError(
          APIErrorCode.BUSINESS_RULE_VIOLATION,
          `Portfolio has ${portfolio._count.kpis} KPIs. Use ?force=true to delete anyway.`
        )
      }
    }
    
    // Delete portfolio (cascade will handle KPIs)
    await hybridData.portfolio.delete({
      where: { id: portfolioId }
    })
    
    // Log audit event
    await RBACService.logAuditEvent({
      userId: context.user.userId,
      action: 'PORTFOLIO_DELETED',
      resourceType: 'PORTFOLIO',
      resourceId: portfolioId,
      metadata: {
        portfolioName: portfolio.name,
        kpiCount: portfolio._count.kpis
      }
    })
    
    return {
      success: true,
      data: {
        deleted: true,
        portfolioId,
        portfolioName: portfolio.name,
        kpisDeleted: portfolio._count.kpis
      }
    }
  },
  {
    requireAuth: true,
    permissions: [PERMISSIONS.DELETE_PORTFOLIO],
    rateLimit: { requests: 50, window: 3600 }
  }
)

// Helper functions
async function getComprehensiveAnalytics(portfolioId: string, timeframe: string) {
  const [kpiTrends, performance, benchmarks, riskMetrics] = await Promise.all([
    getKPITrends(portfolioId, timeframe),
    getPerformanceMetrics(portfolioId, timeframe),
    getBenchmarkComparisons(portfolioId),
    getRiskMetrics(portfolioId)
  ])
  
  return {
    kpiTrends,
    performance,
    benchmarks,
    riskMetrics,
    summary: {
      overallScore: 85,
      trend: 'positive',
      keyInsights: [
        'Revenue growth accelerating',
        'Operational efficiency improving',
        'Risk profile stable'
      ]
    }
  }
}

async function getAIInsights(portfolioId: string, user: any) {
  try {
    const analysis = await copilotService.analyzePortfolio(
      portfolioId,
      'Provide comprehensive portfolio analysis with insights and recommendations'
    )
    
    return {
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
      riskFactors: analysis.riskFactors || [],
      opportunities: analysis.opportunities || [],
      confidence: 85,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('AI insights error:', error)
    return {
      insights: ['AI insights temporarily unavailable'],
      recommendations: ['Review portfolio performance manually'],
      riskFactors: [],
      opportunities: [],
      confidence: 0,
      generatedAt: new Date().toISOString(),
      error: 'AI service unavailable'
    }
  }
}

async function generateKPISummary(kpis: any[]) {
  const categories = kpis.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = { count: 0, latest: null }
    }
    acc[kpi.category].count++
    if (!acc[kpi.category].latest || kpi.period > acc[kpi.category].latest.period) {
      acc[kpi.category].latest = kpi
    }
    return acc
  }, {})
  
  return {
    totalKPIs: kpis.length,
    categories: Object.keys(categories).length,
    categoryBreakdown: categories,
    latestUpdate: kpis.length > 0 ? Math.max(...kpis.map(k => new Date(k.period).getTime())) : null
  }
}

async function getRecentActivity(portfolioId: string, limit: number) {
  // Mock recent activity - would implement real activity tracking
  return [
    {
      id: '1',
      type: 'kpi_updated',
      description: 'Revenue KPI updated',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      user: 'John Doe'
    },
    {
      id: '2',
      type: 'analysis_generated',
      description: 'AI analysis completed',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      user: 'AI System'
    }
  ]
}

async function calculatePerformanceScore(portfolioId: string) {
  // Mock performance score calculation
  return {
    overall: 85,
    breakdown: {
      financial: 88,
      operational: 82,
      growth: 87,
      risk: 83
    },
    trend: 'improving',
    lastCalculated: new Date().toISOString()
  }
}

async function getKPITrends(portfolioId: string, timeframe: string) {
  // Mock KPI trends
  return {
    revenue: { trend: 'up', change: 0.15 },
    growth: { trend: 'up', change: 0.08 },
    margin: { trend: 'stable', change: 0.02 }
  }
}

async function getPerformanceMetrics(portfolioId: string, timeframe: string) {
  return {
    roi: 0.24,
    irr: 0.18,
    multiple: 2.4,
    volatility: 0.12
  }
}

async function getBenchmarkComparisons(portfolioId: string) {
  return {
    industry: { score: 1.15, percentile: 75 },
    peer: { score: 1.08, percentile: 68 },
    market: { score: 1.22, percentile: 82 }
  }
}

async function getRiskMetrics(portfolioId: string) {
  return {
    overall: 'medium',
    factors: [
      { name: 'Market Risk', level: 'medium', score: 0.6 },
      { name: 'Operational Risk', level: 'low', score: 0.3 },
      { name: 'Financial Risk', level: 'medium', score: 0.5 }
    ]
  }
}

async function generateUpdateInsights(before: any, after: any) {
  const insights = []
  
  if (before.name !== after.name) {
    insights.push({
      type: 'change',
      description: `Portfolio renamed from "${before.name}" to "${after.name}"`
    })
  }
  
  return insights
}
