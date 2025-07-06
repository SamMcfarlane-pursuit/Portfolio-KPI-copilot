/**
 * Public AI Copilot API
 * Portfolio KPI Copilot - Public Access for Testing
 * 
 * This endpoint provides public access to the AI copilot for testing
 * without requiring authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiOrchestrator, AIRequest } from '@/lib/ai/orchestrator'
import { hybridData, initializeHybridData } from '@/lib/data/hybrid-data-layer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      query,
      type = 'chat',
      portfolioId,
      conversationId,
      context: requestContext,
      preferences = {}
    } = body

    // Validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Valid query is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (query.length > 2000) {
      return NextResponse.json(
        { error: 'Query too long (max 2000 characters)', code: 'QUERY_TOO_LONG' },
        { status: 400 }
      )
    }

    console.log('🔍 Public AI Copilot Request:', { query, type, portfolioId })

    // Initialize hybrid data layer
    const dataStatus = await initializeHybridData()
    console.log('📊 Data layer status:', dataStatus)
    
    // Always inject TechCorp Portfolio context for public demo
    const portfolioContext = {
      name: 'TechCorp Portfolio',
      sector: 'Technology',
      keyMetrics: {
        revenue: '$2.5M',
        growth: '25%',
        margin: '18%'
      },
      riskLevel: 'Medium',
      performanceScore: 85
    };

    // Build enhanced AI request with portfolio intelligence
    let messages = undefined
    if (type === 'chat') {
      // Format portfolio context for system prompt
      const systemPrompt = `\nYou are an expert AI copilot for portfolio KPI analysis. You have access to real portfolio data and can provide specific, data-driven insights.\n\nPortfolio Context:\nName: ${portfolioContext.name}\nSector: ${portfolioContext.sector}\nKey Metrics: Revenue=${portfolioContext.keyMetrics.revenue}, Growth=${portfolioContext.keyMetrics.growth}, Margin=${portfolioContext.keyMetrics.margin}\nRisk Level: ${portfolioContext.riskLevel}\nPerformance Score: ${portfolioContext.performanceScore}\n\nProvide specific, data-driven answers based on the available portfolio data. Reference actual metrics and values when possible.`;
      
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]
    }

    console.log('🤖 AI Request:', { type, messages: messages?.length, portfolioContext: !!portfolioContext })

    const aiRequest: AIRequest = {
      type: type as 'chat' | 'analysis' | 'prediction' | 'explanation' | 'summary',
      input: {
        ...(type === 'chat' ? { messages } : { query }),
        portfolioId,
        conversationId: conversationId || `public_copilot_${Date.now()}`,
        context: {
          ...requestContext,
          portfolio: portfolioContext,
          dataSource: dataStatus.activeSource,
          userRole: 'PUBLIC_DEMO',
          capabilities: ['view_kpis', 'analyze_portfolio'],
          industryContext: portfolioContext?.sector ? 'Technology' : 'General',
          marketConditions: 'Current market conditions available'
        }
      },
      context: {
        userId: 'public_demo_user',
        organizationId: 'demo_org',
        portfolioId,
        userRole: 'PUBLIC_DEMO'
      },
      preferences: {
        aiProvider: preferences.aiProvider || 'auto',
        priority: preferences.priority || 'quality',
        temperature: preferences.temperature || 0.7,
        maxTokens: preferences.maxTokens || 2000,
        ...preferences
      }
    }

    const startTime = Date.now()

    // Process through AI orchestrator
    const result = await aiOrchestrator.processRequest(aiRequest)
    const processingTime = Date.now() - startTime

    console.log('✅ AI Response received:', { 
      success: result.success, 
      processingTime, 
      provider: result.metadata.provider,
      model: result.metadata.model 
    })

    if (!result.success) {
      console.error('❌ AI processing failed:', result.error)
      throw new Error(result.error || 'AI processing failed')
    }

    // Extract response
    const response = result.data?.response || result.data?.analysis || result.data?.content
    console.log('🤖 Raw AI response:', response)
    
    if (!response) {
      throw new Error('No response content received from AI')
    }
    
    // Build comprehensive copilot response
    const copilotResponse = {
      success: true,
      response,
      analysis: {
        insights: result.data?.insights || [],
        recommendations: result.data?.recommendations || [],
        riskFactors: result.data?.riskFactors || [],
        opportunities: result.data?.opportunities || [],
        predictions: result.data?.predictions || [],
        benchmarks: result.data?.benchmarks || []
      },
      metadata: {
        conversationId: conversationId || `public_copilot_${Date.now()}`,
        requestType: type,
        confidence: result.metadata.confidence || 85,
        processingTime,
        provider: result.metadata.provider,
        model: result.metadata.model,
        timestamp: new Date().toISOString(),
        dataSource: dataStatus.activeSource,
        portfolioContext: !!portfolioContext
      },
      capabilities: {
        canAnalyze: true,
        canPredict: true,
        canOptimize: false,
        canExport: false,
        canShare: false
      },
      portfolioInsights: portfolioContext ? {
        name: portfolioContext.name,
        sector: portfolioContext.sector,
        keyMetrics: portfolioContext.keyMetrics,
        riskLevel: portfolioContext.riskLevel,
        performanceScore: portfolioContext.performanceScore
      } : undefined
    }

    return NextResponse.json(copilotResponse)

  } catch (error) {
    console.error('❌ Public AI Copilot error:', error)
    
    // Enhanced fallback response
    const fallbackResponse = {
      success: false,
      response: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        conversationId: `public_copilot_${Date.now()}`,
        requestType: 'chat',
        confidence: 0,
        processingTime: 0,
        provider: 'none',
        model: 'none',
        timestamp: new Date().toISOString(),
        dataSource: 'fallback',
        portfolioContext: false
      },
      capabilities: {
        canAnalyze: false,
        canPredict: false,
        canOptimize: false,
        canExport: false,
        canShare: false
      }
    }

    return NextResponse.json(fallbackResponse, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Public AI Copilot API is available',
    endpoints: {
      POST: '/api/public/ai-copilot',
      description: 'Send portfolio KPI queries to the AI copilot'
    },
    demo: {
      query: 'What is the revenue growth rate for TechCorp Portfolio?',
      portfolioId: 'demo_portfolio_id'
    },
    timestamp: new Date().toISOString()
  })
} 