import { NextRequest, NextResponse } from 'next/server'
import { aiOrchestrator } from '@/lib/ai/orchestrator'
import { hybridData, initializeHybridData } from '@/lib/data/hybrid-data-layer'

/**
 * Hybrid KPI Analysis API
 * Combines Ollama (Llama AI) with Supabase/SQLite data
 * Provides intelligent KPI analysis for Portfolio KPI Copilot
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      query, 
      portfolioId, 
      organizationId, 
      timeframe = 12,
      analysisType = 'comprehensive'
    } = body

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long. Maximum 500 characters.' },
        { status: 400 }
      )
    }

    // Initialize hybrid data layer
    console.log('🔗 Initializing hybrid data layer...')
    const dataStatus = await initializeHybridData()
    
    // Check AI availability
    const aiStatus = await aiOrchestrator.getStatus()
    const llamaAvailable = aiStatus.ollama.available
    
    console.log('📊 System status:', {
      dataSource: dataStatus.activeSource,
      llamaAvailable,
      supabaseConnected: dataStatus.supabase.connected,
      sqliteConnected: dataStatus.sqlite.connected
    })

    let analysisResult

    if (llamaAvailable && dataStatus.activeSource !== 'none') {
      // Use advanced Llama AI analysis with hybrid data
      console.log('🤖 Using Llama AI for advanced KPI analysis...')
      
      try {
        analysisResult = await aiOrchestrator.processRequest({
          type: 'analysis',
          input: {
            portfolioId,
            organizationId,
            query,
            timeframe
          },
          context: {
            organizationId,
            portfolioId
          },
          preferences: {
            aiProvider: 'ollama'
          }
        })

        return NextResponse.json({
          success: true,
          analysis: {
            type: 'llama_advanced',
            query,
            result: analysisResult.data?.analysis || analysisResult.data,
            insights: analysisResult.data?.insights || [],
            recommendations: analysisResult.data?.recommendations || [],
            dataSource: analysisResult.data?.dataSource || 'ai',
            processingTime: analysisResult.metadata.processingTime,
            aiProvider: analysisResult.metadata.provider,
            timestamp: new Date().toISOString()
          },
          systemStatus: {
            aiProvider: 'llama',
            dataSource: dataStatus.activeSource,
            llamaAvailable: true,
            hybridMode: true
          }
        })

      } catch (llamaError) {
        console.warn('Llama analysis failed, falling back to basic analysis:', llamaError)
        // Fall through to basic analysis
      }
    }

    // Fallback: Basic analysis with available data
    console.log('📊 Using basic analysis with available data...')
    
    try {
      const basicAnalysis = await performBasicKPIAnalysis({
        query,
        portfolioId,
        organizationId,
        timeframe,
        dataStatus
      })

      return NextResponse.json({
        success: true,
        analysis: {
          type: 'basic',
          query,
          result: basicAnalysis.analysis,
          insights: basicAnalysis.insights,
          recommendations: basicAnalysis.recommendations,
          dataSource: basicAnalysis.dataSource,
          processingTime: basicAnalysis.processingTime,
          aiProvider: 'basic',
          timestamp: new Date().toISOString()
        },
        systemStatus: {
          aiProvider: llamaAvailable ? 'llama_fallback' : 'basic',
          dataSource: dataStatus.activeSource,
          llamaAvailable,
          hybridMode: dataStatus.activeSource !== 'none'
        },
        notice: llamaAvailable ? 
          'Llama AI available but analysis failed. Using basic analysis.' :
          'Llama AI not available. Using basic analysis. Install Ollama for advanced AI features.'
      })

    } catch (basicError) {
      console.error('Basic analysis also failed:', basicError)
      
      return NextResponse.json({
        success: false,
        error: 'Analysis failed',
        details: basicError instanceof Error ? basicError.message : 'Unknown error',
        systemStatus: {
          aiProvider: 'none',
          dataSource: dataStatus.activeSource,
          llamaAvailable,
          hybridMode: false
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Hybrid KPI analysis API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Basic KPI Analysis (fallback when Llama is not available)
 */
