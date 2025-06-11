import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Production Health Check API
 * Comprehensive health monitoring for production deployment
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HealthCheck {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  details?: any
  error?: string
}

interface ProductionHealthResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: HealthCheck[]
  metrics: {
    totalChecks: number
    healthyChecks: number
    degradedChecks: number
    unhealthyChecks: number
    averageResponseTime: number
  }
  recommendations: string[]
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const checks: HealthCheck[] = []
  
  try {
    // 1. Database Health Check
    const dbCheck = await checkDatabase()
    checks.push(dbCheck)
    
    // 2. Authentication System Check
    const authCheck = await checkAuthentication()
    checks.push(authCheck)
    
    // 3. API Routes Check
    const apiCheck = await checkApiRoutes()
    checks.push(apiCheck)
    
    // 4. Environment Configuration Check
    const envCheck = await checkEnvironment()
    checks.push(envCheck)
    
    // 5. External Services Check
    const servicesCheck = await checkExternalServices()
    checks.push(servicesCheck)
    
    // 6. Performance Check
    const perfCheck = await checkPerformance()
    checks.push(perfCheck)
    
    // Calculate metrics
    const metrics = calculateMetrics(checks)
    
    // Determine overall health
    const overall = determineOverallHealth(checks)
    
    // Generate recommendations
    const recommendations = generateRecommendations(checks)
    
    const response: ProductionHealthResponse = {
      overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      checks,
      metrics,
      recommendations
    }
    
    const statusCode = overall === 'unhealthy' ? 503 : 200
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': overall,
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as test`
    
    // Test table access
    const userCount = await prisma.user.count()
    const orgCount = await prisma.organization.count()
    
    const responseTime = Date.now() - startTime
    
    return {
      component: 'database',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        provider: 'postgresql',
        userCount,
        organizationCount: orgCount,
        connectionPool: 'active'
      }
    }
  } catch (error) {
    return {
      component: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

async function checkAuthentication(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Check NextAuth configuration
    const hasAuthOptions = !!authOptions
    const hasProviders = authOptions.providers && authOptions.providers.length > 0
    const hasSecret = !!process.env.NEXTAUTH_SECRET
    const hasUrl = !!process.env.NEXTAUTH_URL
    
    const allConfigured = hasAuthOptions && hasProviders && hasSecret && hasUrl
    
    return {
      component: 'authentication',
      status: allConfigured ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      details: {
        nextAuthConfigured: hasAuthOptions,
        providersCount: authOptions.providers?.length || 0,
        secretConfigured: hasSecret,
        urlConfigured: hasUrl
      }
    }
  } catch (error) {
    return {
      component: 'authentication',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Authentication check failed'
    }
  }
}

async function checkApiRoutes(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Test critical API routes by importing them
    const routes = [
      { name: 'portfolios', path: '@/app/api/portfolios/route' },
      { name: 'companies', path: '@/app/api/companies/route' },
      { name: 'kpis', path: '@/app/api/kpis/route' },
      { name: 'health', path: '@/app/api/health/route' }
    ]
    
    const routeStatus = []
    
    for (const route of routes) {
      try {
        await import(route.path)
        routeStatus.push({ name: route.name, status: 'available' })
      } catch (error) {
        routeStatus.push({ 
          name: route.name, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Import failed'
        })
      }
    }
    
    const availableRoutes = routeStatus.filter(r => r.status === 'available').length
    const totalRoutes = routes.length
    
    return {
      component: 'api_routes',
      status: availableRoutes === totalRoutes ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      details: {
        totalRoutes,
        availableRoutes,
        routes: routeStatus
      }
    }
  } catch (error) {
    return {
      component: 'api_routes',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'API routes check failed'
    }
  }
}

async function checkEnvironment(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  const requiredVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DATABASE_URL'
  ]
  
  const optionalVars = [
    'OPENAI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ]
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName])
  const missingOptional = optionalVars.filter(varName => !process.env[varName])
  
  const status = missingRequired.length === 0 ? 'healthy' : 'unhealthy'
  
  return {
    component: 'environment',
    status,
    responseTime: Date.now() - startTime,
    details: {
      requiredVariables: {
        total: requiredVars.length,
        configured: requiredVars.length - missingRequired.length,
        missing: missingRequired
      },
      optionalVariables: {
        total: optionalVars.length,
        configured: optionalVars.length - missingOptional.length,
        missing: missingOptional
      },
      nodeEnv: process.env.NODE_ENV
    }
  }
}

async function checkExternalServices(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Check if AI services are configured
    const openaiConfigured = !!process.env.OPENAI_API_KEY && process.env.DISABLE_OPENAI !== 'true'
    const openrouterConfigured = !!process.env.OPENROUTER_API_KEY
    
    // Check Supabase configuration
    const supabaseConfigured = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const servicesCount = [openaiConfigured, openrouterConfigured, supabaseConfigured].filter(Boolean).length
    
    return {
      component: 'external_services',
      status: servicesCount >= 1 ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      details: {
        openai: openaiConfigured ? 'configured' : 'not_configured',
        openrouter: openrouterConfigured ? 'configured' : 'not_configured',
        supabase: supabaseConfigured ? 'configured' : 'not_configured',
        configuredServices: servicesCount
      }
    }
  } catch (error) {
    return {
      component: 'external_services',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'External services check failed'
    }
  }
}

async function checkPerformance(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Memory usage
    const memUsage = process.memoryUsage()
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    }
    
    // CPU usage (simplified)
    const uptime = process.uptime()
    
    // Determine status based on memory usage
    const status = memUsageMB.heapUsed < 512 ? 'healthy' : 'degraded'
    
    return {
      component: 'performance',
      status,
      responseTime: Date.now() - startTime,
      details: {
        memory: memUsageMB,
        uptime: Math.round(uptime),
        nodeVersion: process.version,
        platform: process.platform
      }
    }
  } catch (error) {
    return {
      component: 'performance',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Performance check failed'
    }
  }
}

function calculateMetrics(checks: HealthCheck[]) {
  const totalChecks = checks.length
  const healthyChecks = checks.filter(c => c.status === 'healthy').length
  const degradedChecks = checks.filter(c => c.status === 'degraded').length
  const unhealthyChecks = checks.filter(c => c.status === 'unhealthy').length
  const averageResponseTime = Math.round(
    checks.reduce((sum, check) => sum + check.responseTime, 0) / totalChecks
  )
  
  return {
    totalChecks,
    healthyChecks,
    degradedChecks,
    unhealthyChecks,
    averageResponseTime
  }
}

function determineOverallHealth(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyChecks = checks.filter(c => c.status === 'unhealthy')
  const degradedChecks = checks.filter(c => c.status === 'degraded')
  
  if (unhealthyChecks.length > 0) {
    return 'unhealthy'
  } else if (degradedChecks.length > 0) {
    return 'degraded'
  } else {
    return 'healthy'
  }
}

function generateRecommendations(checks: HealthCheck[]): string[] {
  const recommendations: string[] = []
  
  checks.forEach(check => {
    if (check.status === 'unhealthy') {
      switch (check.component) {
        case 'database':
          recommendations.push('Fix database connection - check DATABASE_URL and Supabase configuration')
          break
        case 'authentication':
          recommendations.push('Fix authentication configuration - verify NextAuth setup')
          break
        case 'api_routes':
          recommendations.push('Fix API route imports - check for syntax errors in route files')
          break
        case 'environment':
          recommendations.push('Configure missing environment variables')
          break
        case 'external_services':
          recommendations.push('Configure external services (OpenAI, Supabase, etc.)')
          break
        case 'performance':
          recommendations.push('Investigate performance issues - check memory usage and optimization')
          break
      }
    } else if (check.status === 'degraded') {
      recommendations.push(`Monitor ${check.component} - performance degraded but functional`)
    }
  })
  
  if (recommendations.length === 0) {
    recommendations.push('All systems healthy - continue monitoring')
  }
  
  return recommendations
}
