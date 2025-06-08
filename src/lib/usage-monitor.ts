/**
 * Usage Monitor - Prevent Vercel overages
 * Tracks and limits API calls, bandwidth, and function executions
 */

interface UsageStats {
  apiCalls: number
  bandwidth: number
  lastReset: Date
}

// In-memory usage tracking (use Redis in production)
let usageStats: UsageStats = {
  apiCalls: 0,
  bandwidth: 0,
  lastReset: new Date()
}

// Daily limits (80% of Vercel free tier for safety buffer)
const DAILY_LIMITS = {
  API_CALLS: 800, // 80% of 1,000 daily limit
  BANDWIDTH_MB: 3200, // 80% of ~4GB daily (100GB/30 days)
}

export class UsageMonitor {
  static resetIfNewDay() {
    const now = new Date()
    const lastReset = usageStats.lastReset
    
    // Reset if it's a new day
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth()) {
      usageStats = {
        apiCalls: 0,
        bandwidth: 0,
        lastReset: now
      }
    }
  }

  static trackApiCall(): boolean {
    this.resetIfNewDay()
    
    if (usageStats.apiCalls >= DAILY_LIMITS.API_CALLS) {
      console.warn('⚠️ Daily API call limit reached')
      return false // Block the call
    }
    
    usageStats.apiCalls++
    return true // Allow the call
  }

  static trackBandwidth(bytes: number): boolean {
    this.resetIfNewDay()
    
    const megabytes = bytes / (1024 * 1024)
    
    if (usageStats.bandwidth + megabytes >= DAILY_LIMITS.BANDWIDTH_MB) {
      console.warn('⚠️ Daily bandwidth limit reached')
      return false // Block large responses
    }
    
    usageStats.bandwidth += megabytes
    return true // Allow the response
  }

  static getUsageStats() {
    this.resetIfNewDay()
    return {
      ...usageStats,
      limits: DAILY_LIMITS,
      percentUsed: {
        apiCalls: (usageStats.apiCalls / DAILY_LIMITS.API_CALLS) * 100,
        bandwidth: (usageStats.bandwidth / DAILY_LIMITS.BANDWIDTH_MB) * 100
      }
    }
  }

  static isNearLimit(): boolean {
    const stats = this.getUsageStats()
    return stats.percentUsed.apiCalls > 90 || stats.percentUsed.bandwidth > 90
  }
}

// Middleware to track API usage
export function withUsageTracking(handler: any) {
  return async (req: any, res: any) => {
    // Check if we can make this API call
    if (!UsageMonitor.trackApiCall()) {
      return res.status(429).json({
        error: 'Daily API limit reached. Please try again tomorrow.',
        retryAfter: getSecondsUntilMidnight()
      })
    }

    // Execute the original handler
    const result = await handler(req, res)
    
    // Track response size if it's large
    if (res.getHeader('content-length')) {
      const size = parseInt(res.getHeader('content-length'))
      UsageMonitor.trackBandwidth(size)
    }

    return result
  }
}

function getSecondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}

// Rate limiting for expensive operations
export class RateLimiter {
  private static calls: Map<string, number[]> = new Map()

  static canMakeCall(key: string, maxCalls: number, windowMs: number): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get existing calls for this key
    const calls = this.calls.get(key) || []
    
    // Remove old calls outside the window
    const recentCalls = calls.filter(time => time > windowStart)
    
    // Check if we're under the limit
    if (recentCalls.length >= maxCalls) {
      return false
    }
    
    // Add this call
    recentCalls.push(now)
    this.calls.set(key, recentCalls)
    
    return true
  }
}

// Optimize responses to reduce bandwidth
export function optimizeResponse(data: any): any {
  if (Array.isArray(data)) {
    // Limit array responses
    return data.slice(0, 50) // Max 50 items
  }
  
  if (typeof data === 'object' && data !== null) {
    // Remove large fields that aren't essential
    const optimized = { ...data }
    
    // Remove or truncate large text fields
    if (optimized.description && optimized.description.length > 500) {
      optimized.description = optimized.description.substring(0, 500) + '...'
    }
    
    // Remove metadata if not needed
    delete optimized.metadata
    delete optimized.rawData
    
    return optimized
  }
  
  return data
}
