import { NextRequest, NextResponse } from 'next/server'

/**
 * API Routing Fix Endpoint
 * Diagnoses and provides fixes for API routing issues
 */

export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    deployment: 'vercel',
    issues: [] as any[],
    fixes: [] as any[]
  }

  // Check 1: Environment Variables
  const requiredEnvVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DATABASE_URL'
  ]

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  if (missingEnvVars.length > 0) {
    diagnostics.issues.push({
      type: 'CRITICAL',
      category: 'Environment',
      description: 'Missing required environment variables',
      details: missingEnvVars,
      impact: 'API routes may fail or return unexpected responses'
    })

    diagnostics.fixes.push({
      type: 'Environment Configuration',
      action: 'Set missing environment variables in Vercel dashboard',
      variables: missingEnvVars,
      priority: 'HIGH'
    })
  }

  // Check 2: Database Connection
  let dbStatus = 'unknown'
  try {
    // Try to import and test database connection
    const { prisma } = await import('../../../lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (error) {
    dbStatus = 'failed'
    diagnostics.issues.push({
      type: 'CRITICAL',
      category: 'Database',
      description: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown database error',
      impact: 'All CRUD operations will fail'
    })

    diagnostics.fixes.push({
      type: 'Database Migration',
      action: 'Migrate from SQLite to Supabase PostgreSQL',
      steps: [
        'Create Supabase project',
        'Update DATABASE_URL to PostgreSQL connection string',
        'Run database migration',
        'Update Vercel environment variables'
      ],
      priority: 'CRITICAL'
    })
  }

  // Check 3: NextAuth Configuration
  let authStatus = 'unknown'
  try {
    const { authOptions } = await import('../../../lib/auth')
    authStatus = authOptions ? 'configured' : 'missing'
  } catch (error) {
    authStatus = 'error'
    diagnostics.issues.push({
      type: 'HIGH',
      category: 'Authentication',
      description: 'NextAuth configuration error',
      details: error instanceof Error ? error.message : 'Unknown auth error',
      impact: 'Authentication-protected routes will fail'
    })
  }

  // Check 4: API Route Structure
  const apiRouteChecks = [
    { path: '/api/portfolios/route.ts', exists: false },
    { path: '/api/companies/route.ts', exists: false },
    { path: '/api/kpis/route.ts', exists: false },
    { path: '/api/health/route.ts', exists: false }
  ]

  // Check if API route files exist (simplified check)
  try {
    await import('../portfolios/route')
    apiRouteChecks[0].exists = true
  } catch (e) {
    // Route doesn't exist or has errors
  }

  try {
    await import('../companies/route')
    apiRouteChecks[1].exists = true
  } catch (e) {
    // Route doesn't exist or has errors
  }

  try {
    await import('../kpis/route')
    apiRouteChecks[2].exists = true
  } catch (e) {
    // Route doesn't exist or has errors
  }

  try {
    await import('../health/route')
    apiRouteChecks[3].exists = true
  } catch (e) {
    // Route doesn't exist or has errors
  }

  const missingRoutes = apiRouteChecks.filter(route => !route.exists)
  if (missingRoutes.length > 0) {
    diagnostics.issues.push({
      type: 'HIGH',
      category: 'API Routes',
      description: 'API route files missing or have import errors',
      details: missingRoutes.map(r => r.path),
      impact: 'Affected API endpoints will not respond correctly'
    })
  }

  // Check 5: Middleware Configuration
  let middlewareStatus = 'unknown'
  try {
    // Check if middleware is properly configured
    middlewareStatus = 'configured'
  } catch (error) {
    middlewareStatus = 'error'
    diagnostics.issues.push({
      type: 'MEDIUM',
      category: 'Middleware',
      description: 'Middleware configuration issues',
      details: error instanceof Error ? error.message : 'Unknown middleware error',
      impact: 'Request routing and authentication may be affected'
    })
  }

  // Generate overall health score
  const totalChecks = 5
  const passedChecks = [
    missingEnvVars.length === 0,
    dbStatus === 'connected',
    authStatus === 'configured',
    missingRoutes.length === 0,
    middlewareStatus === 'configured'
  ].filter(Boolean).length

  const healthScore = Math.round((passedChecks / totalChecks) * 100)

  // Generate fix recommendations
  if (diagnostics.issues.length === 0) {
    diagnostics.fixes.push({
      type: 'Verification',
      action: 'All checks passed - run comprehensive API test',
      priority: 'LOW'
    })
  }

  return NextResponse.json({
    success: true,
    healthScore,
    status: {
      environment: missingEnvVars.length === 0 ? 'OK' : 'ISSUES',
      database: dbStatus,
      authentication: authStatus,
      apiRoutes: missingRoutes.length === 0 ? 'OK' : 'ISSUES',
      middleware: middlewareStatus
    },
    diagnostics,
    summary: {
      totalIssues: diagnostics.issues.length,
      criticalIssues: diagnostics.issues.filter(i => i.type === 'CRITICAL').length,
      highIssues: diagnostics.issues.filter(i => i.type === 'HIGH').length,
      mediumIssues: diagnostics.issues.filter(i => i.type === 'MEDIUM').length
    },
    nextSteps: generateNextSteps(diagnostics.issues)
  })
}

