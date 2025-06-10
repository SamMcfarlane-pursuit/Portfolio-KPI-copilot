/**
 * Production Rate Limiting System
 * Advanced rate limiting with Redis backend and multiple strategies
 */

import { NextRequest } from 'next/server'
import { redisCache } from '@/lib/cache/redis-cache'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket'
  burstLimit?: number
  refillRate?: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

export class RateLimiter {
  private static instance: RateLimiter
  private fallbackStore = new Map<string, { count: number; resetTime: number; tokens?: number; lastRefill?: number }>()

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  async checkLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator ? config.keyGenerator(request) : this.defaultKeyGenerator(request)
    
    switch (config.strategy || 'fixed-window') {
      case 'sliding-window':
        return this.slidingWindowLimit(key, config)
      case 'token-bucket':
        return this.tokenBucketLimit(key, config)
      default:
        return this.fixedWindowLimit(key, config)
    }
  }

  private defaultKeyGenerator(request: NextRequest): string {
    const ip = this.getClientIP(request)
    const path = request.nextUrl.pathname.split('/').slice(0, 3).join('/')
    return `rate_limit:${ip}:${path}`
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()

    const realIP = request.headers.get('x-real-ip')
    if (realIP) return realIP

    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    if (cfConnectingIP) return cfConnectingIP

    return 'unknown'
  }

  private async fixedWindowLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs
    const windowKey = `${key}:${windowStart}`

    try {
      // Try Redis first
      const current = await redisCache.get<number>(windowKey)
      
      if (current === null) {
        // First request in window
        await redisCache.set(windowKey, 1, Math.ceil(config.windowMs / 1000))
        return {
          allowed: true,
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          resetTime: windowStart + config.windowMs
        }
      }

      if (current >= config.maxRequests) {
        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: windowStart + config.windowMs,
          retryAfter: Math.ceil((windowStart + config.windowMs - now) / 1000)
        }
      }

      // Increment counter
      const newCount = current + 1
      await redisCache.set(windowKey, newCount, Math.ceil(config.windowMs / 1000))

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - newCount,
        resetTime: windowStart + config.windowMs
      }

    } catch (error) {
      console.error('Redis rate limit error, using fallback:', error)
      return this.fallbackFixedWindow(key, config, now)
    }
  }

  private async slidingWindowLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - config.windowMs

    try {
      // Use Redis sorted sets for sliding window
      const pipeline = [
        // Remove old entries
        ['zremrangebyscore', key, '-inf', windowStart],
        // Count current entries
        ['zcard', key],
        // Add current request
        ['zadd', key, now, `${now}-${Math.random()}`],
        // Set expiration
        ['expire', key, Math.ceil(config.windowMs / 1000)]
      ]

      // Execute pipeline (simplified for this implementation)
      const currentCount = await this.getRequestCount(key, windowStart)
      
      if (currentCount >= config.maxRequests) {
        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: now + config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000)
        }
      }

      await this.addRequest(key, now, config.windowMs)

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - currentCount - 1,
        resetTime: now + config.windowMs
      }

    } catch (error) {
      console.error('Sliding window rate limit error:', error)
      return this.fallbackFixedWindow(key, config, now)
    }
  }

  private async tokenBucketLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const bucketKey = `bucket:${key}`
    
    try {
      const bucket = await redisCache.get<{
        tokens: number
        lastRefill: number
      }>(bucketKey)

      const maxTokens = config.burstLimit || config.maxRequests
      const refillRate = config.refillRate || (config.maxRequests / (config.windowMs / 1000))

      let tokens: number
      let lastRefill: number

      if (bucket === null) {
        // Initialize bucket
        tokens = maxTokens - 1 // Consume one token for this request
        lastRefill = now
      } else {
        // Calculate tokens to add based on time elapsed
        const timePassed = (now - bucket.lastRefill) / 1000
        const tokensToAdd = Math.floor(timePassed * refillRate)
        
        tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd)
        lastRefill = bucket.lastRefill + (tokensToAdd / refillRate) * 1000

        if (tokens < 1) {
          const nextRefill = lastRefill + (1 / refillRate) * 1000
          return {
            allowed: false,
            limit: maxTokens,
            remaining: 0,
            resetTime: nextRefill,
            retryAfter: Math.ceil((nextRefill - now) / 1000)
          }
        }

        tokens -= 1 // Consume one token
      }

      // Update bucket
      await redisCache.set(bucketKey, { tokens, lastRefill }, config.windowMs / 1000)

      return {
        allowed: true,
        limit: maxTokens,
        remaining: Math.floor(tokens),
        resetTime: lastRefill + ((maxTokens - tokens) / refillRate) * 1000
      }

    } catch (error) {
      console.error('Token bucket rate limit error:', error)
      return this.fallbackTokenBucket(key, config, now)
    }
  }

  private fallbackFixedWindow(
    key: string,
    config: RateLimitConfig,
    now: number
  ): RateLimitResult {
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs
    const windowKey = `${key}:${windowStart}`
    
    const current = this.fallbackStore.get(windowKey)

    if (!current || now > current.resetTime) {
      this.fallbackStore.set(windowKey, { count: 1, resetTime: windowStart + config.windowMs })
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: windowStart + config.windowMs
      }
    }

    if (current.count >= config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }
    }

    current.count++
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime
    }
  }

  private fallbackTokenBucket(
    key: string,
    config: RateLimitConfig,
    now: number
  ): RateLimitResult {
    const maxTokens = config.burstLimit || config.maxRequests
    const refillRate = config.refillRate || (config.maxRequests / (config.windowMs / 1000))
    
    const current = this.fallbackStore.get(key)

    if (!current) {
      this.fallbackStore.set(key, {
        count: 0,
        resetTime: now + config.windowMs,
        tokens: maxTokens - 1,
        lastRefill: now
      })
      return {
        allowed: true,
        limit: maxTokens,
        remaining: maxTokens - 1,
        resetTime: now + config.windowMs
      }
    }

    // Refill tokens
    const timePassed = (now - (current.lastRefill || now)) / 1000
    const tokensToAdd = Math.floor(timePassed * refillRate)
    const tokens = Math.min(maxTokens, (current.tokens || 0) + tokensToAdd)

    if (tokens < 1) {
      const nextRefill = (current.lastRefill || now) + (1 / refillRate) * 1000
      return {
        allowed: false,
        limit: maxTokens,
        remaining: 0,
        resetTime: nextRefill,
        retryAfter: Math.ceil((nextRefill - now) / 1000)
      }
    }

    current.tokens = tokens - 1
    current.lastRefill = now

    return {
      allowed: true,
      limit: maxTokens,
      remaining: Math.floor(current.tokens),
      resetTime: now + config.windowMs
    }
  }

  private async getRequestCount(key: string, windowStart: number): Promise<number> {
    // Simplified implementation - in production, use Redis ZCOUNT
    try {
      const requests = await redisCache.get<string[]>(`sliding:${key}`) || []
      return requests.filter(timestamp => parseInt(timestamp) > windowStart).length
    } catch {
      return 0
    }
  }

  private async addRequest(key: string, timestamp: number, windowMs: number): Promise<void> {
    // Simplified implementation - in production, use Redis ZADD
    try {
      const requests = await redisCache.get<string[]>(`sliding:${key}`) || []
      requests.push(timestamp.toString())
      
      // Keep only recent requests
      const windowStart = timestamp - windowMs
      const recentRequests = requests.filter(ts => parseInt(ts) > windowStart)
      
      await redisCache.set(`sliding:${key}`, recentRequests, Math.ceil(windowMs / 1000))
    } catch (error) {
      console.error('Error adding request to sliding window:', error)
    }
  }

  // Cleanup old entries from fallback store
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.fallbackStore.forEach((value, key) => {
      if (now > value.resetTime) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.fallbackStore.delete(key))
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance()

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  API_STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    strategy: 'sliding-window' as const
  },
  API_MODERATE: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    strategy: 'fixed-window' as const
  },
  API_GENEROUS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    strategy: 'token-bucket' as const,
    burstLimit: 50,
    refillRate: 10 // tokens per second
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    strategy: 'fixed-window' as const
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    strategy: 'token-bucket' as const,
    burstLimit: 3,
    refillRate: 0.003 // ~10 per hour
  }
}
