import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/prisma'
import { aiOrchestrator } from '@/lib/ai/orchestrator'

/**
 * Comprehensive System Status API
 * Provides detailed health information for all backend services
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Run all health checks in parallel for better performance
    const [
      databaseHealth,
      aiHealth,
      systemMetrics
    ] = await Promise.allSettled([
      checkDatabaseConnection(),
      checkAIServices(),
      getSystemMetrics()
    ])

    // Process results
    const dbStatus = databaseHealth.status === 'fulfilled' ? databaseHealth.value : { status: 'error', error: databaseHealth.reason }
    const aiStatus = aiHealth.status === 'fulfilled' ? aiHealth.value : { status: 'error', error: aiHealth.reason }
    const system = systemMetrics.status === 'fulfilled' ? systemMetrics.value : { status: 'error', error: systemMetrics.reason }

    // Determine overall system health
    const criticalServices = [dbStatus]
    const aiServices = [aiStatus]

    const criticalHealthy = criticalServices.every(service => service.status === 'healthy')
    const hasWorkingAI = aiServices.some(service => service.status === 'healthy')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (criticalHealthy && hasWorkingAI) {
      overallStatus = 'healthy'
    } else if (criticalHealthy) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'unhealthy'
    }

    // Calculate service counts
    const allServices = [dbStatus, aiStatus, system]
    const serviceCounts = {
      healthy: allServices.filter(s => s.status === 'healthy').length,
      degraded: allServices.filter(s => s.status === 'degraded' || s.status === 'not_configured').length,
      unhealthy: allServices.filter(s => s.status === 'unhealthy' || s.status === 'error').length
    }

    // Determine best AI provider
    let recommendedAI = 'none'
    if (aiStatus.status === 'healthy' && 'available' in aiStatus && aiStatus.available) {
      if (aiStatus.providers?.openrouter?.available) {
        recommendedAI = 'openrouter'
      } else if (aiStatus.providers?.openai?.available) {
        recommendedAI = 'openai'
      } else if (aiStatus.providers?.ollama?.available) {
        recommendedAI = 'ollama'
      }
    }

    const responseTime = Date.now() - startTime

    const response = {
      success: overallStatus !== 'unhealthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      
      // Core Services
      services: {
        database: dbStatus,
        system: system,
        ai: {
          recommended: recommendedAI,
          status: aiStatus,
          providers: ('providers' in aiStatus) ? aiStatus.providers : {}
        }
      },

      // Service Summary
      summary: {
        total: allServices.length,
        ...serviceCounts
      },

      // Capabilities
      capabilities: {
        dataStorage: dbStatus.status === 'healthy',
        aiAnalysis: hasWorkingAI,
        kpiProcessing: criticalHealthy && hasWorkingAI,
        portfolioAnalysis: criticalHealthy && hasWorkingAI,
        realTimeData: dbStatus.status === 'healthy',
        openrouter: ('providers' in aiStatus) ? aiStatus.providers?.openrouter?.available || false : false,
        openai: ('providers' in aiStatus) ? aiStatus.providers?.openai?.available || false : false,
        ollama: ('providers' in aiStatus) ? aiStatus.providers?.ollama?.available || false : false
      },

      // Environment Info
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        nodeVersion: process.version,
        isProduction: process.env.NODE_ENV === 'production',
        isVercel: !!process.env.VERCEL_URL
      },

      // Recommendations
      recommendations: generateRecommendations(overallStatus, {
        database: dbStatus,
        aiStatus,
        hasWorkingAI
      })
    }

    return NextResponse.json(response, {
      status: overallStatus === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Comprehensive status check error:', error)
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      responseTime: `${Date.now() - startTime}ms`
    }, { status: 500 })
  }
}

// Helper function to check AI services
async function checkAIServices() {
  try {
    const aiStatus = await aiOrchestrator.getStatus()

    return {
      status: aiStatus.available ? 'healthy' : 'not_configured',
      available: aiStatus.available,
      providers: aiStatus,
      message: aiStatus.available ?
        'AI services are available for analysis' :
        'No AI services configured. Set up OpenRouter, OpenAI, or Ollama for AI features.',
      lastChecked: new Date().toISOString(),
      type: 'orchestrated'
    }
  } catch (error) {
    return {
      status: 'error',
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'orchestrated'
    }
  }
}



// Helper function to get system metrics
async function getSystemMetrics() {
  try {
    const memoryUsage = process.memoryUsage()
    
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Helper function to generate recommendations
function generateRecommendations(
  overallStatus: string,
  services: {
    database: any
    aiStatus: any
    hasWorkingAI: boolean
  }
) {
  const recommendations: string[] = []

  if (overallStatus === 'unhealthy') {
    recommendations.push('🚨 Critical: System is unhealthy. Check database connectivity immediately.')
  }

  if (services.database.status !== 'healthy') {
    recommendations.push('🔧 Database: Verify DATABASE_URL and database server availability.')
  }

  if (!services.hasWorkingAI) {
    recommendations.push('🤖 AI Services: No AI providers available. Consider setting up OpenRouter, OpenAI, or Ollama.')
  }

  if ('providers' in services.aiStatus &&
      !services.aiStatus.providers?.openrouter?.available &&
      !services.aiStatus.providers?.openai?.available) {
    recommendations.push('⚡ Performance: Configure OpenRouter or OpenAI for enhanced AI capabilities.')
  }

  if (overallStatus === 'healthy') {
    recommendations.push('✅ System is operating optimally. All core services are healthy.')
  }

  return recommendations
}
