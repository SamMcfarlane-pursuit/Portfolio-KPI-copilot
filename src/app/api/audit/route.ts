/**
 * Audit Log API with RBAC
 * Provides compliance-ready audit trail functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import RBACService from '@/lib/rbac'

// GET audit logs with RBAC
const getAuditLogs = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    
    const organizationId = searchParams.get('organizationId')
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resourceType')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const whereClause: any = {}

    // If organization specified, check access
    if (organizationId) {
      const hasAccess = await RBACService.canAccessOrganization(user.userId, organizationId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Organization access denied', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }
      
      // Filter by organization-related resources
      whereClause.OR = [
        { resourceId: organizationId },
        { 
          resourceType: 'PORTFOLIO',
          // Get portfolios in this organization
          resourceId: {
            in: await getOrganizationPortfolioIds(organizationId)
          }
        },
        {
          resourceType: 'KPI',
          // Get KPIs in this organization
          resourceId: {
            in: await getOrganizationKPIIds(organizationId)
          }
        }
      ]
    } else {
      // Get all organizations user has access to
      const userOrgs = await RBACService.getUserOrganizations(user.userId)
      if (userOrgs.length === 0) {
        return NextResponse.json({
          success: true,
          logs: [],
          pagination: { page, limit, total: 0, pages: 0 }
        })
      }

      // Filter by accessible organizations
      const accessiblePortfolios = await getMultipleOrganizationPortfolioIds(userOrgs)
      const accessibleKPIs = await getMultipleOrganizationKPIIds(userOrgs)

      whereClause.OR = [
        { resourceId: { in: userOrgs } },
        { 
          resourceType: 'PORTFOLIO',
          resourceId: { in: accessiblePortfolios }
        },
        {
          resourceType: 'KPI', 
          resourceId: { in: accessibleKPIs }
        }
      ]
    }

    // Add additional filters
    if (action) whereClause.action = action
    if (resourceType) whereClause.resourceType = resourceType
    if (userId) whereClause.userId = userId

    // Date range filter
    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) whereClause.timestamp.gte = new Date(startDate)
      if (endDate) whereClause.timestamp.lte = new Date(endDate)
    }

    // Get total count for pagination
    const total = await prisma.auditLog.count({ where: whereClause })
    const pages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    // Fetch audit logs
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit
    })

    // Enrich logs with additional context
    const enrichedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata ? JSON.parse(log.metadata) : {},
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email
      }
    }))

    // Log this audit access
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VIEW_AUDIT_LOGS',
      resourceType: 'AUDIT_LOG',
      resourceId: organizationId || 'multiple',
      metadata: { 
        filters: { action, resourceType, userId, startDate, endDate },
        resultCount: logs.length
      }
    })

    return NextResponse.json({
      success: true,
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      },
      filters: {
        organizationId,
        action,
        resourceType,
        userId,
        startDate,
        endDate
      }
    })

  } catch (error) {
    console.error('Audit Logs GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch audit logs',
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// GET audit statistics
const getAuditStats = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const days = parseInt(searchParams.get('days') || '30')

    // Date range for stats
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build base where clause
    let whereClause: any = {
      timestamp: { gte: startDate }
    }

    if (organizationId) {
      const hasAccess = await RBACService.canAccessOrganization(user.userId, organizationId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Organization access denied', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }
      
      whereClause.resourceId = organizationId
    } else {
      const userOrgs = await RBACService.getUserOrganizations(user.userId)
      whereClause.resourceId = { in: userOrgs }
    }

    // Get action statistics
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: whereClause,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } }
    })

    // Get resource type statistics
    const resourceStats = await prisma.auditLog.groupBy({
      by: ['resourceType'],
      where: whereClause,
      _count: { resourceType: true },
      orderBy: { _count: { resourceType: 'desc' } }
    })

    // Get user activity statistics
    const userStats = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: whereClause,
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10
    })

    // Get daily activity
    const dailyActivity = await prisma.$queryRaw`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM AuditLog 
      WHERE timestamp >= ${startDate}
      ${organizationId ? `AND resourceId = ${organizationId}` : ''}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `

    return NextResponse.json({
      success: true,
      stats: {
        totalEvents: actionStats.reduce((sum, stat) => sum + stat._count.action, 0),
        actionBreakdown: actionStats.map(stat => ({
          action: stat.action,
          count: stat._count.action
        })),
        resourceBreakdown: resourceStats.map(stat => ({
          resourceType: stat.resourceType,
          count: stat._count.resourceType
        })),
        topUsers: userStats.map(stat => ({
          userId: stat.userId,
          count: stat._count.userId
        })),
        dailyActivity
      },
      period: {
        days,
        startDate,
        endDate: new Date()
      }
    })

  } catch (error) {
    console.error('Audit Stats GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch audit statistics',
        code: 'STATS_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper functions
async function getOrganizationPortfolioIds(organizationId: string): Promise<string[]> {
  const portfolios = await prisma.portfolio.findMany({
    where: {
      fund: { organizationId }
    },
    select: { id: true }
  })
  return portfolios.map(p => p.id)
}

async function getOrganizationKPIIds(organizationId: string): Promise<string[]> {
  const kpis = await prisma.kPI.findMany({
    where: { organizationId },
    select: { id: true }
  })
  return kpis.map(k => k.id)
}

async function getMultipleOrganizationPortfolioIds(organizationIds: string[]): Promise<string[]> {
  const portfolios = await prisma.portfolio.findMany({
    where: {
      fund: { organizationId: { in: organizationIds } }
    },
    select: { id: true }
  })
  return portfolios.map(p => p.id)
}

async function getMultipleOrganizationKPIIds(organizationIds: string[]): Promise<string[]> {
  const kpis = await prisma.kPI.findMany({
    where: { organizationId: { in: organizationIds } },
    select: { id: true }
  })
  return kpis.map(k => k.id)
}

// Export RBAC-protected handlers
export const GET = withRBAC(getAuditLogs, { 
  permission: PERMISSIONS.VIEW_AUDIT_LOGS
})
