import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import RBACService from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const fundId = searchParams.get('fundId')
    const portfolioId = searchParams.get('portfolioId')
    const category = searchParams.get('category')
    const timeframe = searchParams.get('timeframe') || '8' // Default to 8 quarters
    const groupBy = searchParams.get('groupBy') || 'quarter'

    // Verify user has access to the organization
    if (organizationId) {
      const userOrg = await prisma.organizationUser.findFirst({
        where: {
          userId: session.user.id,
          organizationId,
        },
      })

      if (!userOrg) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Build where clause
    const whereClause: any = {}
    
    if (organizationId) {
      whereClause.organizationId = organizationId
    } else {
      // Get all organizations user has access to
      const userOrgs = await prisma.organizationUser.findMany({
        where: { userId: session.user.id },
        select: { organizationId: true },
      })
      whereClause.organizationId = {
        in: userOrgs.map(org => org.organizationId),
      }
    }

    if (fundId) whereClause.fundId = fundId
    if (portfolioId) whereClause.portfolioId = portfolioId
    if (category) whereClause.category = category

    // Add time filter
    const timeframePeriods = parseInt(timeframe)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - (timeframePeriods * 3)) // Assuming quarterly data

    whereClause.period = {
      gte: cutoffDate,
    }

    // Fetch KPIs
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

    // Group and aggregate data based on request
    const groupedData = groupKPIData(kpis, groupBy)

    // Get summary statistics
    const summary = await getKPISummary(whereClause)

    return NextResponse.json({
      kpis: groupedData,
      summary,
      metadata: {
        totalRecords: kpis.length,
        timeframe: timeframePeriods,
        groupBy,
        filters: {
          organizationId,
          fundId,
          portfolioId,
          category,
        },
      },
    })

  } catch (error) {
    console.error('KPI API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 }
    )
  }
}

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
  // Get latest period for each KPI category
  const latestKPIs = await prisma.kPI.groupBy({
    by: ['category', 'name'],
    where: whereClause,
    _max: {
      period: true,
    },
  })

  // Get actual values for latest periods
  const summaryPromises = latestKPIs.map(async (group) => {
    const latestKPI = await prisma.kPI.findFirst({
      where: {
        ...whereClause,
        category: group.category,
        name: group.name,
        period: group._max.period,
      },
      include: {
        fund: true,
        portfolio: true,
      },
    })

    return latestKPI
  })

  const summaryKPIs = await Promise.all(summaryPromises)

  // Calculate aggregated metrics
  const summary = {
    totalFunds: await prisma.fund.count({
      where: {
        organizationId: whereClause.organizationId,
      },
    }),
    totalPortfolios: await prisma.portfolio.count({
      where: {
        fund: {
          organizationId: whereClause.organizationId,
        },
      },
    }),
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

  return summary
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { kpis, organizationId } = body

    // Verify user has admin access to the organization
    const userOrg = await prisma.organizationUser.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['ADMIN', 'EDITOR'] },
      },
    })

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

    // Log the creation for audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email!,
        action: 'CREATE',
        entityType: 'KPI',
        entityId: organizationId,
        changes: JSON.stringify({
          count: createdKPIs.length,
          organizationId,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      created: createdKPIs.length,
      kpis: createdKPIs,
    })

  } catch (error) {
    console.error('KPI creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create KPI data' },
      { status: 500 }
    )
  }
}
