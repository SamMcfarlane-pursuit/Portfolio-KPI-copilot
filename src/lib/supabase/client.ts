/**
 * Supabase Client-Side Integration
 * Real-time subscriptions and client-side operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

class SupabaseClientManager {
  private client: SupabaseClient<Database> | null = null
  private subscriptions: Map<string, any> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeClient()
    }
  }

  private initializeClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey && 
        supabaseUrl !== 'https://your-project.supabase.co' &&
        supabaseAnonKey !== 'your-supabase-anon-key') {
      
      this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      })
    }
  }

  getClient(): SupabaseClient<Database> | null {
    return this.client
  }

  isConfigured(): boolean {
    return this.client !== null
  }

  // Real-time subscription management
  subscribeToPortfolios(
    organizationId: string,
    callback: (payload: any) => void,
    options: { userId?: string } = {}
  ) {
    if (!this.client) {
      console.warn('Supabase client not configured')
      return null
    }

    const subscriptionKey = `portfolios-${organizationId}`
    
    // Unsubscribe existing subscription if any
    this.unsubscribe(subscriptionKey)

    const subscription = this.client
      .channel(`portfolios-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolios',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('Portfolio change:', payload)
          callback(payload)
        }
      )
      .subscribe((status) => {
        console.log('Portfolio subscription status:', status)
      })

    this.subscriptions.set(subscriptionKey, subscription)
    return subscription
  }

  subscribeToKPIs(
    portfolioId: string,
    callback: (payload: any) => void
  ) {
    if (!this.client) {
      console.warn('Supabase client not configured')
      return null
    }

    const subscriptionKey = `kpis-${portfolioId}`
    
    // Unsubscribe existing subscription if any
    this.unsubscribe(subscriptionKey)

    const subscription = this.client
      .channel(`kpis-${portfolioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpis',
          filter: `portfolio_id=eq.${portfolioId}`
        },
        (payload) => {
          console.log('KPI change:', payload)
          callback(payload)
        }
      )
      .subscribe((status) => {
        console.log('KPI subscription status:', status)
      })

    this.subscriptions.set(subscriptionKey, subscription)
    return subscription
  }

  subscribeToOrganizations(
    userId: string,
    callback: (payload: any) => void
  ) {
    if (!this.client) {
      console.warn('Supabase client not configured')
      return null
    }

    const subscriptionKey = `organizations-${userId}`
    
    // Unsubscribe existing subscription if any
    this.unsubscribe(subscriptionKey)

    const subscription = this.client
      .channel(`organizations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations'
        },
        (payload) => {
          console.log('Organization change:', payload)
          callback(payload)
        }
      )
      .subscribe((status) => {
        console.log('Organization subscription status:', status)
      })

    this.subscriptions.set(subscriptionKey, subscription)
    return subscription
  }

  // Presence tracking for collaborative features
  trackUserPresence(
    channel: string,
    userId: string,
    userInfo: { name: string; email: string; role?: string }
  ) {
    if (!this.client) {
      console.warn('Supabase client not configured')
      return null
    }

    const presenceChannel = this.client.channel(channel)
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState()
        console.log('Presence sync:', newState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId,
            ...userInfo,
            onlineAt: new Date().toISOString()
          })
        }
      })

    return presenceChannel
  }

  // Unsubscribe from specific subscription
  unsubscribe(subscriptionKey: string) {
    const subscription = this.subscriptions.get(subscriptionKey)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(subscriptionKey)
      console.log(`Unsubscribed from ${subscriptionKey}`)
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll() {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe()
      console.log(`Unsubscribed from ${key}`)
    })
    this.subscriptions.clear()
  }

  // File upload functionality
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options: { upsert?: boolean; metadata?: Record<string, any> } = {}
  ) {
    if (!this.client) {
      throw new Error('Supabase client not configured')
    }

    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: options.upsert || false,
        metadata: options.metadata
      })

    if (error) {
      console.error('File upload error:', error)
      throw error
    }

    return data
  }

  // Get file URL
  getFileUrl(bucket: string, path: string) {
    if (!this.client) {
      throw new Error('Supabase client not configured')
    }

    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  // Vector search for RAG functionality
  async vectorSearch(
    query: string,
    options: {
      table?: string
      column?: string
      limit?: number
      threshold?: number
    } = {}
  ) {
    if (!this.client) {
      throw new Error('Supabase client not configured')
    }

    const {
      table = 'documents',
      column = 'embedding',
      limit = 10,
      threshold = 0.8
    } = options

    // This would use pgvector similarity search
    // For now, return a placeholder implementation
    console.log('Vector search not yet implemented:', { query, options })
    return { data: [], error: null }
  }

  // Health check
  async healthCheck() {
    if (!this.client) {
      return {
        status: 'not_configured',
        configured: false,
        connected: false
      }
    }

    try {
      // Simple query to test connection
      const { data, error } = await this.client
        .from('organizations')
        .select('id')
        .limit(1)

      return {
        status: error ? 'error' : 'healthy',
        configured: true,
        connected: !error,
        error: error?.message
      }
    } catch (error) {
      return {
        status: 'error',
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get connection status
  getStatus() {
    return {
      configured: this.isConfigured(),
      activeSubscriptions: this.subscriptions.size,
      subscriptionKeys: Array.from(this.subscriptions.keys())
    }
  }
}

// Create singleton instance
const supabaseClientManager = new SupabaseClientManager()

// Export the manager and convenience functions
export default supabaseClientManager

export const supabaseClient = supabaseClientManager.getClient()

export const {
  subscribeToPortfolios,
  subscribeToKPIs,
  subscribeToOrganizations,
  trackUserPresence,
  unsubscribe,
  unsubscribeAll,
  uploadFile,
  getFileUrl,
  vectorSearch,
  healthCheck,
  getStatus
} = supabaseClientManager
