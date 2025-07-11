/**
 * Hybrid Data Access Layer
 * Provides unified interface for both Supabase and Prisma/SQLite
 * Automatically chooses the best available data source with intelligent fallback
 */

import { prisma } from '@/lib/prisma'
import { supabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'
import RBACService from '@/lib/rbac'

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
        available: supabaseServer.isConfigured(),
        configured: supabaseServer.isConfigured(),
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
        const client = supabaseServer.getClient()
        if (client) {
          const { error } = await client.from('organizations').select('id').limit(1)
          this.status.supabase.connected = !error || error.message.includes('does not exist')
        } else {
          this.status.supabase.connected = false
        }
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

    if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
      return this.getPortfoliosFromSupabase({ organizationId, limit, includeKPIs })
    } else if (this.status.activeSource === 'sqlite') {
      return this.getPortfoliosFromSQLite({ organizationId, limit, includeKPIs })
    } else {
      throw new Error('No data source available')
    }
  }

  private async getPortfoliosFromSupabase(options: any) {
    const { organizationId, limit, includeKPIs } = options
    const client = supabaseServer.getClient()

    if (!client) {
      throw new Error('Supabase client not available')
    }

    let query = client
      .from('portfolios')
      .select(`
        *,
        organizations (
          id,
          name,
          industry
        )
        ${includeKPIs ? `,
        kpis (
          id,
          name,
          category,
          value,
          unit,
          period_date,
          confidence_level
        )` : ''}
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
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
    if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
      return this.getKPIsFromSupabase(options)
    } else if (this.status.activeSource === 'sqlite') {
      return this.getKPIsFromSQLite(options)
    } else {
      throw new Error('No data source available')
    }
  }

  private async getKPIsFromSupabase(options: any) {
    const { portfolioId, organizationId, category, timeframe, limit = 100 } = options
    const client = supabaseServer.getClient()

    if (!client) {
      throw new Error('Supabase client not available')
    }

    let query = client
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
   * Create Company/Portfolio - Unified interface
   */
  async createCompany(companyData: {
    name: string
    sector: string
    geography?: string
    description?: string
    investment: number
    organizationId: string
    userId?: string
  }) {
    if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
      return await supabaseServer.createPortfolio({
        name: companyData.name,
        description: companyData.description,
        organization_id: companyData.organizationId,
        user_id: companyData.userId,
        industry: companyData.sector,
        investment_amount: companyData.investment,
        status: 'active'
      })
    } else if (this.status.activeSource === 'sqlite') {
      // For SQLite, we need to create through the portfolio structure
      const portfolio = await prisma.portfolio.create({
        data: {
          name: companyData.name,
          sector: companyData.sector,
          geography: companyData.geography || 'North America',
          investment: companyData.investment,
          fund: {
            create: {
              name: 'Default Fund',
              fundNumber: `${companyData.organizationId}-DEFAULT`,
              organizationId: companyData.organizationId,
              totalSize: companyData.investment,
              vintage: new Date().getFullYear()
            }
          }
        },
        include: {
          fund: {
            include: {
              organization: true
            }
          }
        }
      })

      return { data: portfolio, source: 'sqlite' }
    } else {
      throw new Error('No data source available')
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
    if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
      const client = supabaseServer.getClient()

      if (!client) {
        throw new Error('Supabase client not available')
      }

      const { data, error } = await client
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
   * Prisma-compatible interface for portfolio operations
   */
  get portfolio() {
    return {
      findUnique: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          const { data, error } = await client
            .from('portfolios')
            .select('*')
            .eq('id', params.where.id)
            .single()

          if (error) throw new Error(`Supabase query failed: ${error.message}`)
          return data
        } else {
          return await prisma.portfolio.findUnique(params)
        }
      },

      findMany: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          let query = client.from('portfolios').select('*')

          if (params.where) {
            Object.entries(params.where).forEach(([key, value]) => {
              query = query.eq(key, value)
            })
          }

          if (params.take) query = query.limit(params.take)
          if (params.orderBy) {
            const orderField = Object.keys(params.orderBy)[0]
            const orderDirection = params.orderBy[orderField] === 'desc' ? false : true
            query = query.order(orderField, { ascending: orderDirection })
          }

          const { data, error } = await query
          if (error) throw new Error(`Supabase query failed: ${error.message}`)
          return data
        } else {
          return await prisma.portfolio.findMany(params)
        }
      },

      create: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          const { data, error } = await client
            .from('portfolios')
            .insert([params.data])
            .select()
            .single()

          if (error) throw new Error(`Supabase insert failed: ${error.message}`)
          return data
        } else {
          return await prisma.portfolio.create(params)
        }
      },

      update: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          const { data, error } = await client
            .from('portfolios')
            .update(params.data)
            .eq('id', params.where.id)
            .select()
            .single()

          if (error) throw new Error(`Supabase update failed: ${error.message}`)
          return data
        } else {
          return await prisma.portfolio.update(params)
        }
      },

      delete: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          const { data, error } = await client
            .from('portfolios')
            .delete()
            .eq('id', params.where.id)
            .select()
            .single()

          if (error) throw new Error(`Supabase delete failed: ${error.message}`)
          return data
        } else {
          return await prisma.portfolio.delete(params)
        }
      },

      count: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          let query = client.from('portfolios').select('*', { count: 'exact', head: true })

          if (params.where) {
            Object.entries(params.where).forEach(([key, value]) => {
              query = query.eq(key, value)
            })
          }

          const { count, error } = await query
          if (error) throw new Error(`Supabase count failed: ${error.message}`)
          return count || 0
        } else {
          return await prisma.portfolio.count(params)
        }
      },

      groupBy: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          // Supabase doesn't have direct groupBy, so we'll simulate it
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          const { data, error } = await client
            .from('portfolios')
            .select(params.by.join(','))

          if (error) throw new Error(`Supabase groupBy failed: ${error.message}`)

          // Group the results manually
          const grouped = data?.reduce((acc: any, item: any) => {
            const key = params.by.map((field: string) => item[field]).join('|')
            if (!acc[key]) {
              acc[key] = { ...item, _count: { _all: 0 } }
            }
            acc[key]._count._all++
            return acc
          }, {})

          return Object.values(grouped || {})
        } else {
          return await prisma.portfolio.groupBy(params)
        }
      },

      aggregate: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          const { data, error } = await client
            .from('portfolios')
            .select('*')

          if (error) throw new Error(`Supabase aggregate failed: ${error.message}`)

          // Calculate aggregations manually
          const result: any = {}
          if (params._sum) {
            result._sum = {}
            Object.keys(params._sum).forEach(field => {
              result._sum[field] = data?.reduce((sum: number, item: any) => sum + (item[field] || 0), 0) || 0
            })
          }
          if (params._count) {
            result._count = { _all: data?.length || 0 }
          }

          return result
        } else {
          return await prisma.portfolio.aggregate(params)
        }
      }
    }
  }

  /**
   * Prisma-compatible interface for KPI operations
   */
  get kpi() {
    return {
      findMany: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          let query = client.from('kpis').select('*')

          if (params.where) {
            Object.entries(params.where).forEach(([key, value]) => {
              query = query.eq(key, value)
            })
          }

          if (params.take) query = query.limit(params.take)
          if (params.orderBy) {
            const orderField = Object.keys(params.orderBy)[0]
            const orderDirection = params.orderBy[orderField] === 'desc' ? false : true
            query = query.order(orderField, { ascending: orderDirection })
          }

          const { data, error } = await query
          if (error) throw new Error(`Supabase query failed: ${error.message}`)
          return data
        } else {
          return await prisma.kPI.findMany(params)
        }
      },

      count: async (params: any) => {
        if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
          const client = supabaseServer.getClient()
          if (!client) throw new Error('Supabase client not available')

          let query = client.from('kpis').select('*', { count: 'exact', head: true })

          if (params.where) {
            Object.entries(params.where).forEach(([key, value]) => {
              query = query.eq(key, value)
            })
          }

          const { count, error } = await query
          if (error) throw new Error(`Supabase count failed: ${error.message}`)
          return count || 0
        } else {
          return await prisma.kPI.count(params)
        }
      }
    }
  }

  /**
   * Raw query interface for compatibility
   */
  async $queryRaw(query: any, ...params: any[]) {
    if (this.status.activeSource === 'supabase' && supabaseServer.isConfigured()) {
      // For Supabase, we'll use a simple health check query
      const client = supabaseServer.getClient()
      if (!client) throw new Error('Supabase client not available')

      // Convert common raw queries to Supabase equivalents
      if (query.toString().includes('SELECT 1')) {
        return [{ test: 1 }]
      }

      // For connection info queries, return mock data
      if (query.toString().includes('current_database')) {
        return [{
          current_database: 'supabase',
          current_user: 'authenticated',
          version: 'PostgreSQL 15.0'
        }]
      }

      throw new Error('Raw queries not fully supported with Supabase')
    } else {
      return await prisma.$queryRaw(query, ...params)
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
        const client = supabaseServer.getClient()
        if (client) {
          const { error } = await client.from('organizations').select('id').limit(1)
          health.supabase.responseTime = Date.now() - start
          health.supabase.status = error ? 'error' : 'healthy'
          if (error) health.supabase.error = error.message
        } else {
          health.supabase.responseTime = Date.now() - start
          health.supabase.status = 'error'
          health.supabase.error = 'Supabase client not available'
        }
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
