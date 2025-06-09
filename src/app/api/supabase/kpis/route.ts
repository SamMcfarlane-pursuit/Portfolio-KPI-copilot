/**
 * Supabase KPIs API with RBAC
 * Real-time KPI management with enterprise security
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { supabaseServer } from '@/lib/supabase/server'
import RBACService from '@/lib/rbac'

// GET KPIs with real-time Supabase integration
const getKPIs = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    
    const portfolioId = searchParams.get('portfolioId')
    const organizationId = searchParams.get('organizationId')
    const category = searchParams.get('category')
    const timeframe = parseInt(searchParams.get('timeframe') || '12') // months
    const limit = parseInt(searchParams.get('limit') || '100')

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
      .from('kpis')
      .select(`
        *,
        portfolios (
          id,
          name,
          industry,
          organization_id,
          organizations (
            id,
            name
          )
        )
      `)
      .order('period_date', { ascending: false })
      .limit(limit)

    // Apply filters
    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // Time filter
    if (timeframe > 0) {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - timeframe)
      query = query.gte('period_date', cutoffDate.toISOString().split('T')[0])
    }

    // Organization access control
    if (organizationId) {
      query = query.eq('portfolios.organization_id', organizationId)
    } else {
      // Get all organizations user has access to
      const userOrgs = await RBACService.getUserOrganizations(user.userId)
      if (userOrgs.length === 0) {
        return NextResponse.json({
          success: true,
          kpis: [],
          count: 0,
          message: 'No accessible organizations'
        })
      }
      query = query.in('portfolios.organization_id', userOrgs)
    }

    const { data: kpis, error } = await query

    if (error) {
      console.error('Supabase KPIs query error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch KPIs',
          code: 'QUERY_ERROR',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Enrich with user permissions and analytics
    const enrichedKPIs = kpis?.map(kpi => ({
      ...kpi,
      permissions: {
        canUpdate: RBACService.hasPermission(user, PERMISSIONS.UPDATE_KPI),
        canDelete: RBACService.hasPermission(user, PERMISSIONS.DELETE_KPI),
        canAnalyze: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI)
      },
      analytics: {
        trend: calculateTrend(kpi.value, kpi.target_value),
        confidence: kpi.confidence_level || 100,
        isTarget: kpi.target_value ? kpi.value >= kpi.target_value : null
      }
    })) || []

    // Calculate summary statistics
    const summary = calculateKPISummary(enrichedKPIs)

    // Log access for audit
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VIEW_KPIS_SUPABASE',
      resourceType: 'KPI',
      resourceId: portfolioId || organizationId || 'multiple',
      metadata: {
        count: enrichedKPIs.length,
        category,
        timeframe,
        source: 'supabase'
      }
    })

    return NextResponse.json({
      success: true,
      kpis: enrichedKPIs,
      summary,
      count: enrichedKPIs.length,
      metadata: {
        source: 'supabase',
        timeframe,
        category,
        userRole: user.organizationRole || user.role,
        organizationId,
        portfolioId
      }
    })

  } catch (error) {
    console.error('Supabase KPIs GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch KPIs from Supabase',
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST create KPI in Supabase
const createKPI = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    
    const {
      portfolioId,
      name,
      category,
      value,
      unit,
      targetValue,
      periodType = 'monthly',
      periodDate,
      description,
      calculationMethod,
      dataSource,
      confidenceLevel = 100,
      isBenchmark = false,
      metadata = {}
    } = body

    // Validation
    if (!portfolioId || !name || !category || value === undefined || !periodDate) {
      return NextResponse.json(
        { error: 'Portfolio ID, name, category, value, and period date are required', code: 'VALIDATION_ERROR' },
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

    // Create KPI in Supabase
    const { data: kpi, error } = await client
      .from('kpis')
      .insert([{
        portfolio_id: portfolioId,
        name,
        category,
        value: parseFloat(value),
        unit,
        target_value: targetValue ? parseFloat(targetValue) : null,
        period_type: periodType,
        period_date: periodDate,
        description,
        calculation_method: calculationMethod,
        data_source: dataSource || 'Manual Entry',
        confidence_level: confidenceLevel,
        is_benchmark: isBenchmark,
        metadata: {
          ...metadata,
          createdBy: user.userId,
          createdAt: new Date().toISOString()
        }
      }])
      .select(`
        *,
        portfolios (
          id,
          name,
          organization_id,
          organizations (
            id,
            name
          )
        )
      `)
      .single()

    if (error) {
      console.error('Supabase KPI creation error:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create KPI',
          code: 'CREATE_ERROR',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Log creation for audit
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'CREATE_KPI_SUPABASE',
      resourceType: 'KPI',
      resourceId: kpi.id,
      metadata: {
        name,
        category,
        portfolioId,
        value,
        source: 'supabase'
      }
    })

    return NextResponse.json({
      success: true,
      kpi: {
        ...kpi,
        permissions: {
          canUpdate: true,
          canDelete: RBACService.hasPermission(user, PERMISSIONS.DELETE_KPI),
          canAnalyze: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI)
        },
        analytics: {
          trend: calculateTrend(kpi.value, kpi.target_value),
          confidence: kpi.confidence_level,
          isTarget: kpi.target_value ? kpi.value >= kpi.target_value : null
        }
      },
      message: 'KPI created successfully in Supabase'
    }, { status: 201 })

  } catch (error) {
    console.error('Supabase KPIs POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create KPI in Supabase',
        code: 'CREATE_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateTrend(value: number, targetValue?: number): string {
  if (!targetValue) return 'neutral'
  
  const ratio = value / targetValue
  if (ratio >= 1.1) return 'positive'
  if (ratio <= 0.9) return 'negative'
  return 'neutral'
}

function calculateKPISummary(kpis: any[]) {
  const categories = Array.from(new Set(kpis.map(k => k.category)))
  const totalKPIs = kpis.length
  const withTargets = kpis.filter(k => k.target_value).length
  const meetingTargets = kpis.filter(k => k.analytics?.isTarget === true).length
  
  return {
    totalKPIs,
    categories: categories.length,
    withTargets,
    meetingTargets,
    targetAchievementRate: withTargets > 0 ? (meetingTargets / withTargets * 100).toFixed(1) : '0',
    categoryBreakdown: categories.map(category => ({
      category,
      count: kpis.filter(k => k.category === category).length
    }))
  }
}

// Export RBAC-protected handlers
export const GET = withRBAC(getKPIs, { 
  permission: PERMISSIONS.VIEW_KPI
})

export const POST = withRBAC(createKPI, { 
  permission: PERMISSIONS.CREATE_KPI
})
