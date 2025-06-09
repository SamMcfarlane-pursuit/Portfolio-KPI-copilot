/**
 * RBAC-Protected User Management API
 * Handles user operations with proper role-based access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import RBACService, { ROLES, Role, ROLE_PERMISSIONS } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

// GET users with RBAC
const getUsers = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required', code: 'ORG_ID_REQUIRED' },
        { status: 400 }
      )
    }

    // Get users in the organization
    const orgUsers = await prisma.organizationUser.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Enrich with permissions info
    const enrichedUsers = orgUsers.map(orgUser => ({
      id: orgUser.user.id,
      name: orgUser.user.name,
      email: orgUser.user.email,
      globalRole: orgUser.user.role,
      organizationRole: orgUser.role,
      isActive: orgUser.user.isActive,
      lastLoginAt: orgUser.user.lastLoginAt,
      joinedAt: orgUser.createdAt,
      permissions: orgUser.permissions ? JSON.parse(orgUser.permissions) : [],
      canManage: RBACService.hasPermission(user, PERMISSIONS.MANAGE_USERS)
    }))

    // Log access
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VIEW_USERS',
      resourceType: 'USER',
      resourceId: organizationId,
      metadata: { count: enrichedUsers.length }
    })

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      count: enrichedUsers.length,
      organization: organizationId
    })

  } catch (error) {
    console.error('RBAC Users GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch users',
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST invite/create user with RBAC
const inviteUser = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { 
      email, 
      name, 
      organizationId, 
      role = ROLES.VIEWER,
      sendInvite = true 
    } = body

    // Validation
    if (!email || !organizationId) {
      return NextResponse.json(
        { error: 'Email and organization ID are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(ROLES).includes(role as Role)) {
      return NextResponse.json(
        { error: 'Invalid role specified', code: 'INVALID_ROLE' },
        { status: 400 }
      )
    }

    // Check if user already exists
    let targetUser = await prisma.user.findUnique({
      where: { email }
    })

    // If user doesn't exist, create them
    if (!targetUser) {
      const tempPassword = Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 12)

      targetUser = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: hashedPassword,
          role: ROLES.VIEWER, // Default global role
          isActive: true
        }
      })
    }

    // Check if user is already in organization
    const existingOrgUser = await prisma.organizationUser.findFirst({
      where: {
        userId: targetUser.id,
        organizationId
      }
    })

    if (existingOrgUser) {
      return NextResponse.json(
        { error: 'User is already a member of this organization', code: 'USER_EXISTS' },
        { status: 409 }
      )
    }

    // Add user to organization
    const success = await RBACService.addUserToOrganization(
      targetUser.id,
      organizationId,
      role as Role,
      user.userId
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add user to organization', code: 'ADD_USER_ERROR' },
        { status: 500 }
      )
    }

    // TODO: Send invitation email if sendInvite is true
    // This would integrate with your email service

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        organizationRole: role
      },
      message: `User ${sendInvite ? 'invited' : 'added'} successfully`
    }, { status: 201 })

  } catch (error) {
    console.error('RBAC Users POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to invite user',
        code: 'INVITE_ERROR'
      },
      { status: 500 }
    )
  }
}

// PUT update user role with RBAC
const updateUserRole = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { userId, organizationId, role } = body

    // Validation
    if (!userId || !organizationId || !role) {
      return NextResponse.json(
        { error: 'User ID, organization ID, and role are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(ROLES).includes(role as Role)) {
      return NextResponse.json(
        { error: 'Invalid role specified', code: 'INVALID_ROLE' },
        { status: 400 }
      )
    }

    // Check if target user exists in organization
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        userId,
        organizationId
      }
    })

    if (!orgUser) {
      return NextResponse.json(
        { error: 'User not found in organization', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Update user role
    const updatedOrgUser = await prisma.organizationUser.update({
      where: { id: orgUser.id },
      data: {
        role,
        permissions: JSON.stringify(ROLE_PERMISSIONS[role as Role] || []),
        updatedAt: new Date()
      }
    })

    // Log the role change
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'UPDATE_USER_ROLE',
      resourceType: 'USER',
      resourceId: userId,
      metadata: { 
        organizationId,
        oldRole: orgUser.role,
        newRole: role
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: userId,
        organizationRole: role,
        updatedAt: updatedOrgUser.updatedAt
      }
    })

  } catch (error) {
    console.error('RBAC Users PUT error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update user role',
        code: 'UPDATE_ERROR'
      },
      { status: 500 }
    )
  }
}

// DELETE remove user from organization with RBAC
const removeUser = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const organizationId = searchParams.get('organizationId')

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'User ID and organization ID are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check if user exists in organization
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        userId,
        organizationId
      }
    })

    if (!orgUser) {
      return NextResponse.json(
        { error: 'User not found in organization', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Remove user from organization
    await prisma.organizationUser.delete({
      where: { id: orgUser.id }
    })

    // Log the removal
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'REMOVE_USER_FROM_ORGANIZATION',
      resourceType: 'USER',
      resourceId: userId,
      metadata: { organizationId, removedRole: orgUser.role }
    })

    return NextResponse.json({
      success: true,
      message: 'User removed from organization successfully'
    })

  } catch (error) {
    console.error('RBAC Users DELETE error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to remove user',
        code: 'REMOVE_ERROR'
      },
      { status: 500 }
    )
  }
}

// Export RBAC-protected handlers
export const GET = withRBAC(getUsers, { 
  permission: PERMISSIONS.VIEW_USERS,
  requireOrganization: true
})

export const POST = withRBAC(inviteUser, { 
  permission: PERMISSIONS.INVITE_USERS,
  requireOrganization: true
})

export const PUT = withRBAC(updateUserRole, { 
  permission: PERMISSIONS.MANAGE_USERS,
  requireOrganization: true
})

export const DELETE = withRBAC(removeUser, { 
  permission: PERMISSIONS.MANAGE_USERS,
  requireOrganization: true
})
