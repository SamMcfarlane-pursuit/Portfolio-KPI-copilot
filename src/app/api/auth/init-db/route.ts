import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Database Initialization Endpoint
 * Ensures database tables exist and are properly configured
 */
export async function GET(request: NextRequest) {
  try {
    // Test basic database connectivity
    console.log('Testing database connectivity...')
    
    // Try to query the User table
    const userCount = await prisma.user.count()
    console.log(`User table accessible, count: ${userCount}`)
    
    // Try to query other essential tables
    const orgCount = await prisma.organization.count()
    console.log(`Organization table accessible, count: ${orgCount}`)
    
    // Test if we can create a test record (and delete it)
    const testEmail = `test-${Date.now()}@example.com`
    
    try {
      const testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: testEmail,
          password: 'test-password-hash',
          role: 'ANALYST',
          isActive: true,
        }
      })
      
      // Clean up test user
      await prisma.user.delete({
        where: { id: testUser.id }
      })
      
      console.log('Database write test successful')
    } catch (writeError) {
      console.error('Database write test failed:', writeError)
      throw writeError
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database is properly initialized',
      tables: {
        users: userCount,
        organizations: orgCount,
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Database initialization check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
      } : null,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Force database schema push (for development/debugging)
 */
export async function POST(request: NextRequest) {
  try {
    // This would typically run prisma db push
    // For now, just return the current status
    
    const tables = await Promise.all([
      prisma.user.count().then(count => ({ table: 'users', count })),
      prisma.organization.count().then(count => ({ table: 'organizations', count })),
      prisma.auditLog.count().then(count => ({ table: 'audit_logs', count })),
    ])
    
    return NextResponse.json({
      success: true,
      message: 'Database schema check completed',
      tables,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Database schema check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
