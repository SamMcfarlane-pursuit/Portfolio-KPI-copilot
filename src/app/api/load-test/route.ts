import { NextRequest, NextResponse } from 'next/server'

/**
 * Load Testing API
 * Simulates production load to test system stability
 */

export const dynamic = 'force-dynamic'

interface LoadTestConfig {
  duration: number // seconds
  concurrency: number // concurrent requests
  endpoint: string
  method: 'GET' | 'POST'
  data?: any
}

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  requestsPerSecond: number
  errorRate: number
  errors: Array<{
    status: number
    message: string
    count: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config: LoadTestConfig = {
      duration: body.duration || 30,
      concurrency: body.concurrency || 5,
      endpoint: body.endpoint || '/api/health',
      method: body.method || 'GET',
      data: body.data
    }

    // Validate configuration
    if (config.duration > 300) {
      return NextResponse.json(
        { error: 'Maximum test duration is 300 seconds' },
        { status: 400 }
      )
    }

    if (config.concurrency > 20) {
      return NextResponse.json(
        { error: 'Maximum concurrency is 20 requests' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://portfolio-kpi-copilot.vercel.app'
    const testUrl = config.endpoint.startsWith('http') ? 
      config.endpoint : 
      `${baseUrl}${config.endpoint}`

    const results = await runLoadTest(testUrl, config)

    return NextResponse.json({
      success: true,
      config,
      results,
      recommendations: generateLoadTestRecommendations(results)
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Load test failed'
      },
      { status: 500 }
    )
  }
}

async function runLoadTest(url: string, config: LoadTestConfig): Promise<LoadTestResult> {
  const startTime = Date.now()
  const endTime = startTime + (config.duration * 1000)
  
  const results = {
    responseTimes: [] as number[],
    statuses: [] as number[],
    errors: new Map<string, number>()
  }

  const workers: Promise<void>[] = []

  // Create concurrent workers
  for (let i = 0; i < config.concurrency; i++) {
    workers.push(
      runWorker(url, config, endTime, results)
    )
  }

  // Wait for all workers to complete
  await Promise.all(workers)

  // Calculate final results
  const totalRequests = results.responseTimes.length
  const successfulRequests = results.statuses.filter(s => s >= 200 && s < 400).length
  const failedRequests = totalRequests - successfulRequests
  
  const averageResponseTime = totalRequests > 0 ? 
    Math.round(results.responseTimes.reduce((a, b) => a + b, 0) / totalRequests) : 0
  
  const minResponseTime = totalRequests > 0 ? Math.min(...results.responseTimes) : 0
  const maxResponseTime = totalRequests > 0 ? Math.max(...results.responseTimes) : 0
  
  const actualDuration = (Date.now() - startTime) / 1000
  const requestsPerSecond = Math.round(totalRequests / actualDuration)
  
  const errorRate = totalRequests > 0 ? Math.round((failedRequests / totalRequests) * 100) : 0

  const errors = Array.from(results.errors.entries()).map(([message, count]) => {
    const [status, msg] = message.split(':', 2)
    return {
      status: parseInt(status) || 0,
      message: msg || message,
      count
    }
  })

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime,
    minResponseTime,
    maxResponseTime,
    requestsPerSecond,
    errorRate,
    errors
  }
}

async function runWorker(
  url: string, 
  config: LoadTestConfig, 
  endTime: number, 
  results: any
): Promise<void> {
  while (Date.now() < endTime) {
    const requestStart = Date.now()
    
    try {
      const response = await fetch(url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Portfolio-KPI-Copilot-LoadTest'
        },
        body: config.method === 'POST' && config.data ? 
          JSON.stringify(config.data) : undefined
      })

      const responseTime = Date.now() - requestStart
      
      results.responseTimes.push(responseTime)
      results.statuses.push(response.status)

      if (!response.ok) {
        const errorKey = `${response.status}:${response.statusText}`
        results.errors.set(errorKey, (results.errors.get(errorKey) || 0) + 1)
      }

    } catch (error) {
      const responseTime = Date.now() - requestStart
      results.responseTimes.push(responseTime)
      results.statuses.push(0)
      
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      const errorKey = `0:${errorMessage}`
      results.errors.set(errorKey, (results.errors.get(errorKey) || 0) + 1)
    }

    // Small delay to prevent overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

function generateLoadTestRecommendations(results: LoadTestResult): string[] {
  const recommendations: string[] = []

  // Response time recommendations
  if (results.averageResponseTime > 2000) {
    recommendations.push('CRITICAL: Average response time exceeds 2 seconds - optimize database queries and API performance')
  } else if (results.averageResponseTime > 1000) {
    recommendations.push('WARNING: Average response time exceeds 1 second - consider performance optimization')
  } else if (results.averageResponseTime < 500) {
    recommendations.push('EXCELLENT: Response times are optimal for production')
  }

  // Error rate recommendations
  if (results.errorRate > 5) {
    recommendations.push('CRITICAL: Error rate exceeds 5% - investigate and fix failing requests')
  } else if (results.errorRate > 1) {
    recommendations.push('WARNING: Error rate exceeds 1% - monitor for potential issues')
  } else if (results.errorRate === 0) {
    recommendations.push('EXCELLENT: Zero error rate - system is stable under load')
  }

  // Throughput recommendations
  if (results.requestsPerSecond < 10) {
    recommendations.push('WARNING: Low throughput - consider scaling or optimization')
  } else if (results.requestsPerSecond > 50) {
    recommendations.push('EXCELLENT: High throughput - system handles load well')
  }

  // Specific error analysis
  if (results.errors.length > 0) {
    const criticalErrors = results.errors.filter(e => e.status >= 500)
    const authErrors = results.errors.filter(e => e.status === 401 || e.status === 403)
    
    if (criticalErrors.length > 0) {
      recommendations.push('CRITICAL: Server errors detected - check application logs and fix issues')
    }
    
    if (authErrors.length > 0) {
      recommendations.push('INFO: Authentication errors expected for protected endpoints')
    }
  }

  // Performance variance recommendations
  const responseTimeVariance = results.maxResponseTime - results.minResponseTime
  if (responseTimeVariance > 5000) {
    recommendations.push('WARNING: High response time variance - investigate performance inconsistencies')
  }

  return recommendations
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const preset = searchParams.get('preset') || 'basic'

  const presets = {
    basic: {
      duration: 30,
      concurrency: 3,
      endpoint: '/api/health',
      method: 'GET' as const
    },
    api_stress: {
      duration: 60,
      concurrency: 10,
      endpoint: '/api/system/status',
      method: 'GET' as const
    },
    auth_test: {
      duration: 30,
      concurrency: 5,
      endpoint: '/api/portfolios',
      method: 'GET' as const
    },
    comprehensive: {
      duration: 120,
      concurrency: 15,
      endpoint: '/api/production-health',
      method: 'GET' as const
    }
  }

  const config = presets[preset as keyof typeof presets] || presets.basic

  return NextResponse.json({
    success: true,
    availablePresets: Object.keys(presets),
    selectedPreset: preset,
    config,
    instructions: {
      usage: 'POST to this endpoint with custom config or use GET with ?preset=<preset_name>',
      example: {
        method: 'POST',
        body: {
          duration: 60,
          concurrency: 10,
          endpoint: '/api/health',
          method: 'GET'
        }
      }
    }
  })
}
