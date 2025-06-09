/**
 * RBAC System Test API
 * Comprehensive testing endpoint for role-based access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import RBACService, { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required for RBAC testing'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const testType = searchParams.get('test') || 'all'

    const results: any = {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      userEmail: session.user.email,
      tests: {}
    }

    // Test 1: User Context Retrieval
    if (testType === 'all' || testType === 'context') {
      try {
        const userContext = await RBACService.getUserContext(session.user.id, organizationId || undefined)
        results.tests.userContext = {
          success: true,
          data: userContext,
          message: 'User context retrieved successfully'
        }
      } catch (error) {
        results.tests.userContext = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test 2: Permission Checks
    if (testType === 'all' || testType === 'permissions') {
      try {
        const userContext = await RBACService.getUserContext(session.user.id, organizationId || undefined)
        if (userContext) {
          const permissionTests = Object.values(PERMISSIONS).map(permission => ({
            permission,
            hasPermission: RBACService.hasPermission(userContext, permission)
          }))

          results.tests.permissions = {
            success: true,
            data: {
              userRole: userContext.organizationRole || userContext.role,
              permissionTests,
              summary: {
                total: permissionTests.length,
                granted: permissionTests.filter(p => p.hasPermission).length,
                denied: permissionTests.filter(p => !p.hasPermission).length
              }
            },
            message: 'Permission checks completed'
          }
        } else {
          results.tests.permissions = {
            success: false,
            error: 'Could not retrieve user context'
          }
        }
      } catch (error) {
        results.tests.permissions = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test 3: Organization Access
    if (testType === 'all' || testType === 'organization') {
      try {
        const userOrgs = await RBACService.getUserOrganizations(session.user.id)
        const accessTests = []

        if (organizationId) {
          const hasAccess = await RBACService.canAccessOrganization(session.user.id, organizationId)
          accessTests.push({
            organizationId,
            hasAccess,
            type: 'specific'
          })
        }

        // Test access to all user organizations
        for (const orgId of userOrgs) {
          const hasAccess = await RBACService.canAccessOrganization(session.user.id, orgId)
          accessTests.push({
            organizationId: orgId,
            hasAccess,
            type: 'user_org'
          })
        }

        results.tests.organizationAccess = {
          success: true,
          data: {
            userOrganizations: userOrgs,
            accessTests,
            summary: {
              totalOrgs: userOrgs.length,
              accessibleOrgs: accessTests.filter(t => t.hasAccess).length
            }
          },
          message: 'Organization access tests completed'
        }
      } catch (error) {
        results.tests.organizationAccess = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test 4: Portfolio Access
    if (testType === 'all' || testType === 'portfolio') {
      try {
        // Get some portfolios to test
        const portfolios = await prisma.portfolio.findMany({
          take: 5,
          include: {
            fund: {
              include: {
                organization: true
              }
            }
          }
        })

        const portfolioTests = await Promise.all(
          portfolios.map(async (portfolio) => {
            const hasAccess = await RBACService.canAccessPortfolio(session.user.id, portfolio.id)
            return {
              portfolioId: portfolio.id,
              portfolioName: portfolio.name,
              organizationId: portfolio.fund.organizationId,
              organizationName: portfolio.fund.organization.name,
              hasAccess
            }
          })
        )

        results.tests.portfolioAccess = {
          success: true,
          data: {
            portfolioTests,
            summary: {
              totalTested: portfolioTests.length,
              accessible: portfolioTests.filter(p => p.hasAccess).length
            }
          },
          message: 'Portfolio access tests completed'
        }
      } catch (error) {
        results.tests.portfolioAccess = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test 5: Audit Logging
    if (testType === 'all' || testType === 'audit') {
      try {
        await RBACService.logAuditEvent({
          userId: session.user.id,
          action: 'RBAC_SYSTEM_TEST',
          resourceType: 'SYSTEM',
          resourceId: 'rbac-test',
          metadata: {
            testType,
            organizationId,
            timestamp: new Date().toISOString()
          }
        })

        results.tests.auditLogging = {
          success: true,
          message: 'Audit event logged successfully'
        }
      } catch (error) {
        results.tests.auditLogging = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test 6: Role Hierarchy
    if (testType === 'all' || testType === 'roles') {
      try {
        const roleTests = Object.values(ROLES).map(role => {
          const permissions = ROLE_PERMISSIONS[role] || []
          return {
            role,
            permissionCount: permissions.length,
            permissions: permissions.slice(0, 5), // Show first 5 permissions
            hasCreateKPI: permissions.includes(PERMISSIONS.CREATE_KPI),
            hasManageUsers: permissions.includes(PERMISSIONS.MANAGE_USERS),
            hasViewAuditLogs: permissions.includes(PERMISSIONS.VIEW_AUDIT_LOGS)
          }
        })

        results.tests.roleHierarchy = {
          success: true,
          data: {
            availableRoles: Object.values(ROLES),
            roleTests,
            totalPermissions: Object.values(PERMISSIONS).length
          },
          message: 'Role hierarchy tests completed'
        }
      } catch (error) {
        results.tests.roleHierarchy = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test 7: Database Connectivity
    if (testType === 'all' || testType === 'database') {
      try {
        const userCount = await prisma.user.count()
        const orgCount = await prisma.organization.count()
        const orgUserCount = await prisma.organizationUser.count()

        results.tests.database = {
          success: true,
          data: {
            userCount,
            organizationCount: orgCount,
            organizationUserCount: orgUserCount,
            connectionStatus: 'healthy'
          },
          message: 'Database connectivity test passed'
        }
      } catch (error) {
        results.tests.database = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Calculate overall test results
    const testResults = Object.values(results.tests)
    const successCount = testResults.filter((test: any) => test.success).length
    const totalTests = testResults.length

    results.summary = {
      totalTests,
      successCount,
      failureCount: totalTests - successCount,
      successRate: totalTests > 0 ? (successCount / totalTests * 100).toFixed(2) + '%' : '0%',
      overallStatus: successCount === totalTests ? 'PASS' : 'PARTIAL_PASS'
    }

    return NextResponse.json({
      success: true,
      rbacSystemTest: results,
      recommendations: generateRecommendations(results)
    })

  } catch (error) {
    console.error('RBAC Test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'RBAC system test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateRecommendations(results: any): string[] {
  const recommendations: string[] = []
  
  if (results.summary.successRate !== '100%') {
    recommendations.push('Some RBAC tests failed - review error details and fix issues')
  }
  
  if (!results.tests.userContext?.success) {
    recommendations.push('User context retrieval failed - check database connectivity and user setup')
  }
  
  if (!results.tests.permissions?.success) {
    recommendations.push('Permission checks failed - verify role configuration and permission mapping')
  }
  
  if (!results.tests.organizationAccess?.success) {
    recommendations.push('Organization access tests failed - check organization-user relationships')
  }
  
  if (!results.tests.auditLogging?.success) {
    recommendations.push('Audit logging failed - verify audit log table and permissions')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All RBAC tests passed - system is functioning correctly')
    recommendations.push('Consider running tests periodically to ensure continued functionality')
  }
  
  return recommendations
}

// POST endpoint to create test data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'create_test_org') {
      // Create a test organization for RBAC testing
      const testOrg = await prisma.organization.create({
        data: {
          name: 'RBAC Test Organization',
          slug: `rbac-test-${Date.now()}`,
          description: 'Test organization for RBAC functionality',
          settings: JSON.stringify({
            testOrganization: true,
            createdBy: session.user.id,
            createdAt: new Date().toISOString()
          })
        }
      })

      // Add current user as admin
      await RBACService.addUserToOrganization(
        session.user.id,
        testOrg.id,
        ROLES.ORG_ADMIN,
        session.user.id
      )

      return NextResponse.json({
        success: true,
        testOrganization: testOrg,
        message: 'Test organization created successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('RBAC Test POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
