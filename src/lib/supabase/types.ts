/**
 * Supabase Database Types
 * Auto-generated types for type-safe database operations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'admin' | 'manager'
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'manager'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'manager'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          description: string | null
          industry: string | null
          website: string | null
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          industry?: string | null
          website?: string | null
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          industry?: string | null
          website?: string | null
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string | null
          user_id: string | null
          industry: string | null
          stage: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'growth' | 'mature' | null
          investment_amount: number | null
          investment_date: string | null
          valuation: number | null
          ownership_percentage: number | null
          status: 'active' | 'exited' | 'written_off' | 'monitoring'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organization_id?: string | null
          user_id?: string | null
          industry?: string | null
          stage?: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'growth' | 'mature' | null
          investment_amount?: number | null
          investment_date?: string | null
          valuation?: number | null
          ownership_percentage?: number | null
          status?: 'active' | 'exited' | 'written_off' | 'monitoring'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organization_id?: string | null
          user_id?: string | null
          industry?: string | null
          stage?: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'growth' | 'mature' | null
          investment_amount?: number | null
          investment_date?: string | null
          valuation?: number | null
          ownership_percentage?: number | null
          status?: 'active' | 'exited' | 'written_off' | 'monitoring'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      kpis: {
        Row: {
          id: string
          portfolio_id: string | null
          name: string
          category: 'financial' | 'operational' | 'growth' | 'efficiency' | 'risk'
          value: number | null
          unit: string | null
          target_value: number | null
          period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          period_date: string
          description: string | null
          calculation_method: string | null
          data_source: string | null
          confidence_level: number
          is_benchmark: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id?: string | null
          name: string
          category: 'financial' | 'operational' | 'growth' | 'efficiency' | 'risk'
          value?: number | null
          unit?: string | null
          target_value?: number | null
          period_type?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          period_date: string
          description?: string | null
          calculation_method?: string | null
          data_source?: string | null
          confidence_level?: number
          is_benchmark?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string | null
          name?: string
          category?: 'financial' | 'operational' | 'growth' | 'efficiency' | 'risk'
          value?: number | null
          unit?: string | null
          target_value?: number | null
          period_type?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          period_date?: string
          description?: string | null
          calculation_method?: string | null
          data_source?: string | null
          confidence_level?: number
          is_benchmark?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          portfolio_id: string | null
          name: string
          legal_name: string | null
          website: string | null
          industry: string | null
          sub_industry: string | null
          founded_date: string | null
          headquarters: string | null
          employee_count: number | null
          business_model: string | null
          revenue_model: string | null
          description: string | null
          logo_url: string | null
          status: 'active' | 'acquired' | 'closed' | 'ipo'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id?: string | null
          name: string
          legal_name?: string | null
          website?: string | null
          industry?: string | null
          sub_industry?: string | null
          founded_date?: string | null
          headquarters?: string | null
          employee_count?: number | null
          business_model?: string | null
          revenue_model?: string | null
          description?: string | null
          logo_url?: string | null
          status?: 'active' | 'acquired' | 'closed' | 'ipo'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string | null
          name?: string
          legal_name?: string | null
          website?: string | null
          industry?: string | null
          sub_industry?: string | null
          founded_date?: string | null
          headquarters?: string | null
          employee_count?: number | null
          business_model?: string | null
          revenue_model?: string | null
          description?: string | null
          logo_url?: string | null
          status?: 'active' | 'acquired' | 'closed' | 'ipo'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          portfolio_id: string | null
          title: string
          content: string | null
          document_type: 'report' | 'presentation' | 'financial' | 'legal' | 'memo' | 'other' | null
          file_url: string | null
          file_size: number | null
          mime_type: string | null
          embedding: string | null // Vector type as string
          metadata: Json
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id?: string | null
          title: string
          content?: string | null
          document_type?: 'report' | 'presentation' | 'financial' | 'legal' | 'memo' | 'other' | null
          file_url?: string | null
          file_size?: number | null
          mime_type?: string | null
          embedding?: string | null
          metadata?: Json
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string | null
          title?: string
          content?: string | null
          document_type?: 'report' | 'presentation' | 'financial' | 'legal' | 'memo' | 'other' | null
          file_url?: string | null
          file_size?: number | null
          mime_type?: string | null
          embedding?: string | null
          metadata?: Json
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for common operations
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Portfolio = Database['public']['Tables']['portfolios']['Row']
export type KPI = Database['public']['Tables']['kpis']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type Document = Database['public']['Tables']['documents']['Row']

export type InsertProfile = Database['public']['Tables']['profiles']['Insert']
export type InsertOrganization = Database['public']['Tables']['organizations']['Insert']
export type InsertPortfolio = Database['public']['Tables']['portfolios']['Insert']
export type InsertKPI = Database['public']['Tables']['kpis']['Insert']
export type InsertCompany = Database['public']['Tables']['companies']['Insert']
export type InsertDocument = Database['public']['Tables']['documents']['Insert']

export type UpdateProfile = Database['public']['Tables']['profiles']['Update']
export type UpdateOrganization = Database['public']['Tables']['organizations']['Update']
export type UpdatePortfolio = Database['public']['Tables']['portfolios']['Update']
export type UpdateKPI = Database['public']['Tables']['kpis']['Update']
export type UpdateCompany = Database['public']['Tables']['companies']['Update']
export type UpdateDocument = Database['public']['Tables']['documents']['Update']
