/**
 * Production Cache Management System
 * Multi-layer caching for optimal performance
 */

export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize?: number // Maximum cache size
  strategy: 'lru' | 'fifo' | 'ttl'
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
  lastAccessed: number
}

export class CacheManager {
  private static instance: CacheManager
  private caches: Map<string, Map<string, CacheEntry<any>>> = new Map()
  private configs: Map<string, CacheConfig> = new Map()
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  }

  private constructor() {
    // Initialize default caches
    this.createCache('kpi-data', { ttl: 5 * 60 * 1000, maxSize: 1000, strategy: 'lru' }) // 5 minutes
    this.createCache('portfolio-data', { ttl: 10 * 60 * 1000, maxSize: 500, strategy: 'lru' }) // 10 minutes
    this.createCache('ai-responses', { ttl: 30 * 60 * 1000, maxSize: 200, strategy: 'lru' }) // 30 minutes
    this.createCache('user-sessions', { ttl: 60 * 60 * 1000, maxSize: 10000, strategy: 'ttl' }) // 1 hour
    this.createCache('analytics-results', { ttl: 15 * 60 * 1000, maxSize: 100, strategy: 'lru' }) // 15 minutes
    this.createCache('health-checks', { ttl: 2 * 60 * 1000, maxSize: 50, strategy: 'ttl' }) // 2 minutes

    // Start cleanup interval
    this.startCleanupInterval()
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  createCache(name: string, config: CacheConfig): void {
    this.caches.set(name, new Map())
    this.configs.set(name, config)
  }

  set<T>(cacheName: string, key: string, data: T, customTTL?: number): boolean {
    try {
      const cache = this.caches.get(cacheName)
      const config = this.configs.get(cacheName)

      if (!cache || !config) {
        console.warn(`Cache ${cacheName} not found`)
        return false
      }

      const ttl = customTTL || config.ttl
      const now = Date.now()

      // Check if cache is full and needs eviction
      if (config.maxSize && cache.size >= config.maxSize) {
        this.evictEntries(cacheName, cache, config)
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        ttl,
        hits: 0,
        lastAccessed: now
      }

      cache.set(key, entry)
      this.stats.sets++

      return true
    } catch (error) {
      console.error(`Cache set error for ${cacheName}:${key}:`, error)
      return false
    }
  }

  get<T>(cacheName: string, key: string): T | null {
    try {
      const cache = this.caches.get(cacheName)
      const config = this.configs.get(cacheName)

      if (!cache || !config) {
        this.stats.misses++
        return null
      }

      const entry = cache.get(key) as CacheEntry<T> | undefined

      if (!entry) {
        this.stats.misses++
        return null
      }

      const now = Date.now()

      // Check if entry has expired
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key)
        this.stats.misses++
        return null
      }

      // Update access statistics
      entry.hits++
      entry.lastAccessed = now
      this.stats.hits++

      return entry.data
    } catch (error) {
      console.error(`Cache get error for ${cacheName}:${key}:`, error)
      this.stats.misses++
      return null
    }
  }

  delete(cacheName: string, key: string): boolean {
    try {
      const cache = this.caches.get(cacheName)
      if (!cache) return false

      const deleted = cache.delete(key)
      if (deleted) {
        this.stats.deletes++
      }
      return deleted
    } catch (error) {
      console.error(`Cache delete error for ${cacheName}:${key}:`, error)
      return false
    }
  }

  clear(cacheName: string): boolean {
    try {
      const cache = this.caches.get(cacheName)
      if (!cache) return false

      const size = cache.size
      cache.clear()
      this.stats.deletes += size
      return true
    } catch (error) {
      console.error(`Cache clear error for ${cacheName}:`, error)
      return false
    }
  }

  has(cacheName: string, key: string): boolean {
    try {
      const cache = this.caches.get(cacheName)
      if (!cache) return false

      const entry = cache.get(key)
      if (!entry) return false

      // Check if expired
      const now = Date.now()
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key)
        return false
      }

      return true
    } catch (error) {
      console.error(`Cache has error for ${cacheName}:${key}:`, error)
      return false
    }
  }

  // Convenience methods for common cache operations
  async getOrSet<T>(
    cacheName: string,
    key: string,
    fetcher: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(cacheName, key)
    if (cached !== null) {
      return cached
    }

    // Fetch data and cache it
    try {
      const data = await fetcher()
      this.set(cacheName, key, data, customTTL)
      return data
    } catch (error) {
      console.error(`Cache getOrSet error for ${cacheName}:${key}:`, error)
      throw error
    }
  }

  // Cache invalidation patterns
  invalidatePattern(cacheName: string, pattern: string): number {
    try {
      const cache = this.caches.get(cacheName)
      if (!cache) return 0

      let deletedCount = 0
      const regex = new RegExp(pattern)

      Array.from(cache.entries()).forEach(([key]) => {
        if (regex.test(key)) {
          cache.delete(key)
          deletedCount++
        }
      })

      this.stats.deletes += deletedCount
      return deletedCount
    } catch (error) {
      console.error(`Cache invalidatePattern error for ${cacheName}:${pattern}:`, error)
      return 0
    }
  }

  // Eviction strategies
  private evictEntries(cacheName: string, cache: Map<string, CacheEntry<any>>, config: CacheConfig): void {
    const entriesToEvict = Math.max(1, Math.floor(cache.size * 0.1)) // Evict 10% of entries

    switch (config.strategy) {
      case 'lru':
        this.evictLRU(cache, entriesToEvict)
        break
      case 'fifo':
        this.evictFIFO(cache, entriesToEvict)
        break
      case 'ttl':
        this.evictExpired(cache)
        break
    }
  }

  private evictLRU(cache: Map<string, CacheEntry<any>>, count: number): void {
    const entries = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count)

    for (const [key] of entries) {
      cache.delete(key)
      this.stats.evictions++
    }
  }

  private evictFIFO(cache: Map<string, CacheEntry<any>>, count: number): void {
    const entries = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, count)

    for (const [key] of entries) {
      cache.delete(key)
      this.stats.evictions++
    }
  }

  private evictExpired(cache: Map<string, CacheEntry<any>>): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    Array.from(cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key)
      }
    })

    for (const key of expiredKeys) {
      cache.delete(key)
      this.stats.evictions++
    }
  }

  // Cleanup expired entries
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 5 * 60 * 1000) // Run every 5 minutes
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    let totalCleaned = 0

    Array.from(this.caches.entries()).forEach(([cacheName, cache]) => {
      const expiredKeys: string[] = []

      Array.from(cache.entries()).forEach(([key, entry]) => {
        if (now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key)
        }
      })

      for (const key of expiredKeys) {
        cache.delete(key)
        totalCleaned++
      }
    })

    if (totalCleaned > 0) {
      console.log(`Cache cleanup: removed ${totalCleaned} expired entries`)
      this.stats.evictions += totalCleaned
    }
  }

  // Statistics and monitoring
  getStats(): any {
    const cacheStats: Record<string, any> = {}

    Array.from(this.caches.entries()).forEach(([name, cache]) => {
      const config = this.configs.get(name)!
      let totalHits = 0
      let totalSize = 0
      let oldestEntry = Date.now()
      let newestEntry = 0

      Array.from(cache.values()).forEach((entry) => {
        totalHits += entry.hits
        totalSize += this.estimateSize(entry.data)
        oldestEntry = Math.min(oldestEntry, entry.timestamp)
        newestEntry = Math.max(newestEntry, entry.timestamp)
      })

      cacheStats[name] = {
        entries: cache.size,
        maxSize: config.maxSize,
        ttl: config.ttl,
        strategy: config.strategy,
        totalHits,
        estimatedSize: totalSize,
        oldestEntry: oldestEntry === Date.now() ? null : new Date(oldestEntry).toISOString(),
        newestEntry: newestEntry === 0 ? null : new Date(newestEntry).toISOString()
      }
    })

    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00'

    return {
      global: {
        ...this.stats,
        hitRate: `${hitRate}%`,
        totalCaches: this.caches.size
      },
      caches: cacheStats
    }
  }

  private estimateSize(data: any): number {
    // Rough estimation of data size in bytes
    try {
      return JSON.stringify(data).length * 2 // Rough estimate for UTF-16
    } catch {
      return 100 // Default estimate
    }
  }

  // Health check
  healthCheck(): { status: string; details: any } {
    try {
      const stats = this.getStats()
      const totalEntries = Object.values(stats.caches).reduce((sum: number, cache: any) => sum + cache.entries, 0)
      
      let status = 'healthy'
      if (totalEntries > 10000) status = 'degraded'
      if (parseFloat(stats.global.hitRate) < 50) status = 'degraded'

      return {
        status,
        details: {
          totalEntries,
          hitRate: stats.global.hitRate,
          totalCaches: stats.global.totalCaches,
          recentActivity: {
            hits: stats.global.hits,
            misses: stats.global.misses,
            evictions: stats.global.evictions
          }
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  // Reset all statistics
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance()
export default cacheManager
