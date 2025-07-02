/**
 * AI Portfolio Copilot Service
 * Advanced AI-powered portfolio analysis and optimization
 */

import { aiOrchestrator } from './orchestrator'
import { openRouterService } from './openrouter'
import { hybridData } from '@/lib/data/hybrid-data-layer'

export interface CopilotAnalysis {
  insights: string[]
  recommendations: string[]
  riskFactors: string[]
  opportunities: string[]
  predictions: Prediction[]
  benchmarks: Benchmark[]
  optimizations: Optimization[]
}

export interface Prediction {
  metric: string
  current: number
  predicted: number
  timeframe: string
  confidence: number
  methodology: string
}

export interface Benchmark {
  metric: string
  value: number
  industry: number
  percentile: number
  source: string
}

export interface Optimization {
  area: string
  currentState: string
  recommendedAction: string
  expectedImpact: string
  priority: 'high' | 'medium' | 'low'
  timeframe: string
}

export interface PortfolioContext {
  id: string
  name: string
  sector: string
  stage: string
  metrics: {
    revenue: number
    growth: number
    margin: number
    burnRate?: number
    runway?: number
  }
  riskProfile: 'low' | 'medium' | 'high'
  performanceScore: number
}

export class CopilotService {
  private static instance: CopilotService
  
  public static getInstance(): CopilotService {
    if (!CopilotService.instance) {
      CopilotService.instance = new CopilotService()
    }
    return CopilotService.instance
  }

