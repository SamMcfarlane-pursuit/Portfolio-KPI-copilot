/**
 * Production Health Check API
 * Comprehensive health monitoring endpoint for enterprise deployment
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/monitoring/health-monitor'

// Force dynamic rendering for health checks
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET comprehensive health check
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    const component = searchParams.get('component')
    const debug = searchParams.get('debug') === 'true'

    // Record this request
    const responseTime = Date.now() - startTime
    healthMonitor.recordRequest(responseTime, false)

    if (debug) {
      // Return debug information including database configuration
      const databaseUrl = process.env.DATABASE_URL
      return NextResponse.json({
        debug: true,
        database: {
          url: databaseUrl ? databaseUrl.substring(0, 50) + '...' : 'NOT_SET',
          fullUrlStart: databaseUrl ? databaseUrl.substring(0, 80) : 'NOT_SET',
          type: databaseUrl?.startsWith('postgresql') ? 'PostgreSQL' :
                databaseUrl?.startsWith('file:') ? 'SQLite' : 'Unknown',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?
                      process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 50) + '...' : 'NOT_SET',
          useSupabasePrimary: process.env.USE_SUPABASE_PRIMARY,
          fallbackToSqlite: process.env.FALLBACK_TO_SQLITE
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercelUrl: process.env.VERCEL_URL
        },
        timestamp: new Date().toISOString()
      })
    }

    if (component) {
      // Check specific component
      const health = await healthMonitor.performHealthCheck()
      const componentCheck = health.checks.find(c => c.name === component)

      if (!componentCheck) {
        return NextResponse.json(
          { error: 'Component not found', available: health.checks.map(c => c.name) },
          { status: 404 }
        )
      }

      return NextResponse.json({
        component: componentCheck,
        timestamp: new Date().toISOString()
      })
    }

    // Full health check
    const health = await healthMonitor.performHealthCheck()

    // Return appropriate response based on health status
    const statusCode = health.overall === 'healthy' ? 200 :
                      health.overall === 'degraded' ? 200 : 503

    const response = detailed ? health : {
      status: health.overall,
      uptime: health.uptime,
      version: health.version,
      environment: health.environment,
      timestamp: health.timestamp,
      summary: {
        healthy: health.checks.filter(c => c.status === 'healthy').length,
        degraded: health.checks.filter(c => c.status === 'degraded').length,
        unhealthy: health.checks.filter(c => c.status === 'unhealthy').length,
        total: health.checks.length
      }
    }

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Health check error:', error)

    // Record error
    const responseTime = Date.now() - startTime
    healthMonitor.recordRequest(responseTime, true)

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}

// HEAD request for simple health check (used by load balancers)
export async function HEAD(request: NextRequest) {
  try {
    const health = await healthMonitor.performHealthCheck()
    const statusCode = health.overall === 'unhealthy' ? 503 : 200

    return new NextResponse(null, {
      status: statusCode,
      headers: {
        'X-Health-Status': health.overall,
        'X-Uptime': health.uptime.toString(),
        'X-Version': health.version
      }
    })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