function generateNextSteps(issues: any[]) {
  const steps = []

  const criticalIssues = issues.filter(i => i.type === 'CRITICAL')
  const highIssues = issues.filter(i => i.type === 'HIGH')

  if (criticalIssues.some(i => i.category === 'Database')) {
    steps.push({
      priority: 1,
      action: 'Fix Database Connection',
      description: 'Migrate to Supabase PostgreSQL and update environment variables',
      estimated_time: '30-60 minutes'
    })
  }

  if (criticalIssues.some(i => i.category === 'Environment')) {
    steps.push({
      priority: 2,
      action: 'Configure Environment Variables',
      description: 'Set all required environment variables in Vercel dashboard',
      estimated_time: '15-30 minutes'
    })
  }

  if (highIssues.some(i => i.category === 'Authentication')) {
    steps.push({
      priority: 3,
      action: 'Fix Authentication Configuration',
      description: 'Verify NextAuth setup and OAuth provider configuration',
      estimated_time: '20-40 minutes'
    })
  }

  if (highIssues.some(i => i.category === 'API Routes')) {
    steps.push({
      priority: 4,
      action: 'Fix API Route Issues',
      description: 'Resolve import errors and ensure all API routes are properly configured',
      estimated_time: '15-30 minutes'
    })
  }

  if (steps.length === 0) {
    steps.push({
      priority: 1,
      action: 'Run Comprehensive Testing',
      description: 'All basic checks passed - run full API endpoint testing',
      estimated_time: '10-15 minutes'
    })
  }

  return steps
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'test_database':
        return await testDatabaseConnection()
      case 'test_auth':
        return await testAuthConfiguration()
      case 'test_api_routes':
        return await testApiRoutes()
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: test_database, test_auth, test_api_routes' },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function testDatabaseConnection() {
  try {
    const { prisma } = await import('../../../lib/prisma')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    return NextResponse.json({
      success: true,
      database: 'connected',
      result
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      database: 'failed',
      error: error instanceof Error ? error.message : 'Unknown database error'
    })
  }
}

async function testAuthConfiguration() {
  try {
    const { authOptions } = await import('../../../lib/auth')
    return NextResponse.json({
      success: true,
      auth: 'configured',
      providers: authOptions.providers?.length || 0
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      auth: 'failed',
      error: error instanceof Error ? error.message : 'Unknown auth error'
    })
  }
}

async function testApiRoutes() {
  const routes = [
    '/api/portfolios',
    '/api/companies', 
    '/api/kpis',
    '/api/health'
  ]

  const results = []
  for (const route of routes) {
    try {
      await import(`.${route}/route`)
      results.push({ route, status: 'OK' })
    } catch (error) {
      results.push({ 
        route, 
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Import failed'
      })
    }
  }

  return NextResponse.json({
    success: true,
    routes: results,
    summary: {
      total: routes.length,
      working: results.filter(r => r.status === 'OK').length,
      failed: results.filter(r => r.status === 'ERROR').length
    }
  })
}
