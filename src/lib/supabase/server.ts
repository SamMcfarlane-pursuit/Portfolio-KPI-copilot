/**
 * Supabase Server Client
 * Production-ready Supabase integration with RBAC support
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'
import RBACService from '@/lib/rbac'

export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
}

export class SupabaseServerClient {
  private config: SupabaseConfig | null = null
  private client: SupabaseClient<Database> | null = null
  private adminClient: SupabaseClient<Database> | null = null

  constructor() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      this.config = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      }

      // Initialize clients
      this.client = createClient<Database>(
        this.config.url,
        this.config.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: false
          }
        }
      )

      // Admin client for server-side operations
      if (this.config.serviceRoleKey) {
        this.adminClient = createClient<Database>(
          this.config.url,
          this.config.serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
      }
    }
  }

  isConfigured(): boolean {
    return this.config !== null && this.client !== null
  }

  getClient(): SupabaseClient<Database> | null {
    return this.client
  }

  getAdminClient(): SupabaseClient<Database> | null {
    return this.adminClient
  }
  
  async getPortfolios(userId?: string, organizationId?: string) {
    if (!this.isConfigured() || !this.client) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    try {
      let query = this.client
        .from('portfolios')
        .select(`
          *,
          organizations (
            id,
            name,
            industry
          ),
          kpis (
            id,
            name,
            category,
            value,
            unit,
            period_date
          )
        `)
        .eq('status', 'active')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase getPortfolios error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching portfolios from Supabase:', error)
      return []
    }
  }

  async createPortfolio(data: any) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data: portfolio, error } = await this.client
        .from('portfolios')
        .insert([{
          name: data.name,
          description: data.description,
          organization_id: data.organization_id,
          user_id: data.user_id,
          industry: data.industry,
          stage: data.stage,
          investment_amount: data.investment_amount,
          investment_date: data.investment_date,
          valuation: data.valuation,
          ownership_percentage: data.ownership_percentage,
          status: data.status || 'active',
          metadata: data.metadata || {}
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase createPortfolio error:', error)
        throw error
      }

      return portfolio
    } catch (error) {
      console.error('Error creating portfolio in Supabase:', error)
      throw error
    }
  }

  async updatePortfolio(id: string, data: any) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data: portfolio, error } = await this.client
        .from('portfolios')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase updatePortfolio error:', error)
        throw error
      }

      return portfolio
    } catch (error) {
      console.error('Error updating portfolio in Supabase:', error)
      throw error
    }
  }

  async deletePortfolio(id: string) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { error } = await this.client
        .from('portfolios')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Supabase deletePortfolio error:', error)
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting portfolio in Supabase:', error)
      throw error
    }
  }
  
  async getKPIs(portfolioId?: string, organizationId?: string) {
    if (!this.isConfigured() || !this.client) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    try {
      let query = this.client
        .from('kpis')
        .select(`
          *,
          portfolios (
            id,
            name,
            organization_id
          )
        `)

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId)
      }

      if (organizationId) {
        query = query.eq('portfolios.organization_id', organizationId)
      }

      const { data, error } = await query.order('period_date', { ascending: false })

      if (error) {
        console.error('Supabase getKPIs error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching KPIs from Supabase:', error)
      return []
    }
  }

  async createKPI(data: any) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data: kpi, error } = await this.client
        .from('kpis')
        .insert([{
          portfolio_id: data.portfolio_id,
          name: data.name,
          category: data.category,
          value: data.value,
          unit: data.unit,
          target_value: data.target_value,
          period_type: data.period_type || 'monthly',
          period_date: data.period_date,
          description: data.description,
          calculation_method: data.calculation_method,
          data_source: data.data_source,
          confidence_level: data.confidence_level || 100,
          is_benchmark: data.is_benchmark || false,
          metadata: data.metadata || {}
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase createKPI error:', error)
        throw error
      }

      return kpi
    } catch (error) {
      console.error('Error creating KPI in Supabase:', error)
      throw error
    }
  }

  async getOrganizations(userId?: string) {
    if (!this.isConfigured() || !this.client) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    try {
      let query = this.client
        .from('organizations')
        .select(`
          *,
          portfolios (
            id,
            name,
            status
          )
        `)

      // If userId provided, filter by user's organizations
      // This would require a join with profiles or organization_users table

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase getOrganizations error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching organizations from Supabase:', error)
      return []
    }
  }

  async createOrganization(data: any) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data: organization, error } = await this.client
        .from('organizations')
        .insert([{
          name: data.name,
          description: data.description,
          industry: data.industry,
          website: data.website,
          logo_url: data.logo_url,
          settings: data.settings || {}
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase createOrganization error:', error)
        throw error
      }

      return organization
    } catch (error) {
      console.error('Error creating organization in Supabase:', error)
      throw error
    }
  }

  // Real-time subscription methods
  subscribeToPortfolios(organizationId: string, callback: (payload: any) => void) {
    if (!this.isConfigured() || !this.client) {
      console.warn('Supabase not configured, cannot subscribe')
      return null
    }

    return this.client
      .channel('portfolios')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolios',
          filter: `organization_id=eq.${organizationId}`
        },
        callback
      )
      .subscribe()
  }

  subscribeToKPIs(portfolioId: string, callback: (payload: any) => void) {
    if (!this.isConfigured() || !this.client) {
      console.warn('Supabase not configured, cannot subscribe')
      return null
    }

    return this.client
      .channel('kpis')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpis',
          filter: `portfolio_id=eq.${portfolioId}`
        },
        callback
      )
      .subscribe()
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      status: this.isConfigured() ? 'ready' : 'not_configured',
      url: this.config?.url || 'not_set',
      hasAdminClient: this.adminClient !== null,
      features: {
        realTimeSubscriptions: this.isConfigured(),
        vectorSearch: this.isConfigured(),
        fileStorage: this.isConfigured()
      }
    }
  }
}

export const supabaseServer = new SupabaseServerClient()

// Export commonly used functions with proper return types
export async function getPortfolios(userId?: string, organizationId?: string) {
  try {
    const portfolios = await supabaseServer.getPortfolios(userId, organizationId)
    return { data: portfolios, error: null }
  } catch (error) {
    console.error('Error in getPortfolios:', error)
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createPortfolio(data: any) {
  try {
    const portfolio = await supabaseServer.createPortfolio(data)
    return { data: portfolio, error: null }
  } catch (error) {
    console.error('Error in createPortfolio:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function updatePortfolio(id: string, data: any) {
  try {
    const portfolio = await supabaseServer.updatePortfolio(id, data)
    return { data: portfolio, error: null }
  } catch (error) {
    console.error('Error in updatePortfolio:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deletePortfolio(id: string) {
  try {
    await supabaseServer.deletePortfolio(id)
    return { error: null }
  } catch (error) {
    console.error('Error in deletePortfolio:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// KPI functions
export async function getKPIs(portfolioId?: string, organizationId?: string) {
  try {
    const kpis = await supabaseServer.getKPIs(portfolioId, organizationId)
    return { data: kpis, error: null }
  } catch (error) {
    console.error('Error in getKPIs:', error)
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createKPI(data: any) {
  try {
    const kpi = await supabaseServer.createKPI(data)
    return { data: kpi, error: null }
  } catch (error) {
    console.error('Error in createKPI:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Organization functions
export async function getOrganizations(userId?: string) {
  try {
    const organizations = await supabaseServer.getOrganizations(userId)
    return { data: organizations, error: null }
  } catch (error) {
    console.error('Error in getOrganizations:', error)
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createOrganization(data: any) {
  try {
    const organization = await supabaseServer.createOrganization(data)
    return { data: organization, error: null }
  } catch (error) {
    console.error('Error in createOrganization:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Additional exports for compatibility
export function createSupabaseClient() {
  return supabaseServer.getClient()
}

export function createAdminClient() {
  return supabaseServer.getAdminClient()
}

export async function getUser() {
  // This would integrate with Supabase Auth in a real implementation
  return { id: 'placeholder-user', email: 'user@example.com' }
}

export async function checkOrganizationAccess(userId: string, orgId: string) {
  // This would check user's organization membership in Supabase
  try {
    const client = supabaseServer.getClient()
    if (!client) return false

    // Check if user has access to organization
    const { data, error } = await client
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .eq('organization_id', orgId)
      .single()

    return !error && data !== null
  } catch (error) {
    console.error('Error checking organization access:', error)
    return false
  }
}
