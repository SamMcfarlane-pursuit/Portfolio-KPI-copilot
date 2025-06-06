/**
 * Hybrid Data Access Layer
 * Provides unified interface for both Supabase and Prisma/SQLite
 * Automatically chooses the best available data source
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../supabase/types'

// Initialize clients
const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = (supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-supabase-anon-key') 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null

// Configuration flags
const USE_SUPABASE_PRIMARY = process.env.USE_SUPABASE_PRIMARY === 'true'
const FALLBACK_TO_SQLITE = process.env.FALLBACK_TO_SQLITE === 'true'

export interface DataSourceStatus {
  supabase: {
    available: boolean
    configured: boolean
    connected: boolean
  }
  sqlite: {
    available: boolean
    connected: boolean
  }
  activeSource: 'supabase' | 'sqlite' | 'none'
}

export class HybridDataLayer {
  private static instance: HybridDataLayer
  private status: DataSourceStatus

  private constructor() {
    this.status = {
      supabase: {
        available: !!supabase,
        configured: !!supabase,
        connected: false
      },
      sqlite: {
        available: true,
        connected: false
      },
      activeSource: 'none'
    }
  }

  public static getInstance(): HybridDataLayer {
    if (!HybridDataLayer.instance) {
      HybridDataLayer.instance = new HybridDataLayer()
    }
    return HybridDataLayer.instance
  }

  /**
   * Initialize and test connections
   */
  async initialize(): Promise<DataSourceStatus> {
    // Test Supabase connection
    if (this.status.supabase.available) {
      try {
        const { error } = await supabase!.from('organizations').select('id').limit(1)
        this.status.supabase.connected = !error || error.message.includes('does not exist')
      } catch (error) {
        console.warn('Supabase connection failed:', error)
        this.status.supabase.connected = false
      }
    }

    // Test SQLite connection
    try {
      await prisma.$connect()
      this.status.sqlite.connected = true
    } catch (error) {
      console.warn('SQLite connection failed:', error)
      this.status.sqlite.connected = false
    }

    // Determine active source
    if (USE_SUPABASE_PRIMARY && this.status.supabase.connected) {
      this.status.activeSource = 'supabase'
    } else if (FALLBACK_TO_SQLITE && this.status.sqlite.connected) {
      this.status.activeSource = 'sqlite'
    } else if (this.status.supabase.connected) {
      this.status.activeSource = 'supabase'
    } else if (this.status.sqlite.connected) {
      this.status.activeSource = 'sqlite'
    }

    console.log('🔗 Hybrid Data Layer initialized:', {
      activeSource: this.status.activeSource,
      supabaseAvailable: this.status.supabase.connected,
      sqliteAvailable: this.status.sqlite.connected
    })

    return this.status
  }

  /**
   * Get current status
   */
  getStatus(): DataSourceStatus {
    return this.status
  }

  /**
   * Portfolio Operations - Unified Interface
   */
  async getPortfolios(options: {
    organizationId?: string
    limit?: number
    includeKPIs?: boolean
  } = {}) {
    const { organizationId, limit = 50, includeKPIs = false } = options

    if (this.status.activeSource === 'supabase' && supabase) {
      return this.getPortfoliosFromSupabase({ organizationId, limit, includeKPIs })
    } else if (this.status.activeSource === 'sqlite') {
      return this.getPortfoliosFromSQLite({ organizationId, limit, includeKPIs })
    } else {
      throw new Error('No data source available')
    }
  }

  private async getPortfoliosFromSupabase(options: any) {
    const { organizationId, limit, includeKPIs } = options

    let query = supabase!
      .from('portfolios')
      .select(`
        *,
        funds (
          id,
          name,
          strategy,
          vintage,
          organization_id
        )
        ${includeKPIs ? `,
        kpis (
          id,
          name,
          category,
          value,
          unit,
          period,
          confidence
        )` : ''}
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (organizationId) {
      query = query.eq('funds.organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`)
    }

    return {
      data,
      source: 'supabase',
      count: data?.length || 0
    }
  }

  private async getPortfoliosFromSQLite(options: any) {
    const { organizationId, limit, includeKPIs } = options

    const portfolios = await prisma.portfolio.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: organizationId ? {
        fund: {
          organizationId
        }
      } : undefined,
      include: {
        fund: {
          include: {
            organization: true
          }
        },
        kpis: includeKPIs ? {
          orderBy: { period: 'desc' },
          take: 10
        } : false
      }
    })

    return {
      data: portfolios,
      source: 'sqlite',
      count: portfolios.length
    }
  }

  /**
   * KPI Operations - Optimized for AI Analysis
   */
  async getKPIs(options: {
    portfolioId?: string
    organizationId?: string
    category?: string
    timeframe?: number // months
    limit?: number
  } = {}) {
    if (this.status.activeSource === 'supabase' && supabase) {
      return this.getKPIsFromSupabase(options)
    } else if (this.status.activeSource === 'sqlite') {
      return this.getKPIsFromSQLite(options)
    } else {
      throw new Error('No data source available')
    }
  }

  private async getKPIsFromSupabase(options: any) {
    const { portfolioId, organizationId, category, timeframe, limit = 100 } = options

    let query = supabase!
      .from('kpis')
      .select(`
        *,
        portfolios (
          id,
          name,
          sector,
          funds (
            id,
            name,
            organization_id
          )
        )
      `)
      .order('period', { ascending: false })
      .limit(limit)

    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId)
    }

    if (organizationId) {
      query = query.eq('portfolios.funds.organization_id', organizationId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (timeframe) {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - timeframe)
      query = query.gte('period', cutoffDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Supabase KPI query failed: ${error.message}`)
    }

    return {
      data,
      source: 'supabase',
      count: data?.length || 0
    }
  }

  private async getKPIsFromSQLite(options: any) {
    const { portfolioId, organizationId, category, timeframe, limit = 100 } = options

    const whereClause: any = {}

    if (portfolioId) {
      whereClause.portfolioId = portfolioId
    }

    if (organizationId) {
      whereClause.portfolio = {
        fund: {
          organizationId
        }
      }
    }

    if (category) {
      whereClause.category = category
    }

    if (timeframe) {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - timeframe)
      whereClause.period = {
        gte: cutoffDate
      }
    }

    const kpis = await prisma.kPI.findMany({
      take: limit,
      where: whereClause,
      orderBy: { period: 'desc' },
      include: {
        portfolio: {
          include: {
            fund: {
              include: {
                organization: true
              }
            }
          }
        }
      }
    })

    return {
      data: kpis,
      source: 'sqlite',
      count: kpis.length
    }
  }

  /**
   * Create KPI - Unified interface
   */
  async createKPI(kpiData: {
    portfolioId: string
    organizationId: string
    name: string
    category: string
    value: number
    unit: string
    period: Date
    confidence?: number
    notes?: string
  }) {
    if (this.status.activeSource === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('kpis')
        .insert([kpiData])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create KPI in Supabase: ${error.message}`)
      }

      return { data, source: 'supabase' }
    } else if (this.status.activeSource === 'sqlite') {
      const kpi = await prisma.kPI.create({
        data: kpiData,
        include: {
          portfolio: {
            include: {
              fund: true
            }
          }
        }
      })

      return { data: kpi, source: 'sqlite' }
    } else {
      throw new Error('No data source available')
    }
  }

  /**
   * Health check for both data sources
   */
  async healthCheck() {
    const health = {
      supabase: { status: 'unknown', responseTime: 0, error: null as string | null },
      sqlite: { status: 'unknown', responseTime: 0, error: null as string | null },
      hybrid: { activeSource: this.status.activeSource, recommendation: '' }
    }

    // Test Supabase
    if (this.status.supabase.available) {
      const start = Date.now()
      try {
        const { error } = await supabase!.from('organizations').select('id').limit(1)
        health.supabase.responseTime = Date.now() - start
        health.supabase.status = error ? 'error' : 'healthy'
        if (error) health.supabase.error = error.message
      } catch (error) {
        health.supabase.responseTime = Date.now() - start
        health.supabase.status = 'error'
        health.supabase.error = error instanceof Error ? error.message : 'Unknown error'
      }
    } else {
      health.supabase.status = 'not_configured'
    }

    // Test SQLite
    const start = Date.now()
    try {
      await prisma.organization.findFirst()
      health.sqlite.responseTime = Date.now() - start
      health.sqlite.status = 'healthy'
    } catch (error) {
      health.sqlite.responseTime = Date.now() - start
      health.sqlite.status = 'error'
      health.sqlite.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Generate recommendation
    if (health.supabase.status === 'healthy' && health.sqlite.status === 'healthy') {
      health.hybrid.recommendation = 'Both sources healthy. Using Supabase for production features.'
    } else if (health.supabase.status === 'healthy') {
      health.hybrid.recommendation = 'Using Supabase. Consider SQLite as backup.'
    } else if (health.sqlite.status === 'healthy') {
      health.hybrid.recommendation = 'Using SQLite. Consider setting up Supabase for production.'
    } else {
      health.hybrid.recommendation = 'No healthy data sources available.'
    }

    return health
  }

  /**
   * Cleanup connections
   */
  async disconnect() {
    await prisma.$disconnect()
  }
}

// Export singleton instance
export const hybridData = HybridDataLayer.getInstance()

// Export convenience functions
export async function initializeHybridData() {
  return await hybridData.initialize()
}

export async function getHybridDataStatus() {
  return hybridData.getStatus()
}
