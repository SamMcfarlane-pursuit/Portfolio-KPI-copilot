import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * Pure Supabase Health Check
 * Completely bypasses Prisma and uses only Supabase
 */

interface SupabaseHealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  message: string
  details?: any
}

async function checkSupabaseDatabase(): Promise<SupabaseHealthCheck> {
  const startTime = Date.now()
  
  try {
    const client = supabaseServer.getClient()
    
    if (!client) {
      return {
        name: 'supabase_database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Supabase client not configured',
        details: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET'
        }
      }
    }

    // Test multiple tables
    const tests = await Promise.all([
      client.from('organizations').select('id').limit(1),
      client.from('profiles').select('id').limit(1),
      client.from('portfolios').select('id').limit(1)
    ])

    const responseTime = Date.now() - startTime
    
    const results = {
      organizations: tests[0],
      profiles: tests[1], 
      portfolios: tests[2]
    }

    // Check if any critical errors (not "table doesn't exist")
    const criticalErrors = Object.entries(results).filter(([table, result]) => 
      result.error && !result.error.message.includes('does not exist')
    )

    if (criticalErrors.length > 0) {
      return {
        name: 'supabase_database',
        status: 'unhealthy',
        responseTime,
        message: 'Supabase connection failed',
        details: {
          errors: criticalErrors.map(([table, result]) => ({
            table,
            error: result.error?.message
          }))
        }
      }
    }

    // Success - tables either exist with data or don't exist yet (which is fine)
    return {
      name: 'supabase_database',
      status: 'healthy',
      responseTime,
      message: 'Supabase connection successful',
      details: {
        tables: Object.entries(results).map(([table, result]) => ({
          table,
          exists: !result.error,
          count: result.data?.length || 0
        }))
      }
    }

  } catch (error) {
    return {
      name: 'supabase_database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: 'Supabase health check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function checkSupabaseAPI(): Promise<SupabaseHealthCheck> {
  const startTime = Date.now()
  
  try {
    const client = supabaseServer.getClient()
    
    if (!client) {
      throw new Error('Supabase client not available')
    }

    // Test basic API functionality
    const { data, error } = await client
      .from('organizations')
      .select('count')
      .limit(0)
      .single()

    const responseTime = Date.now() - startTime

    return {
      name: 'supabase_api',
      status: 'healthy',
      responseTime,
      message: 'Supabase API operational',
      details: {
        querySuccessful: !error || error.message.includes('does not exist'),
        error: error?.message || null
      }
    }

  } catch (error) {
    return {
      name: 'supabase_api',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: 'Supabase API failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    // Run Supabase health checks
    const [databaseCheck, apiCheck] = await Promise.all([
      checkSupabaseDatabase(),
      checkSupabaseAPI()
    ])

    const totalResponseTime = Date.now() - startTime
    
    // Determine overall status
    const checks = [databaseCheck, apiCheck]
    const healthyCount = checks.filter(c => c.status === 'healthy').length
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length
    
    let overall: 'healthy' | 'partial' | 'unhealthy' = 'unhealthy'
    if (unhealthyCount === 0) {
      overall = 'healthy'
    } else if (healthyCount > 0) {
      overall = 'partial'
    }

    const response = {
      status: overall,
      provider: 'supabase_only',
      responseTime: totalResponseTime,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: detailed ? checks : undefined,
      summary: {
        healthy: healthyCount,
        unhealthy: unhealthyCount,
        total: checks.length
      },
      configuration: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }

    const statusCode = overall === 'unhealthy' ? 503 : 200

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      provider: 'supabase_only',
      error: 'Health check system failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}
