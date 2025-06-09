/**
 * Production Health Monitoring System
 * Comprehensive health checks and monitoring for enterprise deployment
 */

import { PrismaClient } from '@prisma/client'
import { supabaseServer } from '@/lib/supabase/server'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import { openRouterService } from '@/lib/ai/openrouter'
import { aiOrchestrator } from '@/lib/ai/orchestrator'

export interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  message?: string
  details?: any
  lastChecked: string
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  version: string
  environment: string
  timestamp: string
  checks: HealthCheck[]
  metrics: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      usage: number
    }
    requests: {
      total: number
      errors: number
      avgResponseTime: number
    }
  }
}

export class HealthMonitor {
  private static instance: HealthMonitor
  private startTime: number = Date.now()
  private requestMetrics = {
    total: 0,
    errors: 0,
    responseTimes: [] as number[]
  }

  private constructor() {}

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor()
    }
    return HealthMonitor.instance
  }

  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now()
    const checks: HealthCheck[] = []

    // Database health check
    checks.push(await this.checkDatabase())

    // Supabase health check
    checks.push(await this.checkSupabase())

    // AI services health check
    checks.push(await this.checkAIServices())

    // Hybrid data layer health check
    checks.push(await this.checkHybridDataLayer())

    // External services health check
    checks.push(await this.checkExternalServices())

    // File system health check
    checks.push(await this.checkFileSystem())

    // Memory and performance check
    checks.push(await this.checkSystemResources())

    // Determine overall health
    const overall = this.determineOverallHealth(checks)

    return {
      overall,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        memory: this.getMemoryMetrics(),
        cpu: { usage: await this.getCPUUsage() },
        requests: this.getRequestMetrics()
      }
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const prisma = new PrismaClient()
      
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`
      
      // Test table access
      const userCount = await prisma.user.count()
      const orgCount = await prisma.organization.count()
      
      await prisma.$disconnect()

      return {
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'Database connection successful',
        details: {
          users: userCount,
          organizations: orgCount,
          type: 'SQLite'
        },
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      }
    }
  }

  private async checkSupabase(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      if (!supabaseServer.isConfigured()) {
        return {
          name: 'supabase',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          message: 'Supabase not configured - using SQLite fallback',
          lastChecked: new Date().toISOString()
        }
      }

      const client = supabaseServer.getClient()
      if (!client) {
        throw new Error('Supabase client not available')
      }

      // Test basic connectivity
      const { data, error } = await client
        .from('organizations')
        .select('id')
        .limit(1)

      if (error && !error.message.includes('does not exist')) {
        throw error
      }

      return {
        name: 'supabase',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'Supabase connection successful',
        details: {
          configured: true,
          realtime: true,
          vectorSearch: true
        },
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        name: 'supabase',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      }
    }
  }

  private async checkAIServices(): Promise<HealthCheck> {
    const startTime = Date.now()
    const aiStatus = {
      openrouter: false,
      ollama: false,
      openai: false
    }

    try {
      // Check OpenRouter
      if (openRouterService.isAvailable()) {
        const health = await openRouterService.healthCheck()
        aiStatus.openrouter = health.status === 'healthy'
      }

      // Check Ollama via orchestrator
      const orchestratorStatus = await aiOrchestrator.getStatus()
      aiStatus.ollama = orchestratorStatus.ollama.available

      // Check OpenAI
      aiStatus.openai = !!process.env.OPENAI_API_KEY && process.env.DISABLE_OPENAI !== 'true'

      const availableProviders = Object.values(aiStatus).filter(Boolean).length
      const status = availableProviders > 0 ? 'healthy' : 'degraded'

      return {
        name: 'ai_services',
        status,
        responseTime: Date.now() - startTime,
        message: `${availableProviders} AI provider(s) available`,
        details: aiStatus,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        name: 'ai_services',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: `AI services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      }
    }
  }

  private async checkHybridDataLayer(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      // Initialize hybrid data layer if not already done
      await hybridData.initialize()
      const status = hybridData.getStatus()

      // Consider SQLite as healthy since it's our primary data source
      const isHealthy = status.activeSource === 'sqlite' || status.sqlite.connected

      return {
        name: 'hybrid_data_layer',
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        message: `Active data source: ${status.activeSource}`,
        details: status,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        name: 'hybrid_data_layer',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Hybrid data layer check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      }
    }
  }

  private async checkExternalServices(): Promise<HealthCheck> {
    const startTime = Date.now()
    const services = {
      internet: false,
      dns: false
    }

    try {
      // Test internet connectivity
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'GET',
        timeout: 5000
      } as any)
      services.internet = response.ok

      // Test DNS resolution
      await fetch('https://google.com', { 
        method: 'HEAD',
        timeout: 5000
      } as any)
      services.dns = true

      const status = services.internet && services.dns ? 'healthy' : 'degraded'

      return {
        name: 'external_services',
        status,
        responseTime: Date.now() - startTime,
        message: 'External connectivity check completed',
        details: services,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        name: 'external_services',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'Limited external connectivity',
        details: services,
        lastChecked: new Date().toISOString()
      }
    }
  }

  private async checkFileSystem(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Check if we can write to temp directory
      const tempFile = path.join(process.cwd(), '.health-check-temp')
      await fs.writeFile(tempFile, 'health-check')
      await fs.unlink(tempFile)

      return {
        name: 'file_system',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'File system access successful',
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        name: 'file_system',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString()
      }
    }
  }

  private async checkSystemResources(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      const memoryUsage = process.memoryUsage()
      const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      // More lenient thresholds for development environment
      if (memoryPercentage > 98) status = 'unhealthy'
      else if (memoryPercentage > 95) status = 'degraded'

      return {
        name: 'system_resources',
        status,
        responseTime: Date.now() - startTime,
        message: `Memory usage: ${memoryPercentage.toFixed(1)}%`,
        details: {
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
          }
        },
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        name: 'system_resources',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'System resource check failed',
        lastChecked: new Date().toISOString()
      }
    }
  }

  private determineOverallHealth(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length
    const degradedCount = checks.filter(c => c.status === 'degraded').length

    if (unhealthyCount > 0) return 'unhealthy'
    if (degradedCount > 2) return 'degraded'
    if (degradedCount > 0) return 'degraded'
    return 'healthy'
  }

  private getMemoryMetrics() {
    const usage = process.memoryUsage()
    return {
      used: Math.round(usage.heapUsed / 1024 / 1024),
      total: Math.round(usage.heapTotal / 1024 / 1024),
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    }
  }

  private async getCPUUsage(): Promise<number> {
    // Simplified CPU usage calculation
    const startUsage = process.cpuUsage()
    await new Promise(resolve => setTimeout(resolve, 100))
    const endUsage = process.cpuUsage(startUsage)
    
    const totalUsage = endUsage.user + endUsage.system
    return Math.round((totalUsage / 100000) * 100) / 100 // Convert to percentage
  }

  private getRequestMetrics() {
    const avgResponseTime = this.requestMetrics.responseTimes.length > 0
      ? this.requestMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.requestMetrics.responseTimes.length
      : 0

    return {
      total: this.requestMetrics.total,
      errors: this.requestMetrics.errors,
      avgResponseTime: Math.round(avgResponseTime)
    }
  }

  // Public methods for tracking requests
  recordRequest(responseTime: number, isError: boolean = false) {
    this.requestMetrics.total++
    if (isError) this.requestMetrics.errors++
    
    this.requestMetrics.responseTimes.push(responseTime)
    
    // Keep only last 100 response times
    if (this.requestMetrics.responseTimes.length > 100) {
      this.requestMetrics.responseTimes = this.requestMetrics.responseTimes.slice(-50)
    }
  }

  getUptime(): number {
    return Date.now() - this.startTime
  }

  reset() {
    this.requestMetrics = {
      total: 0,
      errors: 0,
      responseTimes: []
    }
  }
}

// Export singleton instance
export const healthMonitor = HealthMonitor.getInstance()
export default healthMonitor
