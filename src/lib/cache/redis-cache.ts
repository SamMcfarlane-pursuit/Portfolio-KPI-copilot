/**
 * Production Redis Cache Implementation
 * High-performance caching with Redis for enterprise scalability
 */

import { createClient, RedisClientType } from 'redis'
import { CacheManager } from '@/lib/performance/cache-manager'

export interface RedisCacheConfig {
  url?: string
  password?: string
  database?: number
  keyPrefix?: string
  defaultTTL?: number
  maxRetries?: number
  retryDelay?: number
}

export class RedisCache {
  private static instance: RedisCache
  private client: RedisClientType | null = null
  private fallbackCache: CacheManager
  private config: RedisCacheConfig
  private isConnected = false
  private connectionAttempts = 0
  private maxConnectionAttempts = 5

  private constructor(config: RedisCacheConfig = {}) {
    this.config = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DATABASE || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'portfolio-kpi:',
      defaultTTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    }

    this.fallbackCache = CacheManager.getInstance()
    this.initializeRedis()
  }

  static getInstance(config?: RedisCacheConfig): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache(config)
    }
    return RedisCache.instance
  }

  private async initializeRedis(): Promise<void> {
    try {
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.warn('Max Redis connection attempts reached, using fallback cache')
        return
      }

      this.connectionAttempts++

      this.client = createClient({
        url: this.config.url,
        password: this.config.password,
        database: this.config.database,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.config.maxRetries!) {
              return new Error('Max retries reached')
            }
            return Math.min(retries * this.config.retryDelay!, 3000)
          }
        }
      })

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err)
        this.isConnected = false
      })

      this.client.on('connect', () => {
        console.log('Redis connected successfully')
        this.isConnected = true
        this.connectionAttempts = 0
      })

      this.client.on('disconnect', () => {
        console.log('Redis disconnected')
        this.isConnected = false
      })

      await this.client.connect()

    } catch (error) {
      console.error('Redis initialization failed:', error)
      this.isConnected = false
      
      // Retry connection after delay
      setTimeout(() => {
        this.initializeRedis()
      }, this.config.retryDelay! * this.connectionAttempts)
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const cacheKey = this.getKey(key)
    const serializedValue = JSON.stringify(value)
    const cacheTTL = ttl || this.config.defaultTTL!

    try {
      if (this.isConnected && this.client) {
        await this.client.setEx(cacheKey, cacheTTL, serializedValue)
        return true
      }
    } catch (error) {
      console.error('Redis set error:', error)
    }

    // Fallback to in-memory cache
    return this.fallbackCache.set('redis-fallback', key, value, cacheTTL * 1000)
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getKey(key)

    try {
      if (this.isConnected && this.client) {
        const value = await this.client.get(cacheKey)
        if (value) {
          return JSON.parse(value) as T
        }
      }
    } catch (error) {
      console.error('Redis get error:', error)
    }

    // Fallback to in-memory cache
    return this.fallbackCache.get<T>('redis-fallback', key)
  }

  async del(key: string): Promise<boolean> {
    const cacheKey = this.getKey(key)

    try {
      if (this.isConnected && this.client) {
        await this.client.del(cacheKey)
      }
    } catch (error) {
      console.error('Redis delete error:', error)
    }

    // Also delete from fallback cache
    return this.fallbackCache.delete('redis-fallback', key)
  }

  async exists(key: string): Promise<boolean> {
    const cacheKey = this.getKey(key)

    try {
      if (this.isConnected && this.client) {
        const exists = await this.client.exists(cacheKey)
        return exists === 1
      }
    } catch (error) {
      console.error('Redis exists error:', error)
    }

    // Check fallback cache
    const fallbackValue = this.fallbackCache.get('redis-fallback', key)
    return fallbackValue !== null
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch data and cache it
    try {
      const data = await fetcher()
      await this.set(key, data, ttl)
      return data
    } catch (error) {
      console.error(`Cache getOrSet error for ${key}:`, error)
      throw error
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const cacheKeys = keys.map(key => this.getKey(key))

    try {
      if (this.isConnected && this.client) {
        const values = await this.client.mGet(cacheKeys)
        return values.map(value => value ? JSON.parse(value) as T : null)
      }
    } catch (error) {
      console.error('Redis mget error:', error)
    }

    // Fallback to individual gets
    return Promise.all(keys.map(key => this.get<T>(key)))
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      if (this.isConnected && this.client) {
        const pipeline = this.client.multi()
        
        for (const { key, value, ttl } of keyValuePairs) {
          const cacheKey = this.getKey(key)
          const serializedValue = JSON.stringify(value)
          const cacheTTL = ttl || this.config.defaultTTL!
          
          pipeline.setEx(cacheKey, cacheTTL, serializedValue)
        }
        
        await pipeline.exec()
        return true
      }
    } catch (error) {
      console.error('Redis mset error:', error)
    }

    // Fallback to individual sets
    const results = await Promise.all(
      keyValuePairs.map(({ key, value, ttl }) => this.set(key, value, ttl))
    )
    return results.every(result => result)
  }

  async flush(): Promise<boolean> {
    try {
      if (this.isConnected && this.client) {
        await this.client.flushDb()
      }
    } catch (error) {
      console.error('Redis flush error:', error)
    }

    // Also clear fallback cache
    this.fallbackCache.clear('redis-fallback')
    return true
  }

  async getStats(): Promise<any> {
    const stats = {
      connected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      fallbackCacheStats: this.fallbackCache.getStats(),
      redis: null as any
    }

    try {
      if (this.isConnected && this.client) {
        const info = await this.client.info('memory')
        const keyspace = await this.client.info('keyspace')
        
        stats.redis = {
          memory: this.parseRedisInfo(info),
          keyspace: this.parseRedisInfo(keyspace)
        }
      }
    } catch (error) {
      console.error('Redis stats error:', error)
    }

    return stats
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {}
    const lines = info.split('\r\n')
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':')
        result[key] = isNaN(Number(value)) ? value : Number(value)
      }
    }
    
    return result
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect()
        this.isConnected = false
      }
    } catch (error) {
      console.error('Redis disconnect error:', error)
    }
  }

  isHealthy(): boolean {
    return this.isConnected
  }
}

// Export singleton instance
export const redisCache = RedisCache.getInstance()
