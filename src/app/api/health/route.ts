import { NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/prisma'
import { llamaHealthCheck } from '@/lib/ai/llama'
import { supabaseHealthCheck } from '@/lib/supabase/server'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Check database connection
    const dbHealth = await checkDatabaseConnection()

    // Simple system health check
    const systemHealth = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    }

    // Check OpenAI (basic check)
    let openaiHealth
    try {
      // Simple check - we'll just verify the API key is present
      openaiHealth = {
        status: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' ? 'healthy' : 'not_configured',
        configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'),
      }
    } catch (error) {
      openaiHealth = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      }
    }

    // Check Llama AI
    const llamaHealth = await llamaHealthCheck()

    // Check Supabase
    const supabaseHealth = await supabaseHealthCheck()

    const responseTime = Date.now() - startTime

    // Enhanced status calculation
    const criticalServices = [dbHealth]
    const optionalServices = [openaiHealth, llamaHealth, supabaseHealth]

    const criticalHealthy = criticalServices.every(service => service.status === 'healthy')
    const hasOptionalServices = optionalServices.some(service => service.status === 'healthy')

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (criticalHealthy && hasOptionalServices) {
      overallStatus = 'healthy'
    } else if (criticalHealthy) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'unhealthy'
    }

    // Calculate service counts
    const serviceCounts = {
      healthy: [dbHealth, systemHealth, openaiHealth, llamaHealth, supabaseHealth]
        .filter(service => service.status === 'healthy').length,
      degraded: [dbHealth, systemHealth, openaiHealth, llamaHealth, supabaseHealth]
        .filter(service => service.status === 'degraded' || service.status === 'not_configured').length,
      unhealthy: [dbHealth, systemHealth, openaiHealth, llamaHealth, supabaseHealth]
        .filter(service => service.status === 'unhealthy').length
    }

    return NextResponse.json({
      success: overallStatus !== 'unhealthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        system: systemHealth,
        openai: openaiHealth,
        llama: llamaHealth,
        supabase: supabaseHealth,
      },
      summary: serviceCounts,
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    }, {
      status: overallStatus === 'unhealthy' ? 503 : 200
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        version: '1.0.0',
        environment: process.env.NODE_ENV,
      },
      { status: 500 }
    )
  }
}
