/**
 * RBAC Middleware Helpers
 * Provides easy-to-use middleware functions for API route protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import RBACService, { Permission, PERMISSIONS } from '@/lib/rbac'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
    organizationId?: string
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // Add user to request context (conceptually - Next.js doesn't allow request mutation)
  return null // Continue processing
}

/**
 * Middleware to require specific permission
 */
export async function requirePermission(
  permission: Permission,
  organizationId?: string
): Promise<NextResponse | { user: any } | null> {
  try {
    const userContext = await RBACService.requirePermission(permission, organizationId)
    return { user: userContext }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Permission denied'
    
    if (message.includes('Authentication required')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
    
    if (message.includes('Organization access denied')) {
      return NextResponse.json(
        { error: 'Organization access denied', code: 'ORG_ACCESS_DENIED' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: message, code: 'PERMISSION_DENIED' },
      { status: 403 }
    )
  }
}

/**
 * Middleware to require organization access
 */
export async function requireOrganizationAccess(
  organizationId: string
): Promise<NextResponse | { user: any } | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  const hasAccess = await RBACService.canAccessOrganization(session.user.id, organizationId)
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Organization access denied', code: 'ORG_ACCESS_DENIED' },
      { status: 403 }
    )
  }

  const userContext = await RBACService.getUserContext(session.user.id, organizationId)
  return { user: userContext }
}

/**
 * Middleware to require portfolio access
 */
export async function requirePortfolioAccess(
  portfolioId: string
): Promise<NextResponse | { user: any } | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  const hasAccess = await RBACService.canAccessPortfolio(session.user.id, portfolioId)
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Portfolio access denied', code: 'PORTFOLIO_ACCESS_DENIED' },
      { status: 403 }
    )
  }

  const userContext = await RBACService.getUserContext(session.user.id)
  return { user: userContext }
}

/**
 * Helper to extract organization ID from request
 */
export function getOrganizationIdFromRequest(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url)
  return searchParams.get('organizationId') || 
         searchParams.get('orgId') || 
         null
}

/**
 * Helper to extract portfolio ID from request
 */
export function getPortfolioIdFromRequest(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url)
  const pathSegments = request.nextUrl.pathname.split('/')
  
  // Check query params first
  const portfolioId = searchParams.get('portfolioId') || searchParams.get('id')
  if (portfolioId) return portfolioId
  
  // Check path segments for portfolio ID
  const portfolioIndex = pathSegments.indexOf('portfolios')
  if (portfolioIndex !== -1 && pathSegments[portfolioIndex + 1]) {
    return pathSegments[portfolioIndex + 1]
  }
  
  return null
}

/**
 * Comprehensive middleware wrapper for API routes
 */
export function withRBAC(
  handler: (request: NextRequest, context: { user: any }) => Promise<NextResponse>,
  options: {
    permission?: Permission
    requireOrganization?: boolean
    requirePortfolio?: boolean
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Step 1: Check authentication
      const authResult = await requireAuth(request)
      if (authResult) return authResult

      // Step 2: Get organization ID if required
      let organizationId: string | undefined
      if (options.requireOrganization) {
        organizationId = getOrganizationIdFromRequest(request) || undefined
        if (!organizationId) {
          return NextResponse.json(
            { error: 'Organization ID required', code: 'ORG_ID_REQUIRED' },
            { status: 400 }
          )
        }
      }

      // Step 3: Check organization access
      let userContext: any
      if (organizationId) {
        const orgResult = await requireOrganizationAccess(organizationId)
        if (orgResult instanceof NextResponse) return orgResult
        userContext = orgResult?.user
      }

      // Step 4: Check portfolio access if required
      if (options.requirePortfolio) {
        const portfolioId = getPortfolioIdFromRequest(request)
        if (!portfolioId) {
          return NextResponse.json(
            { error: 'Portfolio ID required', code: 'PORTFOLIO_ID_REQUIRED' },
            { status: 400 }
          )
        }
        
        const portfolioResult = await requirePortfolioAccess(portfolioId)
        if (portfolioResult instanceof NextResponse) return portfolioResult
        userContext = portfolioResult?.user
      }

      // Step 5: Check specific permission if required
      if (options.permission) {
        const permResult = await requirePermission(options.permission, organizationId)
        if (permResult instanceof NextResponse) return permResult
        userContext = permResult?.user
      }

      // Step 6: Call the actual handler with user context
      return await handler(request, { user: userContext })

    } catch (error) {
      console.error('RBAC middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
}

/**
 * Quick middleware functions for common use cases
 */
export const withAuth = (handler: any) => withRBAC(handler)

export const withOrgAccess = (handler: any) => 
  withRBAC(handler, { requireOrganization: true })

export const withPortfolioAccess = (handler: any) => 
  withRBAC(handler, { requirePortfolio: true })

export const withViewPermission = (handler: any) => 
  withRBAC(handler, { permission: PERMISSIONS.VIEW_KPI })

export const withCreatePermission = (handler: any) => 
  withRBAC(handler, { permission: PERMISSIONS.CREATE_KPI })

export const withUpdatePermission = (handler: any) => 
  withRBAC(handler, { permission: PERMISSIONS.UPDATE_KPI })

export const withDeletePermission = (handler: any) => 
  withRBAC(handler, { permission: PERMISSIONS.DELETE_KPI })

export const withAnalyzePermission = (handler: any) => 
  withRBAC(handler, { permission: PERMISSIONS.ANALYZE_KPI })

export const withAdminPermission = (handler: any) => 
  withRBAC(handler, { permission: PERMISSIONS.MANAGE_SYSTEM })

// Export commonly used permissions for easy access
export { PERMISSIONS } from '@/lib/rbac'
