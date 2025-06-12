import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for system status
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Unified System Status API
 * Consolidates all system health checks into a single endpoint
 */

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'error'
  message: string
  responseTime?: number
  details?: any
}

interface SystemStatusResponse {
  overall: 'healthy' | 'partial' | 'error'
  services: {
    database: ServiceStatus
    ai: ServiceStatus
    api: ServiceStatus
  }
  capabilities: {
    aiChat: boolean
    dataEntry: boolean
    analytics: boolean
  }
  timestamp: string
  version: string
}

async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`
    
    // Test basic operations
    const portfolioCount = await prisma.portfolio.count()
    const organizationCount = await prisma.organization.count()
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime,
      details: {
        portfolios: portfolioCount,
        organizations: organizationCount
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Database health check failed:', error)
    
    return {
      status: 'error',
      message: 'Database connection failed',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function checkAI(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    // Check if Llama AI is available
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/demo/llama-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'health check',
        context: 'system_test'
      })
    })
    
    const data = await response.json()
    const responseTime = Date.now() - startTime
    
    if (data.llamaAvailable || data.success) {
      return {
        status: 'healthy',
        message: 'AI services operational',
        responseTime,
        details: {
          provider: data.metadata?.aiProvider || 'llama',
          llamaAvailable: data.llamaAvailable
        }
      }
    } else {
      return {
        status: 'degraded',
        message: 'AI services limited',
        responseTime,
        details: {
          fallbackMode: true,
          reason: 'Llama AI unavailable'
        }
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('AI health check failed:', error)
    
    return {
      status: 'error',
      message: 'AI services unavailable',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function checkAPI(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    // Test core API endpoints
    const portfolioResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/portfolios`)
    const organizationResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/organizations`)
    
    const responseTime = Date.now() - startTime
    
    if (portfolioResponse.ok && organizationResponse.ok) {
      return {
        status: 'healthy',
        message: 'API endpoints operational',
        responseTime,
        details: {
          portfoliosEndpoint: portfolioResponse.status,
          organizationsEndpoint: organizationResponse.status
        }
      }
    } else {
      return {
        status: 'degraded',
        message: 'Some API endpoints unavailable',
        responseTime,
        details: {
          portfoliosEndpoint: portfolioResponse.status,
          organizationsEndpoint: organizationResponse.status
        }
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('API health check failed:', error)
    
    return {
      status: 'error',
      message: 'API services unavailable',
      responseTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const debug = searchParams.get('debug') === 'true'

    // Add debug info if requested
    if (debug) {
      const databaseUrl = process.env.DATABASE_URL
      return NextResponse.json({
        debug: true,
        database: {
          url: databaseUrl ? databaseUrl.substring(0, 30) + '...' : 'NOT_SET',
          type: databaseUrl?.startsWith('postgresql') ? 'PostgreSQL' :
                databaseUrl?.startsWith('file:') ? 'SQLite' : 'Unknown',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?
                      process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 40) + '...' : 'NOT_SET',
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

    // Run all health checks in parallel
    const [databaseStatus, aiStatus, apiStatus] = await Promise.all([
      checkDatabase(),
      checkAI(),
      checkAPI()
    ])

    // Determine overall system status
    let overall: 'healthy' | 'partial' | 'error' = 'error'
    
    if (databaseStatus.status === 'healthy' && apiStatus.status === 'healthy') {
      if (aiStatus.status === 'healthy') {
        overall = 'healthy'
      } else {
        overall = 'partial'
      }
    } else if (databaseStatus.status === 'healthy' || apiStatus.status === 'healthy') {
      overall = 'partial'
    }

    // Determine capabilities
    const capabilities = {
      aiChat: aiStatus.status !== 'error' && apiStatus.status !== 'error',
      dataEntry: databaseStatus.status !== 'error' && apiStatus.status !== 'error',
      analytics: databaseStatus.status !== 'error' && apiStatus.status !== 'error'
    }

    const response: SystemStatusResponse = {
      overall,
      services: {
        database: databaseStatus,
        ai: aiStatus,
        api: apiStatus
      },
      capabilities,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('System status check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check system status',
      data: {
        overall: 'error',
        services: {
          database: { status: 'error', message: 'Check failed' },
          ai: { status: 'error', message: 'Check failed' },
          api: { status: 'error', message: 'Check failed' }
        },
        capabilities: {
          aiChat: false,
          dataEntry: false,
          analytics: false
        },
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      }
    }, { status: 500 })
  }
}
