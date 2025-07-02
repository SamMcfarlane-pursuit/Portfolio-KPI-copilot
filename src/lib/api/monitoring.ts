/**
 * API Monitoring & Analytics System
 * Comprehensive monitoring, metrics collection, and performance analytics
 */

import { NextRequest } from 'next/server'

// Monitoring Event Types
export enum MonitoringEventType {
  REQUEST_START = 'REQUEST_START',
  REQUEST_END = 'REQUEST_END',
  ERROR = 'ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH_FAILURE = 'AUTH_FAILURE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AI_REQUEST = 'AI_REQUEST',
  DATABASE_QUERY = 'DATABASE_QUERY',
  CACHE_HIT = 'CACHE_HIT',
  CACHE_MISS = 'CACHE_MISS'
}

// Monitoring Event Interface
export interface MonitoringEvent {
  id: string
  type: MonitoringEventType
  timestamp: number
  requestId: string
  userId?: string
  organizationId?: string
  endpoint: string
  method: string
  statusCode?: number
  responseTime?: number
  error?: {
    code: string
    message: string
    stack?: string
  }
  metadata?: Record<string, any>
  userAgent?: string
  ip?: string
  region?: string
}

// Performance Metrics
export interface PerformanceMetrics {
  requestCount: number
  errorCount: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  successRate: number
  errorRate: number
  rateLimitHits: number
  cacheHitRate: number
  uniqueUsers: number
  topEndpoints: Array<{
    endpoint: string
    count: number
    avgResponseTime: number
  }>
  errorBreakdown: Record<string, number>
  timeSeriesData: Array<{
    timestamp: number
    requests: number
    errors: number
    avgResponseTime: number
  }>
}

// Alert Configuration
export interface AlertConfig {
  id: string
  name: string
  condition: {
    metric: string
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
    threshold: number
    timeWindow: number // minutes
  }
  actions: Array<{
    type: 'email' | 'webhook' | 'slack'
    target: string
    template?: string
  }>
  enabled: boolean
  cooldown: number // minutes
}

export class APIMonitoring {
  private static instance: APIMonitoring
  private events: MonitoringEvent[] = []
  private alerts: AlertConfig[] = []
  private alertCooldowns = new Map<string, number>()
  
  // In production, these would be stored in Redis or a time-series database
  private metricsCache = new Map<string, any>()
  private responseTimes: number[] = []
  
  public static getInstance(): APIMonitoring {
    if (!APIMonitoring.instance) {
      APIMonitoring.instance = new APIMonitoring()
    }
    return APIMonitoring.instance
  }

  /**
   * Record monitoring event
   */
  public recordEvent(event: Omit<MonitoringEvent, 'id' | 'timestamp'>): void {
    const monitoringEvent: MonitoringEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    }
    
    this.events.push(monitoringEvent)
    
