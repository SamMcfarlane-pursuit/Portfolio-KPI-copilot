/**
 * Role-Based Access Control (RBAC) Service
 * Enterprise-grade multi-tenant security for Portfolio KPI Copilot
 */

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Define role hierarchy and permissions
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN', 
  MANAGER: 'MANAGER',
  ANALYST: 'ANALYST',
  VIEWER: 'VIEWER'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Define permissions for each role
export const PERMISSIONS = {
  // Organization Management
  CREATE_ORGANIZATION: 'CREATE_ORGANIZATION',
  UPDATE_ORGANIZATION: 'UPDATE_ORGANIZATION',
  DELETE_ORGANIZATION: 'DELETE_ORGANIZATION',
  VIEW_ORGANIZATION: 'VIEW_ORGANIZATION',
  
  // User Management
  INVITE_USERS: 'INVITE_USERS',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_USERS: 'VIEW_USERS',
  
  // Portfolio Management
  CREATE_PORTFOLIO: 'CREATE_PORTFOLIO',
  UPDATE_PORTFOLIO: 'UPDATE_PORTFOLIO',
  DELETE_PORTFOLIO: 'DELETE_PORTFOLIO',
  VIEW_PORTFOLIO: 'VIEW_PORTFOLIO',
  MANAGE_PORTFOLIO: 'MANAGE_PORTFOLIO',

  // KPI Management
  CREATE_KPI: 'CREATE_KPI',
  UPDATE_KPI: 'UPDATE_KPI',
  DELETE_KPI: 'DELETE_KPI',
  VIEW_KPI: 'VIEW_KPI',
  ANALYZE_KPI: 'ANALYZE_KPI',
  MANAGE_KPI: 'MANAGE_KPI',
  
  // Data Access
  VIEW_SENSITIVE_DATA: 'VIEW_SENSITIVE_DATA',
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA',
  
  // System Administration
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  VIEW_SYSTEM: 'VIEW_SYSTEM',
  MANAGE_SYSTEM: 'MANAGE_SYSTEM'
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  
  [ROLES.ORG_ADMIN]: [
    PERMISSIONS.UPDATE_ORGANIZATION,
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_PORTFOLIO,
    PERMISSIONS.UPDATE_PORTFOLIO,
    PERMISSIONS.DELETE_PORTFOLIO,
    PERMISSIONS.VIEW_PORTFOLIO,
    PERMISSIONS.MANAGE_PORTFOLIO,
    PERMISSIONS.CREATE_KPI,
    PERMISSIONS.UPDATE_KPI,
    PERMISSIONS.DELETE_KPI,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.ANALYZE_KPI,
    PERMISSIONS.MANAGE_KPI,
    PERMISSIONS.VIEW_SENSITIVE_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_SYSTEM
  ],
  
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_PORTFOLIO,
    PERMISSIONS.UPDATE_PORTFOLIO,
    PERMISSIONS.VIEW_PORTFOLIO,
    PERMISSIONS.MANAGE_PORTFOLIO,
    PERMISSIONS.CREATE_KPI,
    PERMISSIONS.UPDATE_KPI,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.ANALYZE_KPI,
    PERMISSIONS.MANAGE_KPI,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.VIEW_SYSTEM
  ],
  
  [ROLES.ANALYST]: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_PORTFOLIO,
    PERMISSIONS.CREATE_KPI,
    PERMISSIONS.UPDATE_KPI,
    PERMISSIONS.VIEW_KPI,
    PERMISSIONS.ANALYZE_KPI,
    PERMISSIONS.EXPORT_DATA
  ],
  
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.VIEW_PORTFOLIO,
    PERMISSIONS.VIEW_KPI
  ]
}

export interface UserContext {
  userId: string
  email: string
  role: Role
  organizationId?: string
  organizationRole?: Role
}