async function performBasicKPIAnalysis(options: {
  query: string
  portfolioId?: string
  organizationId?: string
  timeframe: number
  dataStatus: any
}) {
  const startTime = Date.now()
  const { query, portfolioId, organizationId, timeframe, dataStatus } = options

  try {
    // Get KPI data using hybrid layer
    const kpiData = await hybridData.getKPIs({
      portfolioId,
      organizationId,
      timeframe,
      limit: 50
    })

    // Basic analysis logic
    const kpis = kpiData.data || []
    const analysis = generateBasicAnalysis(query, kpis)
    const insights = generateBasicInsights(kpis)
    const recommendations = generateBasicRecommendations(kpis, query)

    return {
      analysis,
      insights,
      recommendations,
      dataSource: kpiData.source,
      processingTime: Date.now() - startTime
    }

  } catch (error) {
    throw new Error(`Basic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function generateBasicAnalysis(query: string, kpis: any[]): string {
  const kpiCount = kpis.length
  const categories = Array.from(new Set(kpis.map(k => k.category))).slice(0, 5)
  const recentKPIs = kpis.slice(0, 10)

  let analysis = `📊 **KPI Analysis Results**\n\n`
  analysis += `Based on your query: "${query}"\n\n`
  analysis += `**Data Overview:**\n`
  analysis += `• Found ${kpiCount} KPI data points\n`
  analysis += `• Categories: ${categories.join(', ')}\n`
  analysis += `• Recent data available: ${recentKPIs.length} recent entries\n\n`

  if (recentKPIs.length > 0) {
    analysis += `**Recent KPI Highlights:**\n`
    recentKPIs.slice(0, 5).forEach(kpi => {
      analysis += `• ${kpi.name}: ${kpi.value} ${kpi.unit || ''} (${kpi.category})\n`
    })
  }

  analysis += `\n*Note: This is a basic analysis. For advanced AI-powered insights, please set up Ollama integration.*`

  return analysis
}

function generateBasicInsights(kpis: any[]): string[] {
  const insights: string[] = []

  if (kpis.length === 0) {
    insights.push('No KPI data available for analysis')
    return insights
  }

  // Basic statistical insights
  const categories = Array.from(new Set(kpis.map(k => k.category)))
  insights.push(`Portfolio has ${categories.length} different KPI categories`)

  const revenueKPIs = kpis.filter(k => k.category?.toLowerCase().includes('revenue'))
  if (revenueKPIs.length > 0) {
    insights.push(`${revenueKPIs.length} revenue-related KPIs tracked`)
  }

  const recentKPIs = kpis.filter(k => {
    const kpiDate = new Date(k.period)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    return kpiDate > threeMonthsAgo
  })

  if (recentKPIs.length > 0) {
    insights.push(`${recentKPIs.length} KPIs updated in the last 3 months`)
  }

  insights.push('Regular KPI monitoring appears to be in place')

  return insights.slice(0, 4)
}

function generateBasicRecommendations(kpis: any[], query: string): string[] {
  const recommendations: string[] = []

  if (kpis.length === 0) {
    recommendations.push('Start by adding KPI data to enable meaningful analysis')
    recommendations.push('Set up regular KPI tracking and reporting')
    return recommendations
  }

  recommendations.push('Consider setting up Ollama for advanced AI-powered KPI analysis')
  
  if (query.toLowerCase().includes('performance')) {
    recommendations.push('Focus on trend analysis across multiple time periods')
  }

  if (query.toLowerCase().includes('risk')) {
    recommendations.push('Implement automated risk monitoring and alerting')
  }

  recommendations.push('Establish KPI benchmarks and target ranges')

  return recommendations.slice(0, 3)
}

// GET endpoint for system status
export async function GET() {
  try {
    const dataStatus = await initializeHybridData()
    const aiStatus = await aiOrchestrator.getStatus()
    const llamaAvailable = aiStatus.ollama.available
    const healthCheck = await hybridData.healthCheck()

    return NextResponse.json({
      success: true,
      status: {
        hybridDataLayer: {
          activeSource: dataStatus.activeSource,
          supabase: dataStatus.supabase,
          sqlite: dataStatus.sqlite
        },
        aiServices: {
          llamaAvailable,
          ollamaConfigured: !!process.env.OLLAMA_BASE_URL
        },
        healthCheck,
        capabilities: {
          advancedKPIAnalysis: llamaAvailable && dataStatus.activeSource !== 'none',
          basicKPIAnalysis: dataStatus.activeSource !== 'none',
          realTimeData: dataStatus.supabase.connected,
          localProcessing: llamaAvailable
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
