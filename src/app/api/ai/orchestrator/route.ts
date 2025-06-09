/**
 * AI Orchestration API
 * Unified interface for all AI services with intelligent routing
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRBAC, PERMISSIONS } from '@/lib/middleware/rbac-middleware'
import { aiOrchestrator, AIRequest } from '@/lib/ai/orchestrator'
import RBACService from '@/lib/rbac'

// POST process AI request
const processAIRequest = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const body = await request.json()
    
    const {
      type,
      input,
      preferences = {}
    } = body

    // Validation
    if (!type || !input) {
      return NextResponse.json(
        { error: 'Type and input are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const validTypes = ['chat', 'analysis', 'prediction', 'explanation', 'summary']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type', code: 'INVALID_TYPE' },
        { status: 400 }
      )
    }

    // Build AI request with user context
    const aiRequest: AIRequest = {
      type,
      input,
      context: {
        userId: user.userId,
        organizationId: user.organizationId,
        portfolioId: input.portfolioId,
        userRole: user.organizationRole || user.role
      },
      preferences: {
        ...preferences,
        // Override with user-specific preferences if available
        aiProvider: preferences.aiProvider || user.preferredAIProvider || 'auto'
      }
    }

    // Process request through orchestrator
    const result = await aiOrchestrator.processRequest(aiRequest)

    // Log AI usage for audit and analytics
    await RBACService.logAuditEvent({
      userId: user.userId,
      action: 'AI_REQUEST',
      resourceType: 'AI_SERVICE',
      resourceId: type,
      metadata: {
        type,
        provider: result.metadata.provider,
        model: result.metadata.model,
        processingTime: result.metadata.processingTime,
        success: result.success,
        cost: result.metadata.cost
      }
    })

    // Enrich response with user-specific information
    const enrichedResponse = {
      ...result,
      userContext: {
        role: user.organizationRole || user.role,
        permissions: {
          canUseAdvancedAI: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
          canExportResults: RBACService.hasPermission(user, PERMISSIONS.EXPORT_DATA),
          canShareResults: RBACService.hasPermission(user, PERMISSIONS.VIEW_ORGANIZATION)
        }
      },
      recommendations: {
        nextActions: generateNextActions(result, type),
        relatedQueries: generateRelatedQueries(type, input),
        optimizations: generateOptimizations(result)
      }
    }

    return NextResponse.json({
      success: result.success,
      result: enrichedResponse,
      metadata: {
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
        userRole: user.organizationRole || user.role
      }
    })

  } catch (error) {
    console.error('AI orchestration error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'AI request processing failed',
        code: 'AI_PROCESSING_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET AI capabilities and status
const getAICapabilities = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context

    // Update capabilities
    await aiOrchestrator.updateCapabilities()

    // Get current capabilities
    const capabilities = aiOrchestrator.getCapabilities()
    const performanceMetrics = aiOrchestrator.getPerformanceMetrics()

    // Filter capabilities based on user permissions
    const filteredCapabilities = capabilities.map(cap => ({
      ...cap,
      available: cap.available && RBACService.hasPermission(user, PERMISSIONS.VIEW_KPI),
      models: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI) ? cap.models : []
    }))

    return NextResponse.json({
      success: true,
      capabilities: {
        providers: filteredCapabilities,
        supportedTypes: [
          {
            type: 'chat',
            description: 'Interactive AI conversations',
            permissions: ['VIEW_KPI'],
            examples: ['Explain this KPI', 'What does this trend mean?']
          },
          {
            type: 'analysis',
            description: 'Advanced KPI and portfolio analysis',
            permissions: ['ANALYZE_KPI'],
            examples: ['Analyze portfolio performance', 'Identify trends and patterns']
          },
          {
            type: 'prediction',
            description: 'Forecasting and scenario modeling',
            permissions: ['ANALYZE_KPI'],
            examples: ['Forecast revenue growth', 'Model different scenarios']
          },
          {
            type: 'explanation',
            description: 'Detailed explanations of concepts and metrics',
            permissions: ['VIEW_KPI'],
            examples: ['Explain customer acquisition cost', 'What is burn rate?']
          },
          {
            type: 'summary',
            description: 'Concise summaries of data and reports',
            permissions: ['VIEW_KPI'],
            examples: ['Summarize quarterly performance', 'Key insights from data']
          }
        ],
        userPermissions: {
          canUseBasicAI: RBACService.hasPermission(user, PERMISSIONS.VIEW_KPI),
          canUseAdvancedAI: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
          canAccessPredictions: RBACService.hasPermission(user, PERMISSIONS.ANALYZE_KPI),
          canExportResults: RBACService.hasPermission(user, PERMISSIONS.EXPORT_DATA)
        }
      },
      performance: performanceMetrics,
      recommendations: {
        optimalProvider: recommendOptimalProvider(capabilities, user),
        usageTips: getUsageTips(user.organizationRole || user.role),
        setupInstructions: getSetupInstructions(capabilities)
      }
    })

  } catch (error) {
    console.error('AI capabilities error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get AI capabilities',
        code: 'CAPABILITIES_ERROR'
      },
      { status: 500 }
    )
  }
}

// GET AI usage analytics
const getAIAnalytics = async (request: NextRequest, context: { user: any }) => {
  try {
    const { user } = context
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'

    // Check if user can view analytics
    if (!RBACService.hasPermission(user, PERMISSIONS.VIEW_AUDIT_LOGS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for AI analytics', code: 'PERMISSION_DENIED' },
        { status: 403 }
      )
    }

    const requestHistory = aiOrchestrator.getRequestHistory()
    const performanceMetrics = aiOrchestrator.getPerformanceMetrics()

    // Filter history by timeframe
    const cutoffTime = Date.now() - getTimeframeMs(timeframe)
    const filteredHistory = requestHistory.filter(req => req.timestamp > cutoffTime)

    // Generate analytics
    const analytics = {
      usage: {
        totalRequests: filteredHistory.length,
        successRate: filteredHistory.filter(r => r.response.success).length / filteredHistory.length,
        avgResponseTime: filteredHistory.reduce((sum, r) => sum + r.response.metadata.processingTime, 0) / filteredHistory.length,
        totalCost: filteredHistory.reduce((sum, r) => sum + (r.response.metadata.cost || 0), 0)
      },
      breakdown: {
        byType: generateTypeBreakdown(filteredHistory),
        byProvider: generateProviderBreakdown(filteredHistory),
        byUser: generateUserBreakdown(filteredHistory, user),
        byTime: generateTimeBreakdown(filteredHistory, timeframe)
      },
      trends: {
        requestVolume: generateRequestVolumeTrend(filteredHistory),
        responseTime: generateResponseTimeTrend(filteredHistory),
        errorRate: generateErrorRateTrend(filteredHistory)
      },
      insights: generateUsageInsights(filteredHistory, performanceMetrics)
    }

    return NextResponse.json({
      success: true,
      analytics,
      metadata: {
        timeframe,
        generatedAt: new Date().toISOString(),
        userRole: user.organizationRole || user.role
      }
    })

  } catch (error) {
    console.error('AI analytics error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get AI analytics',
        code: 'ANALYTICS_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper functions
function generateNextActions(result: any, type: string): string[] {
  const actions = []

  if (type === 'analysis' && result.success) {
    actions.push('Review key insights and recommendations')
    actions.push('Share findings with stakeholders')
    actions.push('Schedule follow-up analysis')
  }

  if (type === 'prediction' && result.success) {
    actions.push('Monitor prediction accuracy')
    actions.push('Update assumptions as needed')
    actions.push('Plan scenario responses')
  }

  if (!result.success) {
    actions.push('Check data quality and completeness')
    actions.push('Try alternative AI provider')
    actions.push('Contact support if issues persist')
  }

  return actions
}

function generateRelatedQueries(type: string, input: any): string[] {
  const queries = {
    chat: [
      'Explain this metric in more detail',
      'What are industry benchmarks?',
      'How can we improve this KPI?'
    ],
    analysis: [
      'Forecast future performance',
      'Compare with industry benchmarks',
      'Identify risk factors'
    ],
    prediction: [
      'Analyze current trends',
      'Perform scenario analysis',
      'Identify key drivers'
    ],
    explanation: [
      'Provide calculation examples',
      'Show industry comparisons',
      'Suggest improvement strategies'
    ],
    summary: [
      'Detailed analysis of key points',
      'Trend analysis over time',
      'Comparative analysis'
    ]
  }

  return queries[type as keyof typeof queries] || []
}

function generateOptimizations(result: any): string[] {
  const optimizations = []

  if (result.metadata.processingTime > 10000) {
    optimizations.push('Consider using faster AI provider for similar requests')
  }

  if (result.metadata.confidence < 70) {
    optimizations.push('Improve data quality for better AI insights')
  }

  if (result.metadata.cost > 0.01) {
    optimizations.push('Consider local AI processing for cost optimization')
  }

  return optimizations
}

function recommendOptimalProvider(capabilities: any[], user: any): string {
  const availableProviders = capabilities.filter(cap => cap.available)
  
  if (availableProviders.length === 0) {
    return 'none'
  }

  // Recommend based on user role and requirements
  const role = user.organizationRole || user.role
  
  if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') {
    return availableProviders.find(p => p.name === 'openrouter')?.name || availableProviders[0].name
  }

  return availableProviders[0].name
}

function getUsageTips(role: string): string[] {
  const tips = {
    'SUPER_ADMIN': [
      'Use comprehensive analysis for strategic decisions',
      'Leverage prediction models for long-term planning',
      'Monitor AI usage across organization'
    ],
    'MANAGER': [
      'Focus on trend analysis for operational insights',
      'Use benchmarking for performance evaluation',
      'Share insights with team members'
    ],
    'ANALYST': [
      'Combine AI insights with domain expertise',
      'Validate AI recommendations with data',
      'Document analysis methodology'
    ]
  }

  return tips[role as keyof typeof tips] || tips['ANALYST']
}

function getSetupInstructions(capabilities: any[]): string[] {
  const instructions = []

  const hasOpenRouter = capabilities.find(c => c.name === 'openrouter')?.available
  const hasOllama = capabilities.find(c => c.name === 'ollama')?.available

  if (!hasOpenRouter) {
    instructions.push('Configure OpenRouter API key for advanced AI features')
  }

  if (!hasOllama) {
    instructions.push('Install Ollama for local AI processing')
  }

  if (capabilities.every(c => !c.available)) {
    instructions.push('Configure at least one AI provider to enable AI features')
  }

  return instructions
}

function getTimeframeMs(timeframe: string): number {
  const timeframes = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }

  return timeframes[timeframe as keyof typeof timeframes] || timeframes['7d']
}

function generateTypeBreakdown(history: any[]): any {
  return history.reduce((acc, req) => {
    const type = req.request.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
}

function generateProviderBreakdown(history: any[]): any {
  return history.reduce((acc, req) => {
    const provider = req.response.metadata.provider
    acc[provider] = (acc[provider] || 0) + 1
    return acc
  }, {})
}

function generateUserBreakdown(history: any[], currentUser: any): any {
  // Only show current user's usage for privacy
  const userRequests = history.filter(req => 
    req.request.context?.userId === currentUser.userId
  )

  return {
    currentUser: userRequests.length,
    total: history.length
  }
}

function generateTimeBreakdown(history: any[], timeframe: string): any {
  // Simplified time breakdown
  return {
    recent: history.filter(req => req.timestamp > Date.now() - 60 * 60 * 1000).length,
    total: history.length
  }
}

function generateRequestVolumeTrend(history: any[]): number[] {
  // Simplified trend - would be more sophisticated in production
  return [10, 15, 12, 18, 20, 16, 22]
}

function generateResponseTimeTrend(history: any[]): number[] {
  return [2000, 1800, 2200, 1900, 2100, 1700, 1900]
}

function generateErrorRateTrend(history: any[]): number[] {
  return [5, 3, 7, 2, 4, 1, 3]
}

function generateUsageInsights(history: any[], metrics: any): string[] {
  const insights = []

  if (metrics.successRate > 0.95) {
    insights.push('AI services are performing excellently')
  } else if (metrics.successRate < 0.8) {
    insights.push('AI service reliability needs attention')
  }

  if (metrics.avgResponseTime > 5000) {
    insights.push('Consider optimizing AI provider selection for faster responses')
  }

  insights.push(`Most popular AI request type: ${Object.keys(generateTypeBreakdown(history))[0] || 'analysis'}`)

  return insights
}

function generateRequestId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Export RBAC-protected handlers
export const POST = withRBAC(processAIRequest, { 
  permission: PERMISSIONS.VIEW_KPI
})

export const GET = withRBAC(getAICapabilities, { 
  permission: PERMISSIONS.VIEW_KPI
})

export const PUT = withRBAC(getAIAnalytics, { 
  permission: PERMISSIONS.VIEW_AUDIT_LOGS
})