export class RBACService {
  /**
   * Get user context with organization role
   */
  static async getUserContext(userId: string, organizationId?: string): Promise<UserContext | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organizationUser: organizationId ? {
            where: { organizationId },
            take: 1
          } : true
        }
      })

      if (!user) return null

      let organizationRole: Role | undefined
      if (organizationId && user.organizationUser.length > 0) {
        organizationRole = user.organizationUser[0].role as Role
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.role as Role,
        organizationId,
        organizationRole: organizationRole || user.role as Role
      }
    } catch (error) {
      console.error('Error getting user context:', error)
      return null
    }
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(userContext: UserContext, permission: Permission): boolean {
    const effectiveRole = userContext.organizationRole || userContext.role
    const rolePermissions = ROLE_PERMISSIONS[effectiveRole] || []
    return rolePermissions.includes(permission)
  }

  /**
   * Check if user can access organization
   */
  static async canAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      const userContext = await this.getUserContext(userId, organizationId)
      return userContext !== null && userContext.organizationId === organizationId
    } catch (error) {
      console.error('Error checking organization access:', error)
      return false
    }
  }

  /**
   * Check if user can access portfolio
   */
  static async canAccessPortfolio(userId: string, portfolioId: string): Promise<boolean> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
        include: {
          fund: {
            include: {
              organization: true
            }
          }
        }
      })

      if (!portfolio) return false

      return await this.canAccessOrganization(userId, portfolio.fund.organizationId)
    } catch (error) {
      console.error('Error checking portfolio access:', error)
      return false
    }
  }

  /**
   * Get user's accessible organizations
   */
  static async getUserOrganizations(userId: string): Promise<string[]> {
    try {
      const userOrgs = await prisma.organizationUser.findMany({
        where: { userId },
        select: { organizationId: true }
      })

      return userOrgs.map(org => org.organizationId)
    } catch (error) {
      console.error('Error getting user organizations:', error)
      return []
    }
  }

  /**
   * Middleware helper for API route protection
   */
  static async requirePermission(permission: Permission, organizationId?: string) {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      throw new Error('Authentication required')
    }

    const userContext = await this.getUserContext(session.user.id, organizationId)
    
    if (!userContext) {
      throw new Error('User context not found')
    }

    if (organizationId && !await this.canAccessOrganization(session.user.id, organizationId)) {
      throw new Error('Organization access denied')
    }

    if (!this.hasPermission(userContext, permission)) {
      throw new Error(`Permission denied: ${permission}`)
    }

    return userContext
  }

  /**
   * Add user to organization with role
   */
  static async addUserToOrganization(
    userId: string, 
    organizationId: string, 
    role: Role,
    addedBy: string
  ): Promise<boolean> {
    try {
      // Check if the user adding has permission
      const adderContext = await this.getUserContext(addedBy, organizationId)
      if (!adderContext || !this.hasPermission(adderContext, PERMISSIONS.MANAGE_USERS)) {
        throw new Error('Permission denied to add users')
      }

      await prisma.organizationUser.create({
        data: {
          userId,
          organizationId,
          role,
          permissions: JSON.stringify(ROLE_PERMISSIONS[role])
        }
      })

      // Log the action
      await this.logAuditEvent({
        userId: addedBy,
        action: 'USER_ADDED_TO_ORGANIZATION',
        resourceType: 'ORGANIZATION',
        resourceId: organizationId,
        metadata: { targetUserId: userId, role }
      })

      return true
    } catch (error) {
      console.error('Error adding user to organization:', error)
      return false
    }
  }

  /**
   * Log audit events for compliance
   */
  static async logAuditEvent(event: {
    userId: string
    userEmail?: string
    action: string
    resourceType: string
    resourceId: string
    metadata?: any
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          userEmail: event.userEmail || 'unknown',
          action: event.action,
          entityType: event.resourceType,
          entityId: event.resourceId,
          changes: JSON.stringify(event.metadata || {}),
          timestamp: new Date(),
          ipAddress: 'unknown', // Will be enhanced with actual IP
          userAgent: 'unknown'  // Will be enhanced with actual user agent
        }
      })
    } catch (error) {
      console.error('Error logging audit event:', error)
      // Don't throw - audit logging shouldn't break business logic
    }
  }
}

export default RBACService
