/**
 * Supabase Portfolios API with RBAC
 * Real-time portfolio management with enterprise security
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { supabaseServer } from '@/lib/supabase/server'
import RBACService from '@/lib/rbac'

// GET portfolios with real-time Supabase integration
const getPortfolios = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    
    const organizationId = searchParams.get('organizationId')
    const includeKPIs = searchParams.get('includeKPIs') === 'true'
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get Supabase client
    const client = supabaseServer.getClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Supabase not configured', code: 'SUPABASE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // Build query with RBAC filtering
    let query = client
      .from('portfolios')
      .select(`
        *,
        organizations (
          id,
          name,
          industry
        )
        ${includeKPIs ? `,
        kpis (
          id,
          name,
          category,
          value,
          unit,
          period_date,
          confidence_level,
          target_value
        )` : ''}
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply organization filtering
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    } else {
      // Get all organizations user has access to
      const userOrgs = await RBACService.getUserOrganizations(user.userId)
      if (userOrgs.length === 0) {
        return NextResponse.json({
          success: true,
          portfolios: [],
          count: 0,
          message: 'No accessible organizations'
        })
      }
      query = query.in('organization_id', userOrgs)
    }

    const { data: portfolios, error } = await query

    if (error) {
      console.error('Supabase portfolios query error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch portfolios',
          code: 'QUERY_ERROR',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Enrich with user permissions
    const enrichedPortfolios = (portfolios || []).map((portfolio: any) => ({
      ...(portfolio as object),
      permissions: {
        canUpdate: RBACService.hasPermission(user, PERMISSIONS.UPDATE_PORTFOLIO),
        canDelete: RBACService.hasPermission(user, PERMISSIONS.DELETE_PORTFOLIO),
        canCreateKPIs: RBACService.hasPermission(user, PERMISSIONS.CREATE_KPI),
        canViewKPIs: RBACService.hasPermission(user, PERMISSIONS.VIEW_KPI)
      }
    }))

    // Log access for audit
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VIEW_PORTFOLIOS_SUPABASE',
      resourceType: 'PORTFOLIO',
      resourceId: organizationId || 'multiple',
      metadata: {
        count: enrichedPortfolios.length,
        includeKPIs,
        status,
        source: 'supabase'
      }
    })

    return NextResponse.json({
      success: true,
      portfolios: enrichedPortfolios,
      count: enrichedPortfolios.length,
      metadata: {
        source: 'supabase',
        includeKPIs,
        status,
        userRole: user.organizationRole || user.role,
        organizationId
      }
    })

  } catch (error) {
    console.error('Supabase Portfolios GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch portfolios from Supabase',
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST create portfolio in Supabase
const createPortfolio = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    
    const {
      name,
      description,
      organizationId,
      industry,
      stage,
      investmentAmount,
      investmentDate,
      valuation,
      ownershipPercentage,
      status = 'active',
      metadata = {}
    } = body

    // Validation
    if (!name || !organizationId) {
      return NextResponse.json(
        { error: 'Name and organization ID are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Get Supabase client
    const client = supabaseServer.getClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Supabase not configured', code: 'SUPABASE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // Create portfolio in Supabase
    const { data: portfolio, error } = await client
      .from('portfolios')
      .insert([{
        name,
        description,
        organization_id: organizationId,
        user_id: user.userId,
        industry,
        stage,
        investment_amount: investmentAmount,
        investment_date: investmentDate,
        valuation,
        ownership_percentage: ownershipPercentage,
        status,
        metadata: {
          ...metadata,
          createdBy: user.userId,
          createdAt: new Date().toISOString()
        }
      }])
      .select(`
        *,
        organizations (
          id,
          name,
          industry
        )
      `)
      .single()

    if (error) {
      console.error('Supabase portfolio creation error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create portfolio',
          code: 'CREATE_ERROR',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Log creation for audit
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'CREATE_PORTFOLIO_SUPABASE',
      resourceType: 'PORTFOLIO',
      resourceId: portfolio.id,
      metadata: {
        name,
        organizationId,
        industry,
        stage,
        source: 'supabase'
      }
    })

    return NextResponse.json({
      success: true,
      portfolio: {
        ...portfolio,
        permissions: {
          canUpdate: true,
          canDelete: RBACService.hasPermission(user, PERMISSIONS.DELETE_PORTFOLIO),
          canCreateKPIs: RBACService.hasPermission(user, PERMISSIONS.CREATE_KPI)
        }
      },
      message: 'Portfolio created successfully in Supabase'
    }, { status: 201 })

  } catch (error) {
    console.error('Supabase Portfolios POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create portfolio in Supabase',
        code: 'CREATE_ERROR'
      },
      { status: 500 }
    )
  }
}

// Export RBAC-protected handlers
export const GET = withRBAC(getPortfolios, { 
  permission: PERMISSIONS.VIEW_PORTFOLIO
})

export const POST = withRBAC(createPortfolio, { 
  permission: PERMISSIONS.CREATE_PORTFOLIO,
  requireOrganization: true
})
