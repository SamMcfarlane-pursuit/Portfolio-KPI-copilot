import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all portfolios with authentication
export async function GET(request: NextRequest) {
  try {
    // Check authentication for professional use
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const sector = searchParams.get('sector')
    const status = searchParams.get('status')

    // Basic organization access check
    if (organizationId) {
      // In a production app, implement proper RBAC here
      console.log(`User ${session.user.id} accessing organization ${organizationId}`)
    }

    const where: any = {}
    
    if (organizationId) {
      where.fund = {
        organizationId: organizationId
      }
    }
    
    if (sector) {
      where.sector = sector
    }
    
    if (status) {
      where.status = status
    }

    const portfolios = await prisma.portfolio.findMany({
      where,
      include: {
        fund: {
          include: {
            organization: true
          }
        },
        kpis: {
          orderBy: { period: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate performance metrics for each portfolio
    const portfoliosWithMetrics = portfolios.map(portfolio => {
      const revenueKPIs = portfolio.kpis.filter(kpi => kpi.category === 'revenue')
      const profitabilityKPIs = portfolio.kpis.filter(kpi => kpi.category === 'profitability')
      
      let growthRate = 0
      let healthScore = 50
      
      // Calculate growth rate
      if (revenueKPIs.length >= 2) {
        const latest = revenueKPIs[0].value
        const previous = revenueKPIs[1].value
        growthRate = ((latest - previous) / previous) * 100
        
        // Adjust health score based on growth
        if (growthRate > 20) healthScore += 30
        else if (growthRate > 10) healthScore += 20
        else if (growthRate > 0) healthScore += 10
        else if (growthRate < -10) healthScore -= 20
      }
      
      // Factor in profitability
      if (profitabilityKPIs.length > 0) {
        const avgMargin = profitabilityKPIs.reduce((sum, kpi) => sum + kpi.value, 0) / profitabilityKPIs.length
        if (avgMargin > 20) healthScore += 20
        else if (avgMargin > 10) healthScore += 10
        else if (avgMargin < 0) healthScore -= 15
      }
      
      healthScore = Math.max(0, Math.min(100, healthScore))
      
      return {
        ...portfolio,
        metrics: {
          latestRevenue: revenueKPIs[0]?.value || 0,
          growthRate: growthRate,
          healthScore: Math.round(healthScore),
          kpiCount: portfolio.kpis.length,
          lastUpdated: portfolio.kpis[0]?.period || portfolio.updatedAt
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: portfoliosWithMetrics,
      count: portfoliosWithMetrics.length
    })

  } catch (error) {
    console.error('Error fetching portfolios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    )
  }
}

// POST - Create new portfolio company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, sector, geography, investment, ownership, description, status = 'ACTIVE' } = body

    // Validation
    if (!name || !sector || !investment) {
      return NextResponse.json(
        { error: 'Name, sector, and investment are required' },
        { status: 400 }
      )
    }

    // Get default organization and fund
    let organization = await prisma.organization.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!organization) {
      // Create default organization if none exists
      organization = await prisma.organization.create({
        data: {
          name: 'Default Portfolio Organization',
          slug: 'default-org',
          description: 'Default organization for portfolio management'
        }
      })
    }

    let fund = await prisma.fund.findFirst({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!fund) {
      // Create default fund if none exists
      fund = await prisma.fund.create({
        data: {
          name: 'Growth Fund I',
          fundNumber: 'GF-I',
          vintage: new Date().getFullYear(),
          strategy: 'Growth Equity',
          totalSize: 1000000000, // $1B default
          currency: 'USD',
          organizationId: organization.id
        }
      })
    }

    // Create portfolio company
    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        sector,
        geography: geography || 'North America',
        status,
        investment: parseFloat(investment),
        ownership: parseFloat(ownership) || 0,
        fundId: fund.id
      },
      include: {
        fund: {
          include: {
            organization: true
          }
        }
      }
    })

    // Create initial KPIs with placeholder data
    const initialKPIs = [
      {
        name: 'Initial Investment',
        category: 'financial',
        value: parseFloat(investment),
        unit: 'USD',
        period: new Date(),
        periodType: 'point_in_time',
        source: 'Investment Record',
        confidence: 1.0,
        notes: 'Initial investment amount',
        portfolioId: portfolio.id,
        fundId: fund.id,
        organizationId: organization.id
      }
    ]

    await prisma.kPI.createMany({
      data: initialKPIs
    })

    // Log successful creation
    console.log(`Portfolio created: ${portfolio.id} for organization: ${organization.id}`)

    // Real data integration would go here in production

    return NextResponse.json({
      success: true,
      data: portfolio,
      message: 'Portfolio company created successfully'
    })

  } catch (error) {
    console.error('Error creating portfolio:', error)

    return NextResponse.json(
      { error: 'Failed to create portfolio company' },
      { status: 500 }
    )
  }
}

// PUT - Update portfolio company
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.portfolio.update({
      where: { id },
      data: updateData,
      include: {
        fund: {
          include: {
            organization: true
          }
        },
        kpis: {
          orderBy: { period: 'desc' },
          take: 5
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: portfolio,
      message: 'Portfolio company updated successfully'
    })

  } catch (error) {
    console.error('Error updating portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to update portfolio company' },
      { status: 500 }
    )
  }
}

// DELETE - Delete portfolio company
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    // Delete related KPIs first
    await prisma.kPI.deleteMany({
      where: { portfolioId: id }
    })

    // Delete portfolio company
    await prisma.portfolio.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Portfolio company deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to delete portfolio company' },
      { status: 500 }
    )
  }
}
