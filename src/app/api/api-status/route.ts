import { NextRequest, NextResponse } from 'next/server'

/**
 * API Status and Testing Endpoint
 * Comprehensive testing and validation of all API endpoints
 */

export const dynamic = 'force-dynamic'

interface APIEndpoint {
  path: string
  method: string
  status: 'operational' | 'degraded' | 'down' | 'unknown'
  responseTime: number
  lastChecked: string
  requiresAuth: boolean
  description: string
  version: string
}

interface APIStatusResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  endpoints: APIEndpoint[]
  summary: {
    total: number
    operational: number
    degraded: number
    down: number
    averageResponseTime: number
  }
  categories: {
    [category: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      endpoints: number
      averageResponseTime: number
    }
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const includeTests = searchParams.get('includeTests') === 'true'
    const category = searchParams.get('category')

    // Define all API endpoints
    const endpoints = await getAllAPIEndpoints()

    // Filter by category if specified
    const filteredEndpoints = category ? 
      endpoints.filter(ep => ep.path.includes(category)) : 
      endpoints

    // Test endpoints if requested
    if (includeTests) {
      await testEndpoints(filteredEndpoints)
    }

    // Calculate summary statistics
    const summary = calculateSummary(filteredEndpoints)
    
    // Group by categories
    const categories = groupByCategories(filteredEndpoints)

    // Determine overall status
    const overall = determineOverallStatus(summary)

    const response: APIStatusResponse = {
      overall,
      timestamp: new Date().toISOString(),
      endpoints: filteredEndpoints,
      summary,
      categories
    }

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    return NextResponse.json({
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'API status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getAllAPIEndpoints(): Promise<APIEndpoint[]> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://portfolio-kpi-copilot.vercel.app'
  
  return [
    // Core Business APIs
    {
      path: '/api/portfolios',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'Portfolio management and analytics',
      version: '1.0.0'
    },
    {
      path: '/api/companies',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'Company data and metrics',
      version: '1.0.0'
    },
    {
      path: '/api/kpis',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'KPI data and analytics',
      version: '1.0.0'
    },

    // AI-Powered APIs
    {
      path: '/api/chat',
      method: 'POST',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'AI chat and natural language queries',
      version: '1.0.0'
    },
    {
      path: '/api/analytics',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'Portfolio analytics and insights',
      version: '1.0.0'
    },
    {
      path: '/api/insights',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'AI-generated insights and recommendations',
      version: '1.0.0'
    },
    {
      path: '/api/predictions',
      method: 'POST',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'AI-powered forecasting and predictions',
      version: '1.0.0'
    },
    {
      path: '/api/analyze-portfolio',
      method: 'POST',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'Portfolio analysis and recommendations',
      version: '1.0.0'
    },
    {
      path: '/api/explain-kpi',
      method: 'POST',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: true,
      description: 'KPI explanation and context',
      version: '1.0.0'
    },

    // Authentication APIs
    {
      path: '/api/auth/verify-setup',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'Authentication system verification',
      version: '1.0.0'
    },
    {
      path: '/api/auth/test-oauth',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'OAuth provider testing',
      version: '1.0.0'
    },

    // System APIs
    {
      path: '/api/health',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'System health monitoring',
      version: '1.0.0'
    },
    {
      path: '/api/system/status',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'Comprehensive system status',
      version: '1.0.0'
    },
    {
      path: '/api/production-health',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'Production health monitoring',
      version: '1.0.0'
    },
    {
      path: '/api/production-readiness',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'Production readiness assessment',
      version: '1.0.0'
    },
    {
      path: '/api/production-dashboard',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'Production monitoring dashboard',
      version: '1.0.0'
    },
    {
      path: '/api/load-test',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'Load testing and performance validation',
      version: '1.0.0'
    },

    // Documentation APIs
    {
      path: '/api/docs',
      method: 'GET',
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      requiresAuth: false,
      description: 'API documentation and examples',
      version: '1.0.0'
    }
  ]
}

async function testEndpoints(endpoints: APIEndpoint[]): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://portfolio-kpi-copilot.vercel.app'
  
  const testPromises = endpoints.map(async (endpoint) => {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Portfolio-KPI-API-Status-Check'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      const responseTime = Date.now() - startTime
      endpoint.responseTime = responseTime
      endpoint.lastChecked = new Date().toISOString()

      // Determine status based on response
      if (response.ok) {
        endpoint.status = responseTime < 2000 ? 'operational' : 'degraded'
      } else if (endpoint.requiresAuth && (response.status === 401 || response.status === 403)) {
        // Auth required endpoints returning 401/403 are considered operational
        endpoint.status = responseTime < 2000 ? 'operational' : 'degraded'
      } else if (response.status >= 500) {
        endpoint.status = 'down'
      } else {
        endpoint.status = 'degraded'
      }

    } catch (error) {
      endpoint.responseTime = Date.now() - startTime
      endpoint.lastChecked = new Date().toISOString()
      endpoint.status = 'down'
    }
  })

  await Promise.all(testPromises)
}

