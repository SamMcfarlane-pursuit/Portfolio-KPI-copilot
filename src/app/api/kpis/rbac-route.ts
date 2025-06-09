/**
 * RBAC-Protected KPI API Routes
 * Demonstrates proper implementation of role-based access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import RBACService from '@/lib/rbac'

// GET handler with RBAC protection
const getKPIs = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    
    const organizationId = searchParams.get('organizationId')
    const fundId = searchParams.get('fundId')
    const portfolioId = searchParams.get('portfolioId')
    const category = searchParams.get('category')
    const timeframe = searchParams.get('timeframe') || '8'
    const groupBy = searchParams.get('groupBy') || 'quarter'

    // Build where clause with organization access control
    const whereClause: any = {}
    
    if (organizationId) {
      // User access already verified by middleware
      whereClause.organizationId = organizationId
    } else {
      // Get all organizations user has access to
      const userOrgs = await RBACService.getUserOrganizations(user.userId)
      whereClause.organizationId = { in: userOrgs }
    }

    if (fundId) whereClause.fundId = fundId
    if (portfolioId) whereClause.portfolioId = portfolioId
    if (category) whereClause.category = category

    // Add time filter
    const timeframePeriods = parseInt(timeframe)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - (timeframePeriods * 3))
    whereClause.period = { gte: cutoffDate }

    // Fetch KPIs with proper includes
    const kpis = await prisma.kPI.findMany({
      where: whereClause,
      include: {
        fund: {
          select: {
            id: true,
            name: true,
            fundNumber: true,
            strategy: true,
          },
        },
        portfolio: {
          select: {
            id: true,
            name: true,
            sector: true,
            geography: true,
          },
        },
      },
      orderBy: [
        { period: 'desc' },
        { name: 'asc' },
      ],
    })

    // Group and aggregate data
    const groupedData = groupKPIData(kpis, groupBy)
    const summary = await getKPISummary(whereClause)

    // Log access for audit
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VIEW_KPIS',
      resourceType: 'KPI',
      resourceId: organizationId || 'multiple',
      metadata: { 
        count: kpis.length,
        filters: { organizationId, fundId, portfolioId, category }
      }
    })

    return NextResponse.json({
      success: true,
      kpis: groupedData,
      summary,
      metadata: {
        totalRecords: kpis.length,
        timeframe: timeframePeriods,
        groupBy,
        filters: { organizationId, fundId, portfolioId, category },
        userRole: user.organizationRole || user.role,
        permissions: {
          canCreate: RBACService.hasPermission(user, PERMISSIONS.CREATE_KPI),
          canUpdate: RBACService.hasPermission(user, PERMISSIONS.UPDATE_KPI),
          canDelete: RBACService.hasPermission(user, PERMISSIONS.DELETE_KPI),
          canAnalyze: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI)
        }
      },
    })

  } catch (error) {
    console.error('RBAC KPI GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch KPI data',
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST handler with RBAC protection
const createKPIs = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { kpis, organizationId } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required', code: 'ORG_ID_REQUIRED' },
        { status: 400 }
      )
    }

    // Validate and create KPIs
    const createdKPIs = await Promise.all(
      kpis.map(async (kpiData: any) => {
        return await prisma.kPI.create({
          data: {
            name: kpiData.name,
            category: kpiData.category,
            subcategory: kpiData.subcategory,
            value: parseFloat(kpiData.value),
            unit: kpiData.unit,
            period: new Date(kpiData.period),
            periodType: kpiData.periodType || 'quarterly',
            currency: kpiData.currency,
            source: kpiData.source || 'Manual Entry',
            confidence: kpiData.confidence || 0.95,
            notes: kpiData.notes,
            fundId: kpiData.fundId,
            portfolioId: kpiData.portfolioId,
            organizationId,
          },
        })
      })
    )

    // Log creation for audit trail
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'CREATE_KPIS',
      resourceType: 'KPI',
      resourceId: organizationId,
      metadata: {
        count: createdKPIs.length,
        kpiNames: createdKPIs.map(k => k.name)
      }
    })

    return NextResponse.json({
      success: true,
      created: createdKPIs.length,
      kpis: createdKPIs,
      message: `Successfully created ${createdKPIs.length} KPIs`
    })

  } catch (error) {
    console.error('RBAC KPI POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create KPI data',
        code: 'CREATE_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper functions
function groupKPIData(kpis: any[], groupBy: string) {
  const grouped: { [key: string]: any } = {}

  kpis.forEach(kpi => {
    let groupKey: string

    switch (groupBy) {
      case 'quarter':
        groupKey = `${kpi.period.getFullYear()}-Q${Math.ceil((kpi.period.getMonth() + 1) / 3)}`
        break
      case 'fund':
        groupKey = kpi.fund?.name || 'No Fund'
        break
      case 'portfolio':
        groupKey = kpi.portfolio?.name || 'Fund Level'
        break
      case 'category':
        groupKey = kpi.category
        break
      case 'sector':
        groupKey = kpi.portfolio?.sector || 'Fund Level'
        break
      default:
        groupKey = kpi.name
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = []
    }

    grouped[groupKey].push({
      id: kpi.id,
      name: kpi.name,
      category: kpi.category,
      subcategory: kpi.subcategory,
      value: kpi.value,
      unit: kpi.unit,
      currency: kpi.currency,
      period: kpi.period,
      periodType: kpi.periodType,
      confidence: kpi.confidence,
      fund: kpi.fund,
      portfolio: kpi.portfolio,
    })
  })

  return grouped
}

async function getKPISummary(whereClause: any) {
  const latestKPIs = await prisma.kPI.groupBy({
    by: ['category', 'name'],
    where: whereClause,
    _max: { period: true },
  })

  const summaryPromises = latestKPIs.map(async (group) => {
    return await prisma.kPI.findFirst({
      where: {
        ...whereClause,
        category: group.category,
        name: group.name,
        period: group._max.period,
      },
      include: { fund: true, portfolio: true },
    })
  })

  const summaryKPIs = await Promise.all(summaryPromises)

  return {
    totalKPIs: latestKPIs.length,
    latestKPIs: summaryKPIs.filter(Boolean).map(kpi => ({
      name: kpi!.name,
      category: kpi!.category,
      value: kpi!.value,
      unit: kpi!.unit,
      currency: kpi!.currency,
      period: kpi!.period,
      fund: kpi!.fund?.name,
      portfolio: kpi!.portfolio?.name,
    })),
  }
}

// Export RBAC-protected handlers
export const GET = withRBAC(getKPIs, { 
  permission: PERMISSIONS.VIEW_KPI,
  requireOrganization: false // Allow viewing across accessible orgs
})

export const POST = withRBAC(createKPIs, { 
  permission: PERMISSIONS.CREATE_KPI,
  requireOrganization: true
})