    // Keep only last 10000 events in memory (in production, use persistent storage)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000)
    }
    
    // Update metrics cache
    this.updateMetricsCache(monitoringEvent)
    
    // Check alerts
    this.checkAlerts(monitoringEvent)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MONITORING] ${event.type}:`, {
        endpoint: event.endpoint,
        method: event.method,
        responseTime: event.responseTime,
        statusCode: event.statusCode,
        error: event.error?.message
      })
    }
  }

  /**
   * Get performance metrics for a time period
   */
  public getMetrics(timeWindow: number = 3600000): PerformanceMetrics { // Default 1 hour
    const cutoffTime = Date.now() - timeWindow
    const relevantEvents = this.events.filter(e => e.timestamp > cutoffTime)
    
    const requestEvents = relevantEvents.filter(e => e.type === MonitoringEventType.REQUEST_END)
    const errorEvents = relevantEvents.filter(e => e.type === MonitoringEventType.ERROR)
    const rateLimitEvents = relevantEvents.filter(e => e.type === MonitoringEventType.RATE_LIMIT)
    const cacheHits = relevantEvents.filter(e => e.type === MonitoringEventType.CACHE_HIT)
    const cacheMisses = relevantEvents.filter(e => e.type === MonitoringEventType.CACHE_MISS)
    
    const responseTimes = requestEvents
      .map(e => e.responseTime)
      .filter(rt => rt !== undefined) as number[]
    
    responseTimes.sort((a, b) => a - b)
    
    const uniqueUsers = new Set(relevantEvents.map(e => e.userId).filter(Boolean)).size
    
    // Calculate endpoint statistics
    const endpointStats = new Map<string, { count: number; totalTime: number }>()
    requestEvents.forEach(event => {
      const key = `${event.method} ${event.endpoint}`
      const existing = endpointStats.get(key) || { count: 0, totalTime: 0 }
      endpointStats.set(key, {
        count: existing.count + 1,
        totalTime: existing.totalTime + (event.responseTime || 0)
      })
    })
    
    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgResponseTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // Error breakdown
    const errorBreakdown: Record<string, number> = {}
    errorEvents.forEach(event => {
      const code = event.error?.code || 'UNKNOWN'
      errorBreakdown[code] = (errorBreakdown[code] || 0) + 1
    })
    
    // Time series data (last 24 hours in 1-hour buckets)
    const timeSeriesData = this.generateTimeSeriesData(relevantEvents, 24, 3600000)
    
    return {
      requestCount: requestEvents.length,
      errorCount: errorEvents.length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0,
      p95ResponseTime: responseTimes.length > 0 ? 
        responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
      p99ResponseTime: responseTimes.length > 0 ? 
        responseTimes[Math.floor(responseTimes.length * 0.99)] : 0,
      successRate: requestEvents.length > 0 ? 
        (requestEvents.length - errorEvents.length) / requestEvents.length : 1,
      errorRate: requestEvents.length > 0 ? 
        errorEvents.length / requestEvents.length : 0,
      rateLimitHits: rateLimitEvents.length,
      cacheHitRate: (cacheHits.length + cacheMisses.length) > 0 ? 
        cacheHits.length / (cacheHits.length + cacheMisses.length) : 0,
      uniqueUsers,
      topEndpoints,
      errorBreakdown,
      timeSeriesData
    }
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, { status: 'pass' | 'fail'; message?: string; responseTime?: number }>
    timestamp: number
  } {
    const metrics = this.getMetrics(300000) // Last 5 minutes
    
    const checks: Record<string, { status: 'pass' | 'fail'; message?: string; responseTime?: number }> = {
      responseTime: {
        status: metrics.averageResponseTime < 2000 ? 'pass' : 'fail',
        message: `Average response time: ${metrics.averageResponseTime.toFixed(0)}ms`,
        responseTime: metrics.averageResponseTime
      },
      errorRate: {
        status: metrics.errorRate < 0.05 ? 'pass' : 'fail',
        message: `Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`
      },
      requestVolume: {
        status: metrics.requestCount > 0 ? 'pass' : 'fail',
        message: `Requests in last 5 minutes: ${metrics.requestCount}`
      }
    }
    
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length
    
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (failedChecks === 0) {
      status = 'healthy'
    } else if (failedChecks === 1) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }
    
    return {
      status,
      checks,
      timestamp: Date.now()
    }
  }

  /**
   * Configure alert
   */
  public configureAlert(alert: AlertConfig): void {
    const existingIndex = this.alerts.findIndex(a => a.id === alert.id)
    if (existingIndex >= 0) {
      this.alerts[existingIndex] = alert
    } else {
      this.alerts.push(alert)
    }
  }

  /**
   * Get API usage analytics
   */
  public getUsageAnalytics(timeWindow: number = 86400000): { // Default 24 hours
    totalRequests: number
    uniqueUsers: number
    topUsers: Array<{ userId: string; requests: number }>
    endpointUsage: Array<{ endpoint: string; requests: number; avgResponseTime: number }>
    geographicDistribution: Record<string, number>
    deviceTypes: Record<string, number>
    hourlyDistribution: number[]
  } {
    const cutoffTime = Date.now() - timeWindow
    const relevantEvents = this.events.filter(e => e.timestamp > cutoffTime)
    
    // User statistics
    const userStats = new Map<string, number>()
    relevantEvents.forEach(event => {
      if (event.userId) {
        userStats.set(event.userId, (userStats.get(event.userId) || 0) + 1)
      }
    })
    
    const topUsers = Array.from(userStats.entries())
      .map(([userId, requests]) => ({ userId, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)
    
    // Endpoint usage
    const endpointStats = new Map<string, { requests: number; totalTime: number }>()
    relevantEvents.forEach(event => {
      const key = `${event.method} ${event.endpoint}`
      const existing = endpointStats.get(key) || { requests: 0, totalTime: 0 }
      endpointStats.set(key, {
        requests: existing.requests + 1,
        totalTime: existing.totalTime + (event.responseTime || 0)
      })
    })
    
    const endpointUsage = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        requests: stats.requests,
        avgResponseTime: stats.totalTime / stats.requests
      }))
      .sort((a, b) => b.requests - a.requests)
    
    // Geographic distribution (mock data - would integrate with IP geolocation)
    const geographicDistribution: Record<string, number> = {
      'US': Math.floor(relevantEvents.length * 0.6),
      'EU': Math.floor(relevantEvents.length * 0.25),
      'APAC': Math.floor(relevantEvents.length * 0.15)
    }
    
    // Device types (based on user agent)
    const deviceTypes: Record<string, number> = {
      'Desktop': 0,
      'Mobile': 0,
      'Tablet': 0,
      'API': 0
    }
    
    relevantEvents.forEach(event => {
      const ua = event.userAgent?.toLowerCase() || ''
      if (ua.includes('mobile')) {
        deviceTypes.Mobile++
      } else if (ua.includes('tablet')) {
        deviceTypes.Tablet++
      } else if (ua.includes('mozilla') || ua.includes('chrome')) {
        deviceTypes.Desktop++
      } else {
        deviceTypes.API++
      }
    })
    
    // Hourly distribution
    const hourlyDistribution = new Array(24).fill(0)
    relevantEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours()
      hourlyDistribution[hour]++
    })
    
    return {
      totalRequests: relevantEvents.length,
      uniqueUsers: userStats.size,
      topUsers,
      endpointUsage,
      geographicDistribution,
      deviceTypes,
      hourlyDistribution
    }
  }

  // Private helper methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private updateMetricsCache(event: MonitoringEvent): void {
    if (event.responseTime) {
      this.responseTimes.push(event.responseTime)
      // Keep only last 1000 response times
      if (this.responseTimes.length > 1000) {
        this.responseTimes = this.responseTimes.slice(-1000)
      }
    }
  }

  private checkAlerts(event: MonitoringEvent): void {
    this.alerts.forEach(alert => {
      if (!alert.enabled) return
      
      // Check cooldown
      const lastAlert = this.alertCooldowns.get(alert.id)
      if (lastAlert && Date.now() - lastAlert < alert.cooldown * 60000) {
        return
      }
      
      // Evaluate condition
      const shouldAlert = this.evaluateAlertCondition(alert, event)
      if (shouldAlert) {
        this.triggerAlert(alert, event)
        this.alertCooldowns.set(alert.id, Date.now())
      }
    })
  }

  private evaluateAlertCondition(alert: AlertConfig, event: MonitoringEvent): boolean {
    const metrics = this.getMetrics(alert.condition.timeWindow * 60000)
    
    let value: number
    switch (alert.condition.metric) {
      case 'errorRate':
        value = metrics.errorRate
        break
      case 'responseTime':
        value = metrics.averageResponseTime
        break
      case 'requestCount':
        value = metrics.requestCount
        break
      default:
        return false
    }
    
    switch (alert.condition.operator) {
      case 'gt':
        return value > alert.condition.threshold
      case 'gte':
        return value >= alert.condition.threshold
      case 'lt':
        return value < alert.condition.threshold
      case 'lte':
        return value <= alert.condition.threshold
      case 'eq':
        return value === alert.condition.threshold
      default:
        return false
    }
  }

  private triggerAlert(alert: AlertConfig, event: MonitoringEvent): void {
    console.warn(`[ALERT] ${alert.name} triggered:`, {
      condition: alert.condition,
      event: {
        type: event.type,
        endpoint: event.endpoint,
        timestamp: new Date(event.timestamp).toISOString()
      }
    })
    
    // In production, implement actual alert actions (email, webhook, Slack, etc.)
    alert.actions.forEach(action => {
      switch (action.type) {
        case 'email':
          // Send email alert
          break
        case 'webhook':
          // Send webhook
          break
        case 'slack':
          // Send Slack message
          break
      }
    })
  }

  private generateTimeSeriesData(
    events: MonitoringEvent[],
    buckets: number,
    bucketSize: number
  ): Array<{ timestamp: number; requests: number; errors: number; avgResponseTime: number }> {
    const now = Date.now()
    const data: Array<{ timestamp: number; requests: number; errors: number; avgResponseTime: number }> = []
    
    for (let i = buckets - 1; i >= 0; i--) {
      const bucketStart = now - (i * bucketSize)
      const bucketEnd = bucketStart + bucketSize
      
      const bucketEvents = events.filter(e => e.timestamp >= bucketStart && e.timestamp < bucketEnd)
      const requestEvents = bucketEvents.filter(e => e.type === MonitoringEventType.REQUEST_END)
      const errorEvents = bucketEvents.filter(e => e.type === MonitoringEventType.ERROR)
      
      const responseTimes = requestEvents
        .map(e => e.responseTime)
        .filter(rt => rt !== undefined) as number[]
      
      const avgResponseTime = responseTimes.length > 0 ?
        responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0
      
      data.push({
        timestamp: bucketStart,
        requests: requestEvents.length,
        errors: errorEvents.length,
        avgResponseTime
      })
    }
    
    return data
  }
}

// Export singleton instance
export const apiMonitoring = APIMonitoring.getInstance()

// Helper function to create monitoring middleware
export function createMonitoringMiddleware() {
  return (request: NextRequest, requestId: string) => {
    const startTime = Date.now()
    
    // Record request start
    apiMonitoring.recordEvent({
      type: MonitoringEventType.REQUEST_START,
      requestId,
      endpoint: new URL(request.url).pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    })
    
    return {
      recordEnd: (statusCode: number, error?: any) => {
        const responseTime = Date.now() - startTime
        
        apiMonitoring.recordEvent({
          type: error ? MonitoringEventType.ERROR : MonitoringEventType.REQUEST_END,
          requestId,
          endpoint: new URL(request.url).pathname,
          method: request.method,
          statusCode,
          responseTime,
          error: error ? {
            code: error.code || 'UNKNOWN',
            message: error.message || 'Unknown error'
          } : undefined
        })
      }
    }
  }
}
