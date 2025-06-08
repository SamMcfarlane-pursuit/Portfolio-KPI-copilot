import { NextRequest, NextResponse } from 'next/server'
import { checkOpenAIHealth } from '@/lib/openai'
import { systemCoordinator } from '@/lib/system/SystemCoordinator'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const timestamp = new Date().toISOString()
    
    // Comprehensive health check
    const healthChecks = await Promise.allSettled([
      // Database health
      checkDatabaseHealth(),
      
      // AI services health
      checkOpenAIHealth(),
      
      // System coordinator health
      systemCoordinator.getSystemStatus(),
      
      // Memory and performance check
      checkSystemPerformance()
    ])

    const results = {
      timestamp,
      status: 'healthy',
      checks: {
        database: getCheckResult(healthChecks[0]),
        ai: getCheckResult(healthChecks[1]),
        system: getCheckResult(healthChecks[2]),
        performance: getCheckResult(healthChecks[3])
      },
      metadata: {
        environment: process.env.NODE_ENV,
        region: process.env.VERCEL_REGION || 'unknown',
        deployment: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local'
      }
    }

    // Determine overall status
    const hasUnhealthy = Object.values(results.checks).some(
      check => check.status === 'unhealthy'
    )
    
    if (hasUnhealthy) {
      results.status = 'degraded'
    }

    // Log health check results
    console.log('Health check completed:', {
      status: results.status,
      timestamp,
      checks: Object.entries(results.checks).map(([key, check]) => ({
        service: key,
        status: check.status
      }))
    })

    return NextResponse.json(results, {
      status: results.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        environment: process.env.NODE_ENV,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}

async function checkDatabaseHealth() {
  try {
    // Simple database connectivity check
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    
    return {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: Date.now()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkSystemPerformance() {
  const memoryUsage = process.memoryUsage()
  const uptime = process.uptime()
  
  // Check memory usage (warn if over 80% of 1GB limit)
  const memoryUsagePercent = (memoryUsage.heapUsed / (1024 * 1024 * 1024)) * 100
  
  return {
    status: memoryUsagePercent > 80 ? 'degraded' : 'healthy',
    message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
    metrics: {
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    }
  }
}

function getCheckResult(result: PromiseSettledResult<any>) {
  if (result.status === 'fulfilled') {
    return result.value
  } else {
    return {
      status: 'unhealthy',
      message: 'Check failed',
      error: result.reason?.message || 'Unknown error'
    }
  }
}

// Also handle POST for manual health checks
export async function POST(request: NextRequest) {
  return GET(request)
}
