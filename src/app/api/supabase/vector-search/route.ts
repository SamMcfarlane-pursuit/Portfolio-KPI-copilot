/**
 * Supabase Vector Search API for RAG
 * Semantic search capabilities with RBAC security
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { supabaseServer } from '@/lib/supabase/server'
import RBACService from '@/lib/rbac'

// POST vector search for documents and KPIs
const vectorSearch = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    const { 
      query, 
      organizationId, 
      portfolioId, 
      searchType = 'documents', 
      limit = 10, 
      threshold = 0.8,
      includeMetadata = true 
    } = body

    // Validation
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Get Supabase client
    const client = supabaseServer.getClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Vector search not available', code: 'VECTOR_SEARCH_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // Generate embedding for the query (placeholder - would use actual embedding service)
    const queryEmbedding = await generateQueryEmbedding(query)

    let searchResults = []

    if (searchType === 'documents' || searchType === 'all') {
      const documentResults = await searchDocuments(
        client, 
        queryEmbedding, 
        { organizationId, portfolioId, limit, threshold, user }
      )
      searchResults.push(...documentResults)
    }

    if (searchType === 'kpis' || searchType === 'all') {
      const kpiResults = await searchKPIs(
        client, 
        query, 
        { organizationId, portfolioId, limit, user }
      )
      searchResults.push(...kpiResults)
    }

    // Sort by relevance score
    searchResults.sort((a, b) => (b.similarity || b.relevance || 0) - (a.similarity || a.relevance || 0))

    // Limit final results
    const finalResults = searchResults.slice(0, limit)

    // Log search for audit and analytics
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'VECTOR_SEARCH',
      resourceType: 'SEARCH',
      resourceId: organizationId || portfolioId || 'global',
      metadata: {
        query: query.substring(0, 100), // Truncate for privacy
        searchType,
        resultCount: finalResults.length,
        organizationId,
        portfolioId
      }
    })

    return NextResponse.json({
      success: true,
      results: finalResults,
      metadata: {
        query,
        searchType,
        resultCount: finalResults.length,
        totalScanned: searchResults.length,
        threshold,
        organizationId,
        portfolioId,
        userRole: user.organizationRole || user.role
      }
    })

  } catch (error) {
    console.error('Vector search error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Vector search failed',
        code: 'SEARCH_ERROR'
      },
      { status: 500 }
    )
  }
}

// Search documents using vector similarity
async function searchDocuments(
  client: any, 
  queryEmbedding: number[], 
  options: any
) {
  const { organizationId, portfolioId, limit, threshold, user } = options

  try {
    // Build query with RBAC filtering
    let query = client
      .from('documents')
      .select(`
        id,
        title,
        content,
        document_type,
        file_url,
        metadata,
        created_at,
        portfolios (
          id,
          name,
          organization_id,
          organizations (
            id,
            name
          )
        )
      `)
      .not('embedding', 'is', null)
      .limit(limit)

    // Apply organization/portfolio filters
    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId)
    } else if (organizationId) {
      query = query.eq('portfolios.organization_id', organizationId)
    } else {
      // Filter by user's accessible organizations
      const userOrgs = await RBACService.getUserOrganizations(user.userId)
      if (userOrgs.length > 0) {
        query = query.in('portfolios.organization_id', userOrgs)
      }
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Document search error:', error)
      return []
    }

    // Calculate similarity scores (placeholder implementation)
    // In a real implementation, this would use pgvector similarity functions
    const documentsWithSimilarity = documents?.map((doc: any) => ({
      ...doc,
      type: 'document',
      similarity: Math.random() * 0.4 + 0.6, // Placeholder similarity score
      snippet: extractSnippet(doc.content, 200),
      relevance: calculateRelevance(doc, queryEmbedding)
    })) || []

    // Filter by threshold
    return documentsWithSimilarity.filter((doc: any) => doc.similarity >= threshold)

  } catch (error) {
    console.error('Document vector search error:', error)
    return []
  }
}

// Search KPIs using text matching and metadata
async function searchKPIs(
  client: any, 
  query: string, 
  options: any
) {
  const { organizationId, portfolioId, limit, user } = options

  try {
    // Build KPI search query
    let kpiQuery = client
      .from('kpis')
      .select(`
        id,
        name,
        category,
        value,
        unit,
        target_value,
        period_date,
        description,
        metadata,
        portfolios (
          id,
          name,
          organization_id,
          organizations (
            id,
            name
          )
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(limit)

    // Apply filters
    if (portfolioId) {
      kpiQuery = kpiQuery.eq('portfolio_id', portfolioId)
    } else if (organizationId) {
      kpiQuery = kpiQuery.eq('portfolios.organization_id', organizationId)
    } else {
      // Filter by user's accessible organizations
      const userOrgs = await RBACService.getUserOrganizations(user.userId)
      if (userOrgs.length > 0) {
        kpiQuery = kpiQuery.in('portfolios.organization_id', userOrgs)
      }
    }

    const { data: kpis, error } = await kpiQuery

    if (error) {
      console.error('KPI search error:', error)
      return []
    }

    // Calculate relevance scores
    const kpisWithRelevance = kpis?.map((kpi: any) => ({
      ...kpi,
      type: 'kpi',
      relevance: calculateKPIRelevance(kpi, query),
      snippet: `${kpi.name}: ${kpi.value} ${kpi.unit || ''} (${kpi.category})`,
      trend: kpi.target_value ? (kpi.value >= kpi.target_value ? 'positive' : 'negative') : 'neutral'
    })) || []

    return kpisWithRelevance

  } catch (error) {
    console.error('KPI search error:', error)
    return []
  }
}

// Helper functions
async function generateQueryEmbedding(query: string): Promise<number[]> {
  // Placeholder implementation
  // In a real implementation, this would call OpenAI embeddings API or similar
  return Array.from({ length: 1536 }, () => Math.random() - 0.5)
}

function extractSnippet(content: string, maxLength: number): string {
  if (!content) return ''
  
  const cleaned = content.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  
  return cleaned.substring(0, maxLength) + '...'
}

function calculateRelevance(document: any, queryEmbedding: number[]): number {
  // Placeholder relevance calculation
  // In a real implementation, this would use actual vector similarity
  const titleMatch = document.title ? 0.3 : 0
  const contentMatch = document.content ? 0.5 : 0
  const typeBonus = document.document_type === 'report' ? 0.2 : 0.1
  
  return Math.min(titleMatch + contentMatch + typeBonus + Math.random() * 0.3, 1.0)
}

function calculateKPIRelevance(kpi: any, query: string): number {
  const queryLower = query.toLowerCase()
  let score = 0
  
  // Name match
  if (kpi.name?.toLowerCase().includes(queryLower)) score += 0.4
  
  // Category match
  if (kpi.category?.toLowerCase().includes(queryLower)) score += 0.3
  
  // Description match
  if (kpi.description?.toLowerCase().includes(queryLower)) score += 0.2
  
  // Recent data bonus
  const daysSinceUpdate = Math.floor((Date.now() - new Date(kpi.period_date).getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceUpdate < 30) score += 0.1
  
  return Math.min(score, 1.0)
}

// GET search suggestions and analytics
const getSearchSuggestions = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const partial = searchParams.get('q') || ''

    // Get popular search terms and suggestions
    const suggestions = {
      popular: [
        'revenue growth',
        'customer acquisition cost',
        'monthly recurring revenue',
        'churn rate',
        'gross margin',
        'burn rate',
        'runway',
        'valuation'
      ],
      categories: [
        'financial',
        'operational', 
        'growth',
        'efficiency',
        'risk'
      ],
      recent: [] // Would come from search analytics
    }

    // Filter suggestions based on partial input
    if (partial.length > 0) {
      const filtered = suggestions.popular.filter(term => 
        term.toLowerCase().includes(partial.toLowerCase())
      )
      suggestions.popular = filtered
    }

    return NextResponse.json({
      success: true,
      suggestions,
      metadata: {
        organizationId,
        partial,
        userRole: user.organizationRole || user.role
      }
    })

  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get search suggestions',
        code: 'SUGGESTIONS_ERROR'
      },
      { status: 500 }
    )
  }
}

// Export RBAC-protected handlers
export const POST = withRBAC(vectorSearch, { 
  permission: PERMISSIONS.VIEW_KPI // Basic permission for search
})

export const GET = withRBAC(getSearchSuggestions, { 
  permission: PERMISSIONS.VIEW_KPI
})