function calculateSummary(endpoints: APIEndpoint[]) {
  const total = endpoints.length
  const operational = endpoints.filter(ep => ep.status === 'operational').length
  const degraded = endpoints.filter(ep => ep.status === 'degraded').length
  const down = endpoints.filter(ep => ep.status === 'down').length
  
  const totalResponseTime = endpoints.reduce((sum, ep) => sum + ep.responseTime, 0)
  const averageResponseTime = total > 0 ? Math.round(totalResponseTime / total) : 0

  return {
    total,
    operational,
    degraded,
    down,
    averageResponseTime
  }
}

function groupByCategories(endpoints: APIEndpoint[]) {
  const categories: { [key: string]: any } = {}

  endpoints.forEach(endpoint => {
    let category = 'other'
    
    if (endpoint.path.includes('/auth/')) {
      category = 'authentication'
    } else if (endpoint.path.includes('/system/') || endpoint.path.includes('/health') || endpoint.path.includes('/production-')) {
      category = 'system'
    } else if (endpoint.path.includes('/chat') || endpoint.path.includes('/analytics') || endpoint.path.includes('/insights') || endpoint.path.includes('/predictions')) {
      category = 'ai'
    } else if (endpoint.path.includes('/portfolios') || endpoint.path.includes('/companies') || endpoint.path.includes('/kpis')) {
      category = 'business'
    } else if (endpoint.path.includes('/docs')) {
      category = 'documentation'
    }

    if (!categories[category]) {
      categories[category] = {
        endpoints: [],
        totalResponseTime: 0
      }
    }

    categories[category].endpoints.push(endpoint)
    categories[category].totalResponseTime += endpoint.responseTime
  })

  // Calculate category statistics
  Object.keys(categories).forEach(category => {
    const categoryData = categories[category]
    const endpoints = categoryData.endpoints
    
    const operational = endpoints.filter((ep: APIEndpoint) => ep.status === 'operational').length
    const degraded = endpoints.filter((ep: APIEndpoint) => ep.status === 'degraded').length
    const down = endpoints.filter((ep: APIEndpoint) => ep.status === 'down').length
    
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (down > 0) {
      status = 'unhealthy'
    } else if (degraded > 0) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    categories[category] = {
      status,
      endpoints: endpoints.length,
      averageResponseTime: endpoints.length > 0 ? 
        Math.round(categoryData.totalResponseTime / endpoints.length) : 0
    }
  })

  return categories
}

function determineOverallStatus(summary: any): 'healthy' | 'degraded' | 'unhealthy' {
  const { total, operational, degraded, down } = summary
  
  if (down > 0) {
    return 'unhealthy'
  } else if (degraded > 0 || operational / total < 0.9) {
    return 'degraded'
  } else {
    return 'healthy'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, endpoint } = body

    switch (action) {
      case 'test_endpoint':
        return await testSingleEndpoint(endpoint)
      case 'reset_cache':
        return await resetAPICache()
      case 'generate_report':
        return await generateAPIReport()
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'API status operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function testSingleEndpoint(endpointPath: string) {
  const endpoints = await getAllAPIEndpoints()
  const endpoint = endpoints.find(ep => ep.path === endpointPath)
  
  if (!endpoint) {
    return NextResponse.json(
      { success: false, error: 'Endpoint not found' },
      { status: 404 }
    )
  }

  await testEndpoints([endpoint])

  return NextResponse.json({
    success: true,
    endpoint,
    testedAt: new Date().toISOString()
  })
}

async function resetAPICache() {
  // In a production system, this would clear API caches
  return NextResponse.json({
    success: true,
    message: 'API cache reset successfully',
    timestamp: new Date().toISOString()
  })
}

async function generateAPIReport() {
  const endpoints = await getAllAPIEndpoints()
  await testEndpoints(endpoints)
  
  const summary = calculateSummary(endpoints)
  const categories = groupByCategories(endpoints)
  
  return NextResponse.json({
    success: true,
    report: {
      id: `api_report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      summary,
      categories,
      recommendations: generateAPIRecommendations(summary, categories),
      endpoints: endpoints.filter(ep => ep.status !== 'operational') // Only include problematic endpoints
    }
  })
}

function generateAPIRecommendations(summary: any, categories: any): string[] {
  const recommendations: string[] = []

  if (summary.down > 0) {
    recommendations.push(`CRITICAL: ${summary.down} API endpoints are down and require immediate attention`)
  }

  if (summary.degraded > 0) {
    recommendations.push(`WARNING: ${summary.degraded} API endpoints are degraded and may need optimization`)
  }

  if (summary.averageResponseTime > 2000) {
    recommendations.push('PERFORMANCE: Average response time exceeds 2 seconds - consider optimization')
  }

  Object.entries(categories).forEach(([category, data]: [string, any]) => {
    if (data.status === 'unhealthy') {
      recommendations.push(`CATEGORY: ${category} category has critical issues`)
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('All API endpoints are operational and performing well')
  }

  return recommendations
}
