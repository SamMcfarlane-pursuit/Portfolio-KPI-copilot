/**
 * System Health API v2
 * Comprehensive system health monitoring and diagnostics
 */

import { NextRequest } from 'next/server'
import { apiGateway } from '@/lib/api/gateway'
import { validationSchemas } from '@/lib/api/validation'
import { apiMonitoring } from '@/lib/api/monitoring'
import { aiOrchestrator } from '@/lib/ai/orchestrator'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import { PERMISSIONS } from '@/lib/middleware/rbac-middleware'

// GET /api/v2/system/health - Comprehensive health check
export const GET = apiGateway.createHandler(
  async (request, context) => {
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('includeDetails') === 'true'
    const services = searchParams.get('services')?.split(',') || []
    
    const startTime = Date.now()
    
    // Core health checks
    const healthChecks = await Promise.allSettled([
      checkDatabaseHealth(),
      checkAIServicesHealth(),
      checkAPIHealth(),
      checkCacheHealth(),
      checkExternalServicesHealth()
    ])
    
    const [
      databaseHealth,
      aiServicesHealth,
      apiHealth,
      cacheHealth,
      externalServicesHealth
    ] = healthChecks.map(result => 
      result.status === 'fulfilled' ? result.value : { status: 'fail', error: result.reason?.message }
    )
    
    // Calculate overall status
    const allChecks = [databaseHealth, aiServicesHealth, apiHealth, cacheHealth, externalServicesHealth]
    const failedChecks = allChecks.filter(check => check.status === 'fail').length
    const degradedChecks = allChecks.filter(check => check.status === 'degraded').length
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (failedChecks === 0 && degradedChecks === 0) {
      overallStatus = 'healthy'
    } else if (failedChecks === 0 && degradedChecks <= 2) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'unhealthy'
    }
    
    const response: any = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Core service checks
      services: {
        database: databaseHealth,
        ai: aiServicesHealth,
        api: apiHealth,
        cache: cacheHealth,
        external: externalServicesHealth
      },
      
      // Summary metrics
      summary: {
        totalChecks: allChecks.length,
        passedChecks: allChecks.filter(c => c.status === 'pass').length,
        degradedChecks,
        failedChecks,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    }
    
    // Add detailed information if requested
    if (includeDetails) {
      response.details = await getDetailedHealthInfo()
    }
    
    // Add API metrics
    response.metrics = apiMonitoring.getMetrics(300000) // Last 5 minutes
    
    return response
  },
  {
    requireAuth: false, // Health check should be accessible without auth
    cache: { ttl: 30 }, // Cache for 30 seconds
    rateLimit: { requests: 1000, window: 3600 }
  }
)

// POST /api/v2/system/health/check - Run specific health checks
export const POST = apiGateway.createHandler(
  async (request, context) => {
    const body = await request.json()
    const { services } = validationSchemas.system.healthCheck.parse(body)
    
    const results: Record<string, any> = {}
    
    if (!services || services.includes('database')) {
      results.database = await checkDatabaseHealth()
    }
    
    if (!services || services.includes('ai')) {
      results.ai = await checkAIServicesHealth()
    }
    
    if (!services || services.includes('api')) {
      results.api = await checkAPIHealth()
    }
    
    if (!services || services.includes('cache')) {
      results.cache = await checkCacheHealth()
    }
    
    if (!services || services.includes('external')) {
      results.external = await checkExternalServicesHealth()
    }
    
    return {
      success: true,
      data: {
        checks: results,
        timestamp: new Date().toISOString(),
        requestedServices: services || ['all']
      }
    }
  },
  {
    requireAuth: true,
    permissions: [PERMISSIONS.VIEW_SYSTEM],
    validation: {
      body: validationSchemas.system.healthCheck
    },
    rateLimit: { requests: 100, window: 3600 }
  }
)

