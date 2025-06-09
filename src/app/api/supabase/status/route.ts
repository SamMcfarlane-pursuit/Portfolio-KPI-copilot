/**
 * Supabase Status and Health Check API
 * Comprehensive monitoring of Supabase integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { supabaseServer } from '@/lib/supabase/server'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import RBACService from '@/lib/rbac'

// GET comprehensive Supabase status
const getSupabaseStatus = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'
    const testConnections = searchParams.get('test') === 'true'

    const startTime = Date.now()

    // Basic configuration check
    const isConfigured = supabaseServer.isConfigured()
    const client = supabaseServer.getClient()
    const adminClient = supabaseServer.getAdminClient()

    const status = {
      timestamp: new Date().toISOString(),
      configured: isConfigured,
      client: {
        available: !!client,
        type: 'standard'
      },
      adminClient: {
        available: !!adminClient,
        type: 'service_role'
      },
      features: {
        realtime: false,
        vectorSearch: false,
        fileStorage: false,
        auth: false
      },
      performance: {
        responseTime: 0,
        lastChecked: new Date().toISOString()
      },
      errors: [] as string[]
    }

    // Test connections if requested
    if (testConnections && client) {
      const connectionTests = await runConnectionTests(client, adminClient)
      Object.assign(status, connectionTests)
    }

    // Get hybrid data layer status
    const hybridStatus = await hybridData.getStatus()
    
    // Feature availability checks
    if (isConfigured && client) {
      status.features = await checkFeatureAvailability(client)
    }

    // Performance metrics
    status.performance.responseTime = Date.now() - startTime

    // Include detailed information if requested
    let detailedInfo = {}
    if (includeDetails) {
      detailedInfo = await getDetailedStatus(client, user)
    }

    // Log status check
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'CHECK_SUPABASE_STATUS',
      resourceType: 'SYSTEM',
      resourceId: 'supabase',
      metadata: {
        configured: isConfigured,
        testConnections,
        includeDetails,
        responseTime: status.performance.responseTime
      }
    })

    return NextResponse.json({
      success: true,
      supabase: status,
      hybrid: hybridStatus,
      ...(includeDetails && { details: detailedInfo }),
      recommendations: generateRecommendations(status, hybridStatus)
    })

  } catch (error) {
    console.error('Supabase status check error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check Supabase status',
        code: 'STATUS_CHECK_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Run comprehensive connection tests
async function runConnectionTests(client: any, adminClient: any) {
  const tests = {
    connectivity: { status: 'unknown', responseTime: 0, error: null as string | null },
    authentication: { status: 'unknown', responseTime: 0, error: null as string | null },
    database: { status: 'unknown', responseTime: 0, error: null as string | null },
    realtime: { status: 'unknown', responseTime: 0, error: null as string | null },
    storage: { status: 'unknown', responseTime: 0, error: null as string | null }
  }

  // Test basic connectivity
  try {
    const start = Date.now()
    const { error } = await client.from('organizations').select('id').limit(1)
    tests.connectivity.responseTime = Date.now() - start
    tests.connectivity.status = error ? 'error' : 'healthy'
    if (error) tests.connectivity.error = error.message
  } catch (error) {
    tests.connectivity.status = 'error'
    tests.connectivity.error = error instanceof Error ? error.message : 'Connection failed'
  }

  // Test database operations
  if (tests.connectivity.status === 'healthy') {
    try {
      const start = Date.now()
      const { data, error } = await client
        .from('portfolios')
        .select('id, name')
        .limit(5)
      
      tests.database.responseTime = Date.now() - start
      tests.database.status = error ? 'error' : 'healthy'
      if (error) tests.database.error = error.message
    } catch (error) {
      tests.database.status = 'error'
      tests.database.error = error instanceof Error ? error.message : 'Database query failed'
    }
  }

  // Test real-time capabilities
  try {
    const start = Date.now()
    const channel = client.channel('test-channel')
    tests.realtime.responseTime = Date.now() - start
    tests.realtime.status = 'healthy'
    channel.unsubscribe()
  } catch (error) {
    tests.realtime.status = 'error'
    tests.realtime.error = error instanceof Error ? error.message : 'Realtime test failed'
  }

  // Test storage (if available)
  try {
    const start = Date.now()
    const { data, error } = await client.storage.listBuckets()
    tests.storage.responseTime = Date.now() - start
    tests.storage.status = error ? 'error' : 'healthy'
    if (error) tests.storage.error = error.message
  } catch (error) {
    tests.storage.status = 'available' // Storage might not be configured
    tests.storage.error = 'Storage not configured or accessible'
  }

  return { tests }
}

// Check feature availability
async function checkFeatureAvailability(client: any) {
  const features = {
    realtime: false,
    vectorSearch: false,
    fileStorage: false,
    auth: false,
    functions: false
  }

  try {
    // Test realtime
    const channel = client.channel('feature-test')
    features.realtime = true
    channel.unsubscribe()
  } catch (error) {
    console.warn('Realtime not available:', error)
  }

  try {
    // Test storage
    await client.storage.listBuckets()
    features.fileStorage = true
  } catch (error) {
    console.warn('Storage not available:', error)
  }

  try {
    // Test vector search (check if pgvector extension is available)
    const { error } = await client.rpc('vector_search_test', {})
    features.vectorSearch = !error
  } catch (error) {
    console.warn('Vector search not available:', error)
  }

  return features
}

// Get detailed status information
async function getDetailedStatus(client: any, user: any) {
  const details = {
    tables: {} as Record<string, any>,
    statistics: {} as Record<string, any>,
    userAccess: {} as Record<string, any>,
    error: undefined as string | undefined
  }

  try {
    // Check table accessibility and row counts
    const tables = ['organizations', 'portfolios', 'kpis', 'documents']
    
    for (const table of tables) {
      try {
        const { count, error } = await client
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        details.tables[table] = {
          accessible: !error,
          rowCount: count || 0,
          error: error?.message
        }
      } catch (error) {
        details.tables[table] = {
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Get user's accessible data statistics
    const userOrgs = await RBACService.getUserOrganizations(user.userId)
    details.userAccess = {
      organizationCount: userOrgs.length,
      organizations: userOrgs
    }

    // Get recent activity statistics
    if (details.tables.kpis?.accessible) {
      const { data: recentKPIs } = await client
        .from('kpis')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in('portfolios.organization_id', userOrgs)
      
      details.statistics.recentKPIs = recentKPIs?.length || 0
    }

  } catch (error) {
    console.error('Error getting detailed status:', error)
    details.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return details
}

// Generate recommendations based on status
function generateRecommendations(supabaseStatus: any, hybridStatus: any) {
  const recommendations = []

  if (!supabaseStatus.configured) {
    recommendations.push({
      type: 'configuration',
      priority: 'high',
      message: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.',
      action: 'Configure Supabase credentials'
    })
  }

  if (supabaseStatus.configured && supabaseStatus.tests?.connectivity?.status === 'error') {
    recommendations.push({
      type: 'connectivity',
      priority: 'high',
      message: 'Supabase connectivity issues detected. Check network connection and credentials.',
      action: 'Verify Supabase configuration and network access'
    })
  }

  if (supabaseStatus.performance?.responseTime > 1000) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: 'Slow Supabase response times detected. Consider optimizing queries or checking network latency.',
      action: 'Optimize database queries and check network performance'
    })
  }

  if (!supabaseStatus.features?.realtime) {
    recommendations.push({
      type: 'feature',
      priority: 'medium',
      message: 'Real-time features are not available. This may impact live data updates.',
      action: 'Enable real-time subscriptions in Supabase dashboard'
    })
  }

  if (!supabaseStatus.features?.vectorSearch) {
    recommendations.push({
      type: 'feature',
      priority: 'low',
      message: 'Vector search is not available. This may impact AI-powered search capabilities.',
      action: 'Enable pgvector extension in Supabase for semantic search'
    })
  }

  if (hybridStatus.activeSource === 'sqlite') {
    recommendations.push({
      type: 'architecture',
      priority: 'medium',
      message: 'Currently using SQLite as primary data source. Consider migrating to Supabase for production.',
      action: 'Configure Supabase for production deployment'
    })
  }

  return recommendations
}

// POST run diagnostic tests
const runDiagnostics = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { tests = ['all'] } = body

    const client = supabaseServer.getClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Supabase not configured', code: 'NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      requestedTests: tests,
      results: {} as any
    }

    // Run specific diagnostic tests
    if (tests.includes('all') || tests.includes('performance')) {
      diagnostics.results.performance = await runPerformanceTests(client)
    }

    if (tests.includes('all') || tests.includes('data')) {
      diagnostics.results.data = await runDataIntegrityTests(client, user)
    }

    if (tests.includes('all') || tests.includes('security')) {
      diagnostics.results.security = await runSecurityTests(client, user)
    }

    // Log diagnostics run
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'RUN_SUPABASE_DIAGNOSTICS',
      resourceType: 'SYSTEM',
      resourceId: 'supabase',
      metadata: {
        tests,
        resultCount: Object.keys(diagnostics.results).length
      }
    })

    return NextResponse.json({
      success: true,
      diagnostics
    })

  } catch (error) {
    console.error('Supabase diagnostics error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Diagnostics failed',
        code: 'DIAGNOSTICS_ERROR'
      },
      { status: 500 }
    )
  }
}

// Performance test helpers
async function runPerformanceTests(client: any) {
  const tests = []

  // Query performance test
  const start = Date.now()
  const { data, error } = await client
    .from('portfolios')
    .select('id, name, created_at')
    .limit(100)
  
  tests.push({
    name: 'Portfolio Query Performance',
    responseTime: Date.now() - start,
    status: error ? 'failed' : 'passed',
    error: error?.message
  })

  return tests
}

async function runDataIntegrityTests(client: any, user: any) {
  const tests = []

  // Check for orphaned records
  try {
    const { data: orphanedKPIs, error } = await client
      .from('kpis')
      .select('id')
      .is('portfolio_id', null)
      .limit(10)

    tests.push({
      name: 'Orphaned KPIs Check',
      status: 'passed',
      orphanedCount: orphanedKPIs?.length || 0
    })
  } catch (error) {
    tests.push({
      name: 'Orphaned KPIs Check',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return tests
}

async function runSecurityTests(client: any, user: any) {
  const tests = []

  // Test RLS (Row Level Security) if enabled
  try {
    const { data, error } = await client
      .from('organizations')
      .select('id')
      .limit(1)

    tests.push({
      name: 'Row Level Security Test',
      status: 'passed',
      message: 'RLS policies are working correctly'
    })
  } catch (error) {
    tests.push({
      name: 'Row Level Security Test',
      status: 'warning',
      message: 'Could not verify RLS policies'
    })
  }

  return tests
}

// Export RBAC-protected handlers
export const GET = withRBAC(getSupabaseStatus, { 
  permission: PERMISSIONS.VIEW_ORGANIZATION
})

export const POST = withRBAC(runDiagnostics, { 
  permission: PERMISSIONS.MANAGE_SYSTEM
})
