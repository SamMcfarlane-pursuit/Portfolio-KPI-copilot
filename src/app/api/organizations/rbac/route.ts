/**
 * RBAC-Protected Organization Management API
 * Handles multi-tenant organization operations with proper access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import RBACService, { ROLES } from '@/lib/rbac'

// GET organizations with RBAC
const getOrganizations = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'

    // Get organizations user has access to
    const userOrgs = await RBACService.getUserOrganizations(user.userId)
    
    if (userOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        organizations: [],
        message: 'No organizations accessible to user'
      })
    }

    // Fetch organizations with stats if requested
    const organizations = await prisma.organization.findMany({
      where: {
        id: { in: userOrgs },
        isActive: true
      },
      include: includeStats ? {
        funds: {
          include: {
            portfolios: {
              include: {
                kpis: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats if requested
    const enrichedOrgs = await Promise.all(
      organizations.map(async (org) => {
        const baseOrg = {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          isActive: org.isActive,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt
        }

        if (!includeStats) return baseOrg

        // Get user's role in this organization
        const userRole = await prisma.organizationUser.findFirst({
          where: {
            userId: user.userId,
            organizationId: org.id
          },
          select: { role: true }
        })

        const orgWithStats = org as any // Type assertion for included relations
        const stats = {
          totalFunds: orgWithStats.funds?.length || 0,
          totalPortfolios: orgWithStats.funds?.reduce((acc: number, fund: any) => acc + (fund.portfolios?.length || 0), 0) || 0,
          totalKPIs: orgWithStats.funds?.reduce((acc: number, fund: any) =>
            acc + fund.portfolios?.reduce((pAcc: number, portfolio: any) =>
              pAcc + (portfolio.kpis?.length || 0), 0
            ), 0
          ) || 0,
          totalUsers: orgWithStats.users?.length || 0,
          userRole: userRole?.role || user.role
        }

        return {
          ...baseOrg,
          stats,
          permissions: {
            canManage: RBACService.hasPermission(user, PERMISSIONS.UPDATE_ORGANIZATION),
            canInviteUsers: RBACService.hasPermission(user, PERMISSIONS.INVITE_USERS),
            canViewUsers: RBACService.hasPermission(user, PERMISSIONS.VIEW_USERS),
            canCreatePortfolios: RBACService.hasPermission(user, PERMISSIONS.CREATE_PORTFOLIO)
          }
        }
      })
    )

    // Log access
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VIEW_ORGANIZATIONS',
      resourceType: 'ORGANIZATION',
      resourceId: 'multiple',
      metadata: { count: organizations.length, includeStats }
    })

    return NextResponse.json({
      success: true,
      organizations: enrichedOrgs,
      count: enrichedOrgs.length,
      userRole: user.role
    })

  } catch (error) {
    console.error('RBAC Organizations GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch organizations',
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST create organization with RBAC
const createOrganization = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { 
      name, 
      slug, 
      description, 
      settings = {},
      currency = 'USD',
      fiscalYearEnd = '12-31'
    } = body

    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this slug already exists', code: 'SLUG_EXISTS' },
        { status: 409 }
      )
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        description,
        settings: JSON.stringify({
          currency,
          fiscalYearEnd,
          reportingFrequency: 'quarterly',
          aiEnabled: true,
          ...settings,
          createdBy: user.userId,
          createdAt: new Date().toISOString()
        })
      }
    })

    // Add creator as organization admin
    await RBACService.addUserToOrganization(
      user.userId,
      organization.id,
      ROLES.ORG_ADMIN,
      user.userId
    )

    // Log creation
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'CREATE_ORGANIZATION',
      resourceType: 'ORGANIZATION',
      resourceId: organization.id,
      metadata: { name, slug, description }
    })

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        createdAt: organization.createdAt,
        userRole: ROLES.ORG_ADMIN
      },
      message: 'Organization created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('RBAC Organizations POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create organization',
        code: 'CREATE_ERROR'
      },
      { status: 500 }
    )
  }
}

// PUT update organization with RBAC
const updateOrganization = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { id, name, description, settings, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required', code: 'ID_REQUIRED' },
        { status: 400 }
      )
    }

    // Check if user can access this organization
    const hasAccess = await RBACService.canAccessOrganization(user.userId, id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Organization access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(settings && { settings: JSON.stringify(settings) }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      }
    })

    // Log update
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'UPDATE_ORGANIZATION',
      resourceType: 'ORGANIZATION',
      resourceId: id,
      metadata: { changes: { name, description, isActive } }
    })

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: 'Organization updated successfully'
    })

  } catch (error) {
    console.error('RBAC Organizations PUT error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update organization',
        code: 'UPDATE_ERROR'
      },
      { status: 500 }
    )
  }
}

// Export RBAC-protected handlers
export const GET = withRBAC(getOrganizations, { 
  permission: PERMISSIONS.VIEW_ORGANIZATION
})

export const POST = withRBAC(createOrganization, { 
  permission: PERMISSIONS.CREATE_ORGANIZATION
})

export const PUT = withRBAC(updateOrganization, { 
  permission: PERMISSIONS.UPDATE_ORGANIZATION,
  requireOrganization: true
})
