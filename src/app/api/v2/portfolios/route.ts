/**
 * Portfolio API v2
 * Enhanced portfolio management with standardized responses and advanced features
 */

import { NextRequest } from 'next/server'
import { apiGateway } from '@/lib/api/gateway'
import { validationSchemas } from '@/lib/api/validation'
import { PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import RBACService from '@/lib/rbac'

// GET /api/v2/portfolios - List portfolios with advanced filtering
export const GET = apiGateway.createHandler(
  async (request, context) => {
    const { searchParams } = new URL(request.url)
    const query = validationSchemas.portfolio.query.parse(
      Object.fromEntries(searchParams.entries())
    )
    
    // Build filters
    const filters: any = {}
    if (query.organizationId) filters.organizationId = query.organizationId
    if (query.fundId) filters.fundId = query.fundId
    if (query.sector) filters.sector = query.sector
    if (query.status) filters.status = query.status
    if (query.search) {
      filters.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    // Apply date filters
    if (query.dateFrom || query.dateTo) {
      filters.createdAt = {}
      if (query.dateFrom) filters.createdAt.gte = new Date(query.dateFrom)
      if (query.dateTo) filters.createdAt.lte = new Date(query.dateTo)
    }
    
    // Get portfolios with pagination
    const [portfolios, total] = await Promise.all([
      hybridData.portfolio.findMany({
        where: filters,
        include: {
          organization: true,
          fund: query.includeKPIs ? {
            include: { kpis: true }
          } : true,
          kpis: query.includeKPIs ? {
            take: 10,
            orderBy: { period: 'desc' }
          } : false,
          _count: {
            select: { kpis: true }
          }
        },
        orderBy: query.sortBy ? {
          [query.sortBy]: query.sortOrder
        } : { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      hybridData.portfolio.count({ where: filters })
    ])
    
    // Enhance portfolios with analytics if requested
    const enhancedPortfolios = await Promise.all(
      portfolios.map(async (portfolio) => {
        const enhanced = {
          ...portfolio,
          analytics: query.includeAnalytics ? await getPortfolioAnalytics(portfolio.id) : undefined,
          permissions: {
            canEdit: RBACService.hasPermission(context.user, PERMISSIONS.MANAGE_PORTFOLIO),
            canDelete: RBACService.hasPermission(context.user, PERMISSIONS.DELETE_PORTFOLIO),
            canViewKPIs: RBACService.hasPermission(context.user, PERMISSIONS.VIEW_KPI),
            canManageKPIs: RBACService.hasPermission(context.user, PERMISSIONS.MANAGE_KPI)
          }
        }
        
        return enhanced
      })
    )
    
    // Calculate pagination metadata
    const hasNext = query.page * query.limit < total
    const hasPrev = query.page > 1
    
    return {
      success: true,
      data: {
        portfolios: enhancedPortfolios,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          hasNext,
          hasPrev,
          totalPages: Math.ceil(total / query.limit)
        },
        filters: {
          applied: Object.keys(filters).length > 0,
          organizationId: query.organizationId,
          sector: query.sector,
          status: query.status,
          search: query.search
        },
        summary: {
          totalPortfolios: total,
          activePortfolios: await hybridData.portfolio.count({
            where: { ...filters, status: 'active' }
          }),
          sectors: await getPortfolioSectors(filters),
          averageInvestment: await getAverageInvestment(filters)
        }
      }
    }
  },
  {
    requireAuth: true,
    permissions: [PERMISSIONS.VIEW_PORTFOLIO],
    validation: {
      query: validationSchemas.portfolio.query
    },
    cache: { ttl: 300 }, // 5 minutes
    rateLimit: { requests: 1000, window: 3600 }
  }
)

// POST /api/v2/portfolios - Create new portfolio
export const POST = apiGateway.createHandler(
  async (request, context) => {
    const body = await request.json()
    const portfolioData = validationSchemas.portfolio.create.parse(body)
    
    // Check if user can create portfolios in this organization
    if (!RBACService.canAccessOrganization(context.user, portfolioData.organizationId)) {
      throw new Error('Cannot create portfolio in this organization')
    }
    
    // Create portfolio
    const portfolio = await hybridData.portfolio.create({
      data: {
        ...portfolioData,
        createdBy: context.user.userId,
        updatedBy: context.user.userId
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
      action: 'PORTFOLIO_CREATED',
      resourceType: 'PORTFOLIO',
      resourceId: portfolio.id,
      metadata: {
        portfolioName: portfolio.name,
        sector: portfolio.sector,
        investment: portfolio.investment
      }
    })
    
    // Generate initial insights
    const insights = await generateInitialInsights(portfolio)
    
    return {
      success: true,
      data: {
        portfolio: {
          ...portfolio,
          permissions: {
            canEdit: true,
            canDelete: RBACService.hasPermission(context.user, PERMISSIONS.DELETE_PORTFOLIO),
            canViewKPIs: true,
            canManageKPIs: true
          }
        },
        insights,
        nextSteps: [
          'Add key performance indicators (KPIs)',
          'Set up performance targets',
          'Configure monitoring alerts',
          'Invite team members'
        ]
      }
    }
  },
  {
    requireAuth: true,
    permissions: [PERMISSIONS.CREATE_PORTFOLIO],
    validation: {
      body: validationSchemas.portfolio.create
    },
    rateLimit: { requests: 100, window: 3600 }
  }
)

// Helper functions
async function getPortfolioAnalytics(portfolioId: string) {
  const [kpiCount, latestKPIs, performance] = await Promise.all([
    hybridData.kpi.count({ where: { portfolioId } }),
    hybridData.kpi.findMany({
      where: { portfolioId },
      orderBy: { period: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        value: true,
        unit: true,
        category: true,
        period: true
      }
    }),
    calculatePortfolioPerformance(portfolioId)
  ])
  
  return {
    kpiCount,
    latestKPIs,
    performance,
    lastUpdated: new Date().toISOString()
  }
}

async function calculatePortfolioPerformance(portfolioId: string) {
  // Mock performance calculation - would implement real logic
  return {
    score: 85,
    trend: 'positive',
    growthRate: 0.24,
    riskLevel: 'medium',
    benchmarkComparison: 1.15
  }
}

async function getPortfolioSectors(filters: any) {
  const sectors = await hybridData.portfolio.groupBy({
    by: ['sector'],
    where: filters,
    _count: {
      sector: true
    },
    orderBy: {
      _count: {
        sector: 'desc'
      }
    }
  })
  
  return sectors.map((s: any) => ({
    sector: s.sector,
    count: s._count.sector
  }))
}

async function getAverageInvestment(filters: any) {
  const result = await hybridData.portfolio.aggregate({
    where: filters,
    _avg: {
      investment: true
    }
  })
  
  return result._avg.investment || 0
}

async function generateInitialInsights(portfolio: any) {
  return [
    {
      type: 'recommendation',
      title: 'Set Up KPI Tracking',
      description: `Start tracking key metrics for ${portfolio.name} to monitor performance and identify optimization opportunities.`,
      priority: 'high',
      actionable: true
    },
    {
      type: 'insight',
      title: 'Sector Analysis',
      description: `${portfolio.sector} sector companies typically focus on growth metrics like revenue growth rate and customer acquisition cost.`,
      priority: 'medium',
      actionable: false
    }
  ]
}