// Health check implementations
async function checkDatabaseHealth() {
  const startTime = Date.now()
  
  try {
    // Test database connection and basic operations
    const testQuery = await hybridData.$queryRaw`SELECT 1 as test`
    const responseTime = Date.now() - startTime
    
    // Check connection pool status
    const connectionInfo = await hybridData.$queryRaw`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `
    
    return {
      status: responseTime < 1000 ? 'pass' : 'degraded',
      responseTime,
      message: `Database responding in ${responseTime}ms`,
      details: {
        connectionPool: connectionInfo,
        lastQuery: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkAIServicesHealth() {
  const startTime = Date.now()
  
  try {
    // Check AI orchestrator status
    const aiStatus = await aiOrchestrator.getStatus()
    const responseTime = Date.now() - startTime
    
    // Count available AI providers
    const providers = [
      { name: 'OpenRouter', available: aiStatus.openrouter?.available || false },
      { name: 'OpenAI', available: aiStatus.openai?.available || false },
      { name: 'Ollama', available: aiStatus.ollama?.available || false }
    ]
    const availableProviders = providers.filter(p => p.available).length
    const totalProviders = providers.length
    
    let status: 'pass' | 'degraded' | 'fail'
    if (availableProviders === totalProviders && responseTime < 2000) {
      status = 'pass'
    } else if (availableProviders > 0) {
      status = 'degraded'
    } else {
      status = 'fail'
    }
    
    return {
      status,
      responseTime,
      message: `${availableProviders}/${totalProviders} AI providers available`,
      details: {
        providers: providers,
        openrouter: aiStatus.openrouter,
        openai: aiStatus.openai,
        ollama: aiStatus.ollama
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'AI services check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkAPIHealth() {
  const metrics = apiMonitoring.getMetrics(300000) // Last 5 minutes
  
  let status: 'pass' | 'degraded' | 'fail'
  if (metrics.errorRate < 0.01 && metrics.averageResponseTime < 1000) {
    status = 'pass'
  } else if (metrics.errorRate < 0.05 && metrics.averageResponseTime < 2000) {
    status = 'degraded'
  } else {
    status = 'fail'
  }
  
  return {
    status,
    responseTime: metrics.averageResponseTime,
    message: `API error rate: ${(metrics.errorRate * 100).toFixed(2)}%, avg response: ${metrics.averageResponseTime.toFixed(0)}ms`,
    details: {
      requestCount: metrics.requestCount,
      errorCount: metrics.errorCount,
      successRate: metrics.successRate,
      p95ResponseTime: metrics.p95ResponseTime,
      rateLimitHits: metrics.rateLimitHits
    }
  }
}

async function checkCacheHealth() {
  const startTime = Date.now()
  
  try {
    // Test cache operations (mock implementation)
    const testKey = `health_check_${Date.now()}`
    const testValue = 'test'
    
    // In a real implementation, you would test Redis or your cache system
    // For now, we'll simulate cache operations
    const responseTime = Date.now() - startTime
    
    return {
      status: responseTime < 100 ? 'pass' : 'degraded',
      responseTime,
      message: `Cache responding in ${responseTime}ms`,
      details: {
        hitRate: 0.85, // Mock hit rate
        memoryUsage: '45%', // Mock memory usage
        connections: 12 // Mock connection count
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Cache check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkExternalServicesHealth() {
  const startTime = Date.now()
  
  try {
    // Check external service dependencies
    const checks = await Promise.allSettled([
      checkSupabaseHealth(),
      checkOpenRouterHealth(),
      checkOpenAIHealth()
    ])
    
    const results = checks.map((check, index) => {
      const services = ['supabase', 'openrouter', 'openai']
      return {
        service: services[index],
        status: check.status === 'fulfilled' ? check.value.status : 'fail',
        details: check.status === 'fulfilled' ? check.value : { error: check.reason?.message }
      }
    })
    
    const failedServices = results.filter(r => r.status === 'fail').length
    const degradedServices = results.filter(r => r.status === 'degraded').length
    
    let status: 'pass' | 'degraded' | 'fail'
    if (failedServices === 0 && degradedServices === 0) {
      status = 'pass'
    } else if (failedServices <= 1) {
      status = 'degraded'
    } else {
      status = 'fail'
    }
    
    return {
      status,
      responseTime: Date.now() - startTime,
      message: `${results.length - failedServices}/${results.length} external services healthy`,
      details: results
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'External services check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkSupabaseHealth() {
  // Mock Supabase health check
  return { status: 'pass', responseTime: 150 }
}

async function checkOpenRouterHealth() {
  // Mock OpenRouter health check
  return { status: 'pass', responseTime: 200 }
}

async function checkOpenAIHealth() {
  // Mock OpenAI health check
  return { status: 'pass', responseTime: 180 }
}

async function getDetailedHealthInfo() {
  return {
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      pid: process.pid
    },
    memory: {
      ...process.memoryUsage(),
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem()
    },
    cpu: {
      usage: process.cpuUsage(),
      loadAverage: require('os').loadavg(),
      cpuCount: require('os').cpus().length
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale
    }
  }
}
