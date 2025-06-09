/**
 * Advanced AI Analytics API
 * Enterprise-grade KPI analysis with multi-model orchestration
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { analyticsEngine, AnalyticsRequest } from '@/lib/ai/analytics-engine'
import { aiOrchestrator } from '@/lib/ai/orchestrator'
import RBACService from '@/lib/rbac'

// POST advanced analytics analysis
const performAnalytics = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    
    const {
      portfolioId,
      organizationId,
      analysisType = 'comprehensive',
      timeframe = 12,
      kpiCategories,
      customQuery
    } = body

    // Validation
    if (!analysisType) {
      return NextResponse.json(
        { error: 'Analysis type is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const validAnalysisTypes = ['trend', 'benchmark', 'forecast', 'comprehensive', 'anomaly', 'correlation']
    if (!validAnalysisTypes.includes(analysisType)) {
      return NextResponse.json(
        { error: 'Invalid analysis type', code: 'INVALID_ANALYSIS_TYPE' },
        { status: 400 }
      )
    }

    // Build analytics request
    const analyticsRequest: AnalyticsRequest = {
      userId: user.userId,
      organizationId,
      portfolioId,
      analysisType,
      timeframe,
      kpiCategories,
      customQuery
    }

    // Perform advanced analytics
    const startTime = Date.now()
    const result = await analyticsEngine.performAnalysis(analyticsRequest)
    const processingTime = Date.now() - startTime

    // Enrich result with user context
    const enrichedResult = {
      ...result,
      userContext: {
        role: user.organizationRole || user.role,
        permissions: {
          canViewSensitiveData: RBACService.hasPermission(user, PERMISSIONS.VIEW_SENSITIVE_DATA),
          canExportData: RBACService.hasPermission(user, PERMISSIONS.EXPORT_DATA),
          canCreateReports: RBACService.hasPermission(user, PERMISSIONS.CREATE_KPI)
        }
      },
      requestMetadata: {
        analysisType,
        timeframe,
        portfolioId,
        organizationId,
        processingTime
      }
    }

    return NextResponse.json({
      success: true,
      analytics: enrichedResult,
      capabilities: {
        aiProvider: result.metadata.aiProvider,
        model: result.metadata.model,
        confidence: result.metadata.confidence,
        dataPoints: result.metadata.dataPoints
      },
      recommendations: {
        nextSteps: generateNextSteps(result, analysisType),
        relatedAnalyses: suggestRelatedAnalyses(analysisType),
        improvementAreas: identifyImprovementAreas(result)
      }
    })

  } catch (error) {
    console.error('Advanced analytics error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Analytics processing failed',
        code: 'ANALYTICS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET analytics capabilities and status
const getAnalyticsCapabilities = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    // Check available AI providers
    const capabilities = {
      aiProviders: {
        openrouter: {
          available: false,
          models: [] as string[],
          features: ['advanced_analysis', 'forecasting', 'benchmarking']
        },
        ollama: {
          available: false,
          models: [] as string[],
          features: ['local_processing', 'privacy_focused']
        },
        hybrid: {
          available: true,
          models: ['statistical_analysis'],
          features: ['basic_analysis', 'trend_detection']
        }
      },
      analysisTypes: [
        {
          type: 'comprehensive',
          description: 'Complete KPI analysis with insights and recommendations',
          complexity: 'high',
          estimatedTime: '30-60 seconds'
        },
        {
          type: 'trend',
          description: 'Trend analysis and pattern detection',
          complexity: 'medium',
          estimatedTime: '15-30 seconds'
        },
        {
          type: 'benchmark',
          description: 'Industry benchmark comparison',
          complexity: 'medium',
          estimatedTime: '20-40 seconds'
        },
        {
          type: 'forecast',
          description: 'Predictive modeling and forecasting',
          complexity: 'high',
          estimatedTime: '45-90 seconds'
        },
        {
          type: 'anomaly',
          description: 'Anomaly detection and outlier analysis',
          complexity: 'medium',
          estimatedTime: '10-20 seconds'
        },
        {
          type: 'correlation',
          description: 'Correlation analysis between metrics',
          complexity: 'low',
          estimatedTime: '5-15 seconds'
        }
      ],
      userPermissions: {
        canPerformAnalytics: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
        canViewAdvancedInsights: RBACService.hasPermission(user, PERMISSIONS.VIEW_SENSITIVE_DATA),
        canExportResults: RBACService.hasPermission(user, PERMISSIONS.EXPORT_DATA),
        canScheduleAnalytics: RBACService.hasPermission(user, PERMISSIONS.CREATE_KPI)
      },
      dataAvailability: {
        organizationId,
        estimatedKPIs: 0, // Would be calculated from actual data
        timeRange: '12 months',
        categories: ['financial', 'operational', 'growth', 'efficiency', 'risk']
      }
    }

    // Check OpenRouter availability
    try {
      const { openRouterService } = await import('@/lib/ai/openrouter')
      if (openRouterService.isAvailable()) {
        const health = await openRouterService.healthCheck()
        capabilities.aiProviders.openrouter.available = health.status === 'healthy'
        capabilities.aiProviders.openrouter.models = health.models || []
      }
    } catch (error) {
      console.warn('OpenRouter check failed:', error)
    }

    // Check Ollama availability via orchestrator
    try {
      const orchestratorStatus = await aiOrchestrator.getStatus()
      capabilities.aiProviders.ollama.available = orchestratorStatus.ollama.available
      if (capabilities.aiProviders.ollama.available) {
        capabilities.aiProviders.ollama.models = ['llama3.2:latest']
      }
    } catch (error) {
      console.warn('Ollama check failed:', error)
    }

    return NextResponse.json({
      success: true,
      capabilities,
      recommendations: {
        suggestedAnalysis: suggestAnalysisForUser(user),
        setupInstructions: generateSetupInstructions(capabilities),
        bestPractices: getAnalyticsBestPractices()
      }
    })

  } catch (error) {
    console.error('Analytics capabilities error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get analytics capabilities',
        code: 'CAPABILITIES_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST batch analytics for multiple portfolios
const performBatchAnalytics = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    
    const {
      portfolioIds = [],
      organizationId,
      analysisType = 'comprehensive',
      timeframe = 12
    } = body

    if (portfolioIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one portfolio ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (portfolioIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 portfolios per batch', code: 'BATCH_LIMIT_EXCEEDED' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Process each portfolio
    for (const portfolioId of portfolioIds) {
      try {
        const analyticsRequest: AnalyticsRequest = {
          userId: user.userId,
          organizationId,
          portfolioId,
          analysisType,
          timeframe
        }

        const result = await analyticsEngine.performAnalysis(analyticsRequest)
        results.push({
          portfolioId,
          success: true,
          analytics: result
        })

      } catch (error) {
        errors.push({
          portfolioId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Generate batch summary
    const summary = {
      totalPortfolios: portfolioIds.length,
      successfulAnalyses: results.length,
      failedAnalyses: errors.length,
      overallTrends: generateBatchTrends(results),
      comparativeInsights: generateComparativeInsights(results)
    }

    return NextResponse.json({
      success: true,
      batch: {
        summary,
        results,
        errors
      },
      metadata: {
        analysisType,
        timeframe,
        processingTime: Date.now(),
        userRole: user.organizationRole || user.role
      }
    })

  } catch (error) {
    console.error('Batch analytics error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Batch analytics failed',
        code: 'BATCH_ANALYTICS_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper functions
function generateNextSteps(result: any, analysisType: string): string[] {
  const steps = []

  if (analysisType === 'trend') {
    steps.push('Monitor trending metrics closely')
    steps.push('Set up alerts for significant changes')
  }

  if (analysisType === 'anomaly') {
    steps.push('Investigate detected anomalies')
    steps.push('Implement anomaly monitoring')
  }

  if (result.riskAssessment?.level === 'high') {
    steps.push('Address high-risk factors immediately')
  }

  steps.push('Schedule follow-up analysis')
  return steps
}

function suggestRelatedAnalyses(analysisType: string): string[] {
  const suggestions = {
    trend: ['forecast', 'correlation'],
    benchmark: ['trend', 'anomaly'],
    forecast: ['trend', 'benchmark'],
    comprehensive: ['anomaly', 'correlation'],
    anomaly: ['trend', 'correlation'],
    correlation: ['trend', 'forecast']
  }

  return suggestions[analysisType as keyof typeof suggestions] || []
}

function identifyImprovementAreas(result: any): string[] {
  const areas = []

  if (result.metadata.confidence < 70) {
    areas.push('Improve data quality')
  }

  if (result.metadata.dataPoints < 10) {
    areas.push('Collect more historical data')
  }

  areas.push('Standardize KPI definitions')
  areas.push('Implement automated data collection')

  return areas
}

function suggestAnalysisForUser(user: any): string {
  const role = user.organizationRole || user.role

  switch (role) {
    case 'SUPER_ADMIN':
    case 'ORG_ADMIN':
      return 'comprehensive'
    case 'MANAGER':
      return 'benchmark'
    case 'ANALYST':
      return 'trend'
    default:
      return 'comprehensive'
  }
}

function generateSetupInstructions(capabilities: any): string[] {
  const instructions = []

  if (!capabilities.aiProviders.openrouter.available) {
    instructions.push('Configure OpenRouter API key for advanced AI features')
  }

  if (!capabilities.aiProviders.ollama.available) {
    instructions.push('Install Ollama for local AI processing')
  }

  instructions.push('Ensure sufficient historical KPI data (minimum 6 months)')
  instructions.push('Standardize KPI categories and definitions')

  return instructions
}

function getAnalyticsBestPractices(): string[] {
  return [
    'Collect consistent, high-quality KPI data',
    'Define clear benchmarks and targets',
    'Perform regular trend analysis',
    'Monitor for anomalies and outliers',
    'Use multiple analysis types for comprehensive insights',
    'Validate AI insights with domain expertise',
    'Document analysis methodology and assumptions',
    'Share insights across the organization'
  ]
}

function generateBatchTrends(results: any[]): any {
  // Simplified batch trend analysis
  return {
    commonTrends: ['Revenue growth trending upward'],
    outliers: [],
    averagePerformance: 'Above average'
  }
}

function generateComparativeInsights(results: any[]): string[] {
  return [
    'Portfolio performance varies significantly',
    'Common improvement areas identified',
    'Best practices can be shared across portfolios'
  ]
}

// Export RBAC-protected handlers
export const POST = withRBAC(performAnalytics, { 
  permission: PERMISSIONS.ANALYZE_KPI
})

export const GET = withRBAC(getAnalyticsCapabilities, { 
  permission: PERMISSIONS.VIEW_KPI
})

// Batch analytics endpoint
export const PUT = withRBAC(performBatchAnalytics, { 
  permission: PERMISSIONS.ANALYZE_KPI
})
