import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma configuration for production
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres',
      },
    },
    // Production optimizations
    transactionOptions: {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
    }
  })

// Debug logging with cache bust
if (process.env.NODE_ENV === 'production') {
  console.log('🔥 CACHE_BUST_1749763981 - Prisma Client Debug:', {
    databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL ? 'SET' : 'NOT_SET',
    timestamp: new Date().toISOString(),
    cacheBust: '1749763981'
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper function to handle database errors
export function handlePrismaError(error: any) {
  if (error.code === 'P2002') {
    return new Error('A record with this information already exists.')
  }
  if (error.code === 'P2025') {
    return new Error('Record not found.')
  }
  if (error.code === 'P2003') {
    return new Error('Foreign key constraint failed.')
  }
  return new Error('Database operation failed.')
}

// Enhanced database operations with optimization
export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer
  private queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>()
  private connectionPool: any[] = []
  private queryStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    slowQueries: [] as Array<{ query: string; duration: number; timestamp: number }>
  }

  private constructor() {}

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer()
    }
    return DatabaseOptimizer.instance
  }

  async executeQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey?: string,
    cacheTTL: number = 300000 // 5 minutes
  ): Promise<T> {
    const startTime = Date.now()
    this.queryStats.totalQueries++

    // Check cache first
    if (cacheKey) {
      const cached = this.getCachedResult<T>(cacheKey)
      if (cached !== null) {
        this.queryStats.cacheHits++
        return cached
      }
      this.queryStats.cacheMisses++
    }

    try {
      const result = await queryFn()
      const duration = Date.now() - startTime

      // Update performance stats
      this.updatePerformanceStats(duration, queryFn.toString())

      // Cache result if cache key provided
      if (cacheKey) {
        this.setCachedResult(cacheKey, result, cacheTTL)
      }

      return result
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  }

  private getCachedResult<T>(key: string): T | null {
    const cached = this.queryCache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key)
      return null
    }

    return cached.result as T
  }

  private setCachedResult(key: string, result: any, ttl: number): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    })

    // Cleanup old cache entries
    if (this.queryCache.size > 1000) {
      this.cleanupCache()
    }
  }

  private cleanupCache(): void {
    const now = Date.now()
    const toDelete: string[] = []

    this.queryCache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        toDelete.push(key)
      }
    })

    toDelete.forEach(key => this.queryCache.delete(key))
  }

  private updatePerformanceStats(duration: number, query: string): void {
    // Update average response time
    const totalTime = this.queryStats.averageResponseTime * (this.queryStats.totalQueries - 1)
    this.queryStats.averageResponseTime = (totalTime + duration) / this.queryStats.totalQueries

    // Track slow queries (>1 second)
    if (duration > 1000) {
      this.queryStats.slowQueries.push({
        query: query.substring(0, 100), // Truncate for storage
        duration,
        timestamp: Date.now()
      })

      // Keep only last 50 slow queries
      if (this.queryStats.slowQueries.length > 50) {
        this.queryStats.slowQueries = this.queryStats.slowQueries.slice(-50)
      }
    }
  }

  getStats() {
    return {
      ...this.queryStats,
      cacheSize: this.queryCache.size,
      cacheHitRate: this.queryStats.totalQueries > 0
        ? (this.queryStats.cacheHits / this.queryStats.totalQueries * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  clearCache(): void {
    this.queryCache.clear()
  }
}

export const dbOptimizer = DatabaseOptimizer.getInstance()

// Connection health check with enhanced monitoring
export async function checkDatabaseConnection() {
  try {
    // Skip database check during build time if no DATABASE_URL
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL && !process.env.DATABASE_URL) {
      return {
        status: 'not_configured',
        message: 'Build environment - skipping database check',
        timestamp: new Date().toISOString()
      }
    }

    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime

    // Get additional connection info (PostgreSQL compatible)
    const connectionInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()` as any[]

    return {
      status: 'healthy',
      responseTime,
      connectionInfo: connectionInfo.length,
      timestamp: new Date().toISOString(),
      stats: dbOptimizer.getStats()
    }
  } catch (error) {
    console.error('Database connection failed:', error)
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }
  }
}
