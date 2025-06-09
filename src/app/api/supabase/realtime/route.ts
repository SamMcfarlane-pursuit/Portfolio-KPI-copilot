/**
 * Supabase Real-time Subscription Management API
 * Manages real-time subscriptions with RBAC security
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { supabaseServer } from '@/lib/supabase/server'
import RBACService from '@/lib/rbac'

// GET subscription status and available channels
const getSubscriptionInfo = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    // Get user's accessible organizations
    const userOrgs = await RBACService.getUserOrganizations(user.userId)
    
    // Available subscription channels based on user permissions
    const availableChannels = []

    // Portfolio subscriptions
    if (RBACService.hasPermission(user, PERMISSIONS.VIEW_PORTFOLIO)) {
      availableChannels.push({
        type: 'portfolios',
        description: 'Real-time portfolio updates',
        filters: organizationId ? [`organization_id=eq.${organizationId}`] : userOrgs.map(org => `organization_id=eq.${org}`),
        permissions: ['VIEW_PORTFOLIO']
      })
    }

    // KPI subscriptions
    if (RBACService.hasPermission(user, PERMISSIONS.VIEW_KPI)) {
      availableChannels.push({
        type: 'kpis',
        description: 'Real-time KPI updates',
        filters: organizationId ? [`portfolios.organization_id=eq.${organizationId}`] : userOrgs.map(org => `portfolios.organization_id=eq.${org}`),
        permissions: ['VIEW_KPI']
      })
    }

    // Organization subscriptions
    if (RBACService.hasPermission(user, PERMISSIONS.VIEW_ORGANIZATION)) {
      availableChannels.push({
        type: 'organizations',
        description: 'Real-time organization updates',
        filters: userOrgs.map(org => `id=eq.${org}`),
        permissions: ['VIEW_ORGANIZATION']
      })
    }

    // Document subscriptions (for RAG)
    if (RBACService.hasPermission(user, PERMISSIONS.VIEW_PORTFOLIO)) {
      availableChannels.push({
        type: 'documents',
        description: 'Real-time document updates',
        filters: organizationId ? [`portfolios.organization_id=eq.${organizationId}`] : userOrgs.map(org => `portfolios.organization_id=eq.${org}`),
        permissions: ['VIEW_PORTFOLIO']
      })
    }

    // Log access
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VIEW_REALTIME_CHANNELS',
      resourceType: 'SUBSCRIPTION',
      resourceId: organizationId || 'multiple',
      metadata: {
        availableChannels: availableChannels.length,
        organizationId,
        userOrgs: userOrgs.length
      }
    })

    return NextResponse.json({
      success: true,
      subscriptions: {
        available: availableChannels,
        userOrganizations: userOrgs,
        currentOrganization: organizationId,
        userRole: user.organizationRole || user.role
      },
      realtime: {
        enabled: supabaseServer.isConfigured(),
        status: supabaseServer.isConfigured() ? 'available' : 'not_configured',
        features: {
          portfolioUpdates: RBACService.hasPermission(user, PERMISSIONS.VIEW_PORTFOLIO),
          kpiUpdates: RBACService.hasPermission(user, PERMISSIONS.VIEW_KPI),
          organizationUpdates: RBACService.hasPermission(user, PERMISSIONS.VIEW_ORGANIZATION),
          documentUpdates: RBACService.hasPermission(user, PERMISSIONS.VIEW_PORTFOLIO)
        }
      }
    })

  } catch (error) {
    console.error('Realtime subscription info error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get subscription information',
        code: 'SUBSCRIPTION_INFO_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST create/manage subscription
const manageSubscription = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { action, channelType, organizationId, portfolioId, filters = {} } = body

    // Validation
    if (!action || !channelType) {
      return NextResponse.json(
        { error: 'Action and channel type are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check if Supabase is configured
    if (!supabaseServer.isConfigured()) {
      return NextResponse.json(
        { error: 'Real-time subscriptions not available', code: 'REALTIME_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // Validate permissions for channel type
    const permissionMap = {
      portfolios: PERMISSIONS.VIEW_PORTFOLIO,
      kpis: PERMISSIONS.VIEW_KPI,
      organizations: PERMISSIONS.VIEW_ORGANIZATION,
      documents: PERMISSIONS.VIEW_PORTFOLIO
    }

    const requiredPermission = permissionMap[channelType as keyof typeof permissionMap]
    if (!requiredPermission || !RBACService.hasPermission(user, requiredPermission)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this subscription type', code: 'PERMISSION_DENIED' },
        { status: 403 }
      )
    }

    // Validate organization access
    if (organizationId) {
      const hasAccess = await RBACService.canAccessOrganization(user.userId, organizationId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Organization access denied', code: 'ORG_ACCESS_DENIED' },
          { status: 403 }
        )
      }
    }

    // Generate subscription configuration
    const subscriptionConfig = {
      channelName: `${channelType}-${organizationId || portfolioId || user.userId}`,
      table: channelType,
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      filter: generateSubscriptionFilter(channelType, organizationId, portfolioId, user),
      metadata: {
        userId: user.userId,
        organizationId,
        portfolioId,
        userRole: user.organizationRole || user.role,
        createdAt: new Date().toISOString()
      }
    }

    // Log subscription management
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: `${action.toUpperCase()}_SUBSCRIPTION`,
      resourceType: 'SUBSCRIPTION',
      resourceId: subscriptionConfig.channelName,
      metadata: {
        channelType,
        organizationId,
        portfolioId,
        action
      }
    })

    return NextResponse.json({
      success: true,
      subscription: subscriptionConfig,
      message: `Subscription ${action} successful`,
      instructions: {
        clientSide: `Use supabaseClient.channel('${subscriptionConfig.channelName}').on('postgres_changes', config, callback).subscribe()`,
        config: {
          event: subscriptionConfig.event,
          schema: subscriptionConfig.schema,
          table: subscriptionConfig.table,
          filter: subscriptionConfig.filter
        }
      }
    })

  } catch (error) {
    console.error('Subscription management error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to manage subscription',
        code: 'SUBSCRIPTION_MANAGEMENT_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper function to generate subscription filters
function generateSubscriptionFilter(
  channelType: string, 
  organizationId?: string, 
  portfolioId?: string, 
  user?: any
): string {
  switch (channelType) {
    case 'portfolios':
      if (organizationId) {
        return `organization_id=eq.${organizationId}`
      }
      return `user_id=eq.${user?.userId}`

    case 'kpis':
      if (portfolioId) {
        return `portfolio_id=eq.${portfolioId}`
      }
      if (organizationId) {
        return `portfolios.organization_id=eq.${organizationId}`
      }
      return `portfolios.user_id=eq.${user?.userId}`

    case 'organizations':
      if (organizationId) {
        return `id=eq.${organizationId}`
      }
      return '' // Will be filtered by user's accessible organizations

    case 'documents':
      if (portfolioId) {
        return `portfolio_id=eq.${portfolioId}`
      }
      if (organizationId) {
        return `portfolios.organization_id=eq.${organizationId}`
      }
      return `uploaded_by=eq.${user?.userId}`

    default:
      return ''
  }
}

// GET subscription health check
const getSubscriptionHealth = async (request: NextRequest, context: { user: any }) => {
  try {
    const client = supabaseServer.getClient()
    
    if (!client) {
      return NextResponse.json({
        success: true,
        health: {
          status: 'not_configured',
          realtime: false,
          message: 'Supabase not configured'
        }
      })
    }

    // Test basic connectivity
    const { data, error } = await client
      .from('organizations')
      .select('id')
      .limit(1)

    const health = {
      status: error ? 'error' : 'healthy',
      realtime: !error,
      supabase: {
        configured: true,
        connected: !error,
        error: error?.message
      },
      features: {
        subscriptions: !error,
        vectorSearch: !error,
        fileStorage: !error
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      health
    })

  } catch (error) {
    console.error('Subscription health check error:', error)
    return NextResponse.json({
      success: true,
      health: {
        status: 'error',
        realtime: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

// Export RBAC-protected handlers
export const GET = withRBAC(getSubscriptionInfo, { 
  permission: PERMISSIONS.VIEW_ORGANIZATION
})

export const POST = withRBAC(manageSubscription, { 
  permission: PERMISSIONS.VIEW_ORGANIZATION
})

// Health check endpoint (minimal permissions)
export const HEAD = withRBAC(getSubscriptionHealth, {
  permission: PERMISSIONS.VIEW_ORGANIZATION
})
