import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/prisma'
import { isLlamaAvailable } from '@/lib/ai/llama'
import { isOllamaCloudAvailable, ollamaCloudService } from '@/lib/ai/ollama-cloud'
import { ollamaService } from '@/lib/ollama'

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
      localOllamaHealth,
      cloudOllamaHealth,
      systemMetrics
    ] = await Promise.allSettled([
      checkDatabaseConnection(),
      checkLocalOllama(),
      checkCloudOllama(),
      getSystemMetrics()
    ])

    // Process results
    const dbStatus = databaseHealth.status === 'fulfilled' ? databaseHealth.value : { status: 'error', error: databaseHealth.reason }
    const localOllama = localOllamaHealth.status === 'fulfilled' ? localOllamaHealth.value : { status: 'error', error: localOllamaHealth.reason }
    const cloudOllama = cloudOllamaHealth.status === 'fulfilled' ? cloudOllamaHealth.value : { status: 'error', error: cloudOllamaHealth.reason }
    const system = systemMetrics.status === 'fulfilled' ? systemMetrics.value : { status: 'error', error: systemMetrics.reason }

    // Determine overall system health
    const criticalServices = [dbStatus]
    const aiServices = [localOllama, cloudOllama]
    
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
    const allServices = [dbStatus, localOllama, cloudOllama, system]
    const serviceCounts = {
      healthy: allServices.filter(s => s.status === 'healthy').length,
      degraded: allServices.filter(s => s.status === 'degraded' || s.status === 'not_configured').length,
      unhealthy: allServices.filter(s => s.status === 'unhealthy' || s.status === 'error').length
    }

    // Determine best AI provider
    let recommendedAI = 'none'
    if (cloudOllama.status === 'healthy') {
      recommendedAI = 'ollama-cloud'
    } else if (localOllama.status === 'healthy') {
      recommendedAI = 'ollama-local'
    } else {
      recommendedAI = 'fallback'
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
          providers: {
            'ollama-cloud': cloudOllama,
            'ollama-local': localOllama
          }
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
        cloudAI: cloudOllama.status === 'healthy',
        localAI: localOllama.status === 'healthy'
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
        cloudOllama,
        localOllama,
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

// Helper function to check local Ollama
async function checkLocalOllama() {
  try {
    const isAvailable = await isLlamaAvailable()
    const status = ollamaService.getStatus()
    
    return {
      status: isAvailable ? 'healthy' : 'not_configured',
      available: isAvailable,
      ...status,
      type: 'local'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      available: false,
      error: error instanceof Error ? error.message : String(error),
      type: 'local'
    }
  }
}

// Helper function to check cloud Ollama
async function checkCloudOllama() {
  try {
    const isAvailable = await isOllamaCloudAvailable()
    const status = ollamaCloudService.getStatus()
    
    return {
      status: isAvailable ? 'healthy' : 'not_configured',
      available: isAvailable,
      ...status,
      type: 'cloud'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      available: false,
      error: error instanceof Error ? error.message : String(error),
      type: 'cloud'
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
    cloudOllama: any
    localOllama: any
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
    recommendations.push('🤖 AI Services: No AI providers available. Consider setting up Ollama or OpenAI.')
  }

  if (services.cloudOllama.status !== 'healthy' && services.localOllama.status !== 'healthy') {
    recommendations.push('⚡ Performance: Install Ollama locally for better AI performance.')
  }

  if (overallStatus === 'healthy') {
    recommendations.push('✅ System is operating optimally. All core services are healthy.')
  }

  return recommendations
}
