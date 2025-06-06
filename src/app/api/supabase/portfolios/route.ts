import { NextRequest, NextResponse } from 'next/server'
import { createClient, getUser, checkOrganizationAccess } from '@/lib/supabase/server'

// GET - Fetch portfolios from Supabase
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeKPIs = searchParams.get('includeKPIs') === 'true'

    // Get authenticated user
    const { user, error: userError } = await getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check organization access if specified
    if (organizationId) {
      const { hasAccess } = await checkOrganizationAccess(user.id, organizationId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to organization' },
          { status: 403 }
        )
      }
    }

    const supabase = createClient()

    // Build query
    let query = supabase
      .from('portfolios')
      .select(`
        *,
        funds (
          id,
          name,
          strategy,
          vintage,
          organization_id
        )
        ${includeKPIs ? `,
        kpis (
          id,
          name,
          category,
          value,
          unit,
          period,
          confidence
        )` : ''}
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by organization if specified
    if (organizationId) {
      query = query.eq('funds.organization_id', organizationId)
    }

    const { data: portfolios, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch portfolios' },
        { status: 500 }
      )
    }

    // Calculate statistics (using safe property access)
    const statistics = {
      totalPortfolios: portfolios.length,
      totalInvestment: portfolios.reduce((sum, p) => sum + ((p as any).investment || 0), 0),
      averageOwnership: portfolios.length > 0
        ? portfolios.reduce((sum, p) => sum + ((p as any).ownership || 0), 0) / portfolios.length
        : 0,
      sectors: Array.from(new Set(portfolios.map(p => (p as any).sector).filter(Boolean))),
      statuses: portfolios.reduce((acc, p) => {
        const status = (p as any).status || 'UNKNOWN'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      data: portfolios,
      statistics,
      count: portfolios.length,
      timestamp: new Date().toISOString(),
      source: 'supabase'
    })

  } catch (error) {
    console.error('Supabase portfolios API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create new portfolio
export async function POST(request: NextRequest) {
  try {
    const { user, error: userError } = await getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      fund_id,
      name,
      sector,
      geography,
      status = 'ACTIVE',
      investment,
      ownership,
      valuation,
      description
    } = body

    // Validation
    if (!fund_id || !name) {
      return NextResponse.json(
        { error: 'Fund ID and name are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if user has access to the fund's organization
    const { data: fund, error: fundError } = await supabase
      .from('funds')
      .select('organization_id')
      .eq('id', fund_id)
      .single()

    if (fundError || !fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    const { hasAccess, role } = await checkOrganizationAccess(user.id, fund.organization_id)
    if (!hasAccess || !['ANALYST', 'MANAGER', 'ADMIN'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Create portfolio
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .insert({
        fund_id,
        name,
        sector,
        geography,
        status,
        investment,
        ownership,
        valuation,
        description
      })
      .select(`
        *,
        funds (
          id,
          name,
          strategy,
          organization_id
        )
      `)
      .single()

    if (error) {
      console.error('Portfolio creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create portfolio' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'CREATE_PORTFOLIO',
        resource: 'portfolios',
        resource_id: portfolio.id,
        details: {
          portfolio_name: name,
          fund_id,
          sector,
          investment
        }
      })

    return NextResponse.json({
      success: true,
      data: portfolio,
      message: 'Portfolio created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Portfolio creation API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update portfolio
export async function PUT(request: NextRequest) {
  try {
    const { user, error: userError } = await getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check access to portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select(`
        *,
        funds (
          organization_id
        )
      `)
      .eq('id', id)
      .single()

    if (portfolioError || !portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    const { hasAccess, role } = await checkOrganizationAccess(user.id, portfolio.funds.organization_id)
    if (!hasAccess || !['ANALYST', 'MANAGER', 'ADMIN'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update portfolio
    const { data: updatedPortfolio, error } = await supabase
      .from('portfolios')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        funds (
          id,
          name,
          strategy,
          organization_id
        )
      `)
      .single()

    if (error) {
      console.error('Portfolio update error:', error)
      return NextResponse.json(
        { error: 'Failed to update portfolio' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'UPDATE_PORTFOLIO',
        resource: 'portfolios',
        resource_id: id,
        details: updateData
      })

    return NextResponse.json({
      success: true,
      data: updatedPortfolio,
      message: 'Portfolio updated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Portfolio update API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