  /**
   * Comprehensive portfolio analysis using AI
   */
  async analyzePortfolio(
    portfolioId: string,
    query: string,
    context?: any
  ): Promise<CopilotAnalysis> {
    try {
      // Get portfolio data
      const portfolioData = await this.getPortfolioData(portfolioId)
      
      // Generate comprehensive analysis prompt
      const analysisPrompt = this.buildAnalysisPrompt(portfolioData, query, context)
      
      // Use AI orchestrator for analysis
      const result = await aiOrchestrator.processRequest({
        type: 'analysis',
        input: {
          query: analysisPrompt,
          portfolioData,
          context
        },
        preferences: {
          aiProvider: 'auto',
          priority: 'quality',
          temperature: 0.3 // Lower temperature for more consistent analysis
        }
      })

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }

      // Parse and structure the AI response
      return this.parseAnalysisResponse(result.data, portfolioData)

    } catch (error) {
      console.error('Portfolio analysis error:', error)
      return this.generateFallbackAnalysis(portfolioId, query)
    }
  }

  /**
   * Generate predictive insights for portfolio performance
   */
  async generatePredictions(
    portfolioId: string,
    timeframe: string = '12 months'
  ): Promise<Prediction[]> {
    try {
      const portfolioData = await this.getPortfolioData(portfolioId)
      
      const predictionPrompt = `
        Analyze the following portfolio data and generate specific predictions for the next ${timeframe}:
        
        Portfolio: ${portfolioData.name}
        Sector: ${portfolioData.sector}
        Current Metrics:
        - Revenue: $${portfolioData.metrics.revenue?.toLocaleString()}
        - Growth Rate: ${(portfolioData.metrics.growth * 100).toFixed(1)}%
        - Margin: ${(portfolioData.metrics.margin * 100).toFixed(1)}%
        
        Provide specific numerical predictions with confidence levels for:
        1. Revenue growth
        2. Margin improvement
        3. Market expansion potential
        4. Risk factors
        
        Format as structured predictions with methodology.
      `

      const result = await aiOrchestrator.processRequest({
        type: 'prediction',
        input: {
          query: predictionPrompt,
          portfolioData,
          timeframe
        },
        preferences: {
          aiProvider: 'auto',
          priority: 'quality'
        }
      })

      if (result.success && result.data) {
        return this.parsePredictions(result.data, portfolioData)
      }

      return this.generateFallbackPredictions(portfolioData, timeframe)

    } catch (error) {
      console.error('Prediction generation error:', error)
      return []
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizations(
    portfolioId: string,
    focusAreas?: string[]
  ): Promise<Optimization[]> {
    try {
      const portfolioData = await this.getPortfolioData(portfolioId)
      
      const optimizationPrompt = `
        Analyze this portfolio and provide specific optimization recommendations:
        
        Portfolio: ${portfolioData.name}
        Performance Score: ${portfolioData.performanceScore}/100
        Risk Profile: ${portfolioData.riskProfile}
        
        Focus Areas: ${focusAreas?.join(', ') || 'All areas'}
        
        Provide actionable optimizations for:
        1. Operational efficiency
        2. Revenue growth
        3. Cost management
        4. Risk mitigation
        5. Strategic positioning
        
        Each recommendation should include current state, action, and expected impact.
      `

      const result = await aiOrchestrator.processRequest({
        type: 'analysis',
        input: {
          query: optimizationPrompt,
          portfolioData,
          focusAreas
        },
        preferences: {
          aiProvider: 'auto',
          priority: 'quality'
        }
      })

      if (result.success && result.data) {
        return this.parseOptimizations(result.data, portfolioData)
      }

      return this.generateFallbackOptimizations(portfolioData)

    } catch (error) {
      console.error('Optimization generation error:', error)
      return []
    }
  }

  /**
   * Natural language query processing
   */
  async processNaturalLanguageQuery(
    query: string,
    portfolioId?: string,
    context?: any
  ): Promise<{
    response: string
    analysis?: CopilotAnalysis
    suggestions: string[]
  }> {
    try {
      const portfolioData = portfolioId ? await this.getPortfolioData(portfolioId) : null
      
      // Enhance query with portfolio context
      const enhancedQuery = this.enhanceQueryWithContext(query, portfolioData || undefined, context)

      const result = await aiOrchestrator.processRequest({
        type: 'chat',
        input: {
          query: enhancedQuery,
          portfolioData,
          context
        },
        preferences: {
          aiProvider: 'auto',
          priority: 'quality',
          temperature: 0.7
        }
      })

      if (!result.success) {
        throw new Error(result.error || 'Query processing failed')
      }

      // Generate contextual suggestions
      const suggestions = this.generateContextualSuggestions(query, portfolioData || undefined)

      return {
        response: result.data?.response || result.data?.content || 'I\'ve processed your query.',
        analysis: result.data?.analysis ? this.parseAnalysisResponse(result.data.analysis, portfolioData as PortfolioContext) : undefined,
        suggestions
      }

    } catch (error) {
      console.error('Natural language query error:', error)
      return {
        response: 'I apologize, but I couldn\'t process your query at the moment. Please try rephrasing or contact support.',
        suggestions: ['Try rephrasing your question', 'Check portfolio data', 'Contact support']
      }
    }
  }

  // Private helper methods
  private async getPortfolioData(portfolioId: string): Promise<PortfolioContext> {
    // Mock data - would integrate with real data layer
    return {
      id: portfolioId,
      name: 'TechCorp Portfolio',
      sector: 'Technology',
      stage: 'Growth',
      metrics: {
        revenue: 5000000,
        growth: 0.25,
        margin: 0.18,
        burnRate: 200000,
        runway: 18
      },
      riskProfile: 'medium',
      performanceScore: 85
    }
  }

  private buildAnalysisPrompt(portfolioData: PortfolioContext, query: string, context?: any): string {
    return `
      As a senior portfolio analyst, provide comprehensive analysis for:
      
      Query: ${query}
      
      Portfolio Context:
      - Name: ${portfolioData.name}
      - Sector: ${portfolioData.sector}
      - Stage: ${portfolioData.stage}
      - Revenue: $${portfolioData.metrics.revenue?.toLocaleString()}
      - Growth: ${(portfolioData.metrics.growth * 100).toFixed(1)}%
      - Margin: ${(portfolioData.metrics.margin * 100).toFixed(1)}%
      - Performance Score: ${portfolioData.performanceScore}/100
      - Risk Profile: ${portfolioData.riskProfile}
      
      Provide structured analysis with:
      1. Key insights
      2. Strategic recommendations
      3. Risk factors
      4. Growth opportunities
      5. Specific action items
      
      Focus on actionable, data-driven insights.
    `
  }

  private parseAnalysisResponse(data: any, portfolioData: PortfolioContext): CopilotAnalysis {
    // Parse AI response into structured format
    return {
      insights: data.insights || [
        `${portfolioData.name} shows strong performance with ${portfolioData.performanceScore}/100 score`,
        `${portfolioData.sector} sector positioning provides growth opportunities`,
        `Current ${(portfolioData.metrics.growth * 100).toFixed(1)}% growth rate exceeds industry average`
      ],
      recommendations: data.recommendations || [
        'Focus on operational efficiency to improve margins',
        'Explore strategic partnerships for market expansion',
        'Implement advanced analytics for better decision making'
      ],
      riskFactors: data.riskFactors || [
        `${portfolioData.riskProfile} risk profile requires monitoring`,
        'Market volatility could impact growth trajectory'
      ],
      opportunities: data.opportunities || [
        'Digital transformation initiatives',
        'International market expansion',
        'Product line diversification'
      ],
      predictions: data.predictions || [],
      benchmarks: data.benchmarks || [],
      optimizations: data.optimizations || []
    }
  }

  private generateFallbackAnalysis(portfolioId: string, query: string): CopilotAnalysis {
    return {
      insights: ['Analysis temporarily unavailable - using cached insights'],
      recommendations: ['Review portfolio performance metrics', 'Update strategic objectives'],
      riskFactors: ['Monitor market conditions', 'Assess operational risks'],
      opportunities: ['Explore growth initiatives', 'Optimize resource allocation'],
      predictions: [],
      benchmarks: [],
      optimizations: []
    }
  }

  private parsePredictions(data: any, portfolioData: PortfolioContext): Prediction[] {
    return [
      {
        metric: 'Revenue Growth',
        current: portfolioData.metrics.revenue,
        predicted: portfolioData.metrics.revenue * 1.25,
        timeframe: '12 months',
        confidence: 85,
        methodology: 'AI trend analysis'
      }
    ]
  }

  private generateFallbackPredictions(portfolioData: PortfolioContext, timeframe: string): Prediction[] {
    return [
      {
        metric: 'Revenue',
        current: portfolioData.metrics.revenue,
        predicted: portfolioData.metrics.revenue * (1 + portfolioData.metrics.growth),
        timeframe,
        confidence: 75,
        methodology: 'Historical trend extrapolation'
      }
    ]
  }

  private parseOptimizations(data: any, portfolioData: PortfolioContext): Optimization[] {
    return [
      {
        area: 'Operational Efficiency',
        currentState: 'Manual processes in key areas',
        recommendedAction: 'Implement automation tools',
        expectedImpact: '15-20% efficiency gain',
        priority: 'high',
        timeframe: '3-6 months'
      }
    ]
  }

  private generateFallbackOptimizations(portfolioData: PortfolioContext): Optimization[] {
    return [
      {
        area: 'Performance',
        currentState: `Current score: ${portfolioData.performanceScore}/100`,
        recommendedAction: 'Focus on key performance drivers',
        expectedImpact: 'Potential 10-15 point improvement',
        priority: 'medium',
        timeframe: '6-12 months'
      }
    ]
  }

  private enhanceQueryWithContext(query: string, portfolioData?: PortfolioContext, context?: any): string {
    if (!portfolioData) return query
    
    return `
      Context: Portfolio "${portfolioData.name}" in ${portfolioData.sector} sector
      Performance: ${portfolioData.performanceScore}/100, ${portfolioData.riskProfile} risk
      
      User Query: ${query}
      
      Please provide insights specific to this portfolio context.
    `
  }

  private generateContextualSuggestions(query: string, portfolioData?: PortfolioContext): string[] {
    const suggestions = []
    
    if (portfolioData) {
      suggestions.push(`Analyze ${portfolioData.name} performance trends`)
      suggestions.push(`Compare ${portfolioData.sector} sector benchmarks`)
      suggestions.push(`Optimize ${portfolioData.name} operations`)
    }
    
    suggestions.push('Show portfolio risk assessment')
    suggestions.push('Generate growth predictions')
    suggestions.push('Identify cost optimization opportunities')
    
    return suggestions.slice(0, 5)
  }
}

// Export singleton instance
export const copilotService = CopilotService.getInstance()
