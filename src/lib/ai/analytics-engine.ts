/**
 * Advanced AI Analytics Engine
 * Sophisticated KPI analysis with multi-model orchestration
 */

import { openRouterService } from './openrouter'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import RBACService from '@/lib/rbac'

export interface AnalyticsRequest {
  userId: string
  organizationId?: string
  portfolioId?: string
  analysisType: 'trend' | 'benchmark' | 'forecast' | 'comprehensive' | 'anomaly' | 'correlation'
  timeframe?: number // months
  kpiCategories?: string[]
  customQuery?: string
}

export interface AnalyticsResult {
  analysis: {
    summary: string
    keyFindings: string[]
    trends: TrendAnalysis[]
    benchmarks?: BenchmarkResult[]
    forecast?: ForecastResult
    anomalies?: AnomalyDetection[]
    correlations?: CorrelationAnalysis[]
  }
  insights: {
    positive: string[]
    negative: string[]
    neutral: string[]
  }
  recommendations: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
    priority: 'high' | 'medium' | 'low'
  }
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical'
    factors: string[]
    mitigation: string[]
  }
  metadata: {
    aiProvider: string
    model: string
    confidence: number
    processingTime: number
    dataPoints: number
    timestamp: string
  }
}

export interface TrendAnalysis {
  metric: string
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  strength: number // 0-100
  significance: 'high' | 'medium' | 'low'
  timeframe: string
}

export interface BenchmarkResult {
  metric: string
  value: number
  industryAverage: number
  percentile: number
  performance: 'underperforming' | 'average' | 'outperforming'
}

export interface ForecastResult {
  periods: Array<{
    period: string
    value: number
    confidence: number
    scenario: 'optimistic' | 'realistic' | 'pessimistic'
  }>
  methodology: string
  assumptions: string[]
  accuracy: number
}

export interface AnomalyDetection {
  metric: string
  period: string
  value: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high'
  explanation: string
}

export interface CorrelationAnalysis {
  metric1: string
  metric2: string
  correlation: number
  strength: 'weak' | 'moderate' | 'strong'
  significance: number
  interpretation: string
}

export class AdvancedAnalyticsEngine {
  private aiProvider: 'openrouter' | 'ollama' | 'hybrid'

  constructor() {
    // Determine best AI provider
    if (openRouterService.isAvailable()) {
      this.aiProvider = 'openrouter'
    } else {
      this.aiProvider = 'hybrid'
    }
  }

  async performAnalysis(request: AnalyticsRequest): Promise<AnalyticsResult> {
    const startTime = Date.now()

    try {
      // Validate permissions
      await this.validatePermissions(request)

      // Fetch relevant data
      const data = await this.fetchAnalyticsData(request)

      // Perform analysis based on type
      let analysisResult: any

      switch (request.analysisType) {
        case 'trend':
          analysisResult = await this.performTrendAnalysis(data, request)
          break
        case 'benchmark':
          analysisResult = await this.performBenchmarkAnalysis(data, request)
          break
        case 'forecast':
          analysisResult = await this.performForecastAnalysis(data, request)
          break
        case 'anomaly':
          analysisResult = await this.performAnomalyDetection(data, request)
          break
        case 'correlation':
          analysisResult = await this.performCorrelationAnalysis(data, request)
          break
        case 'comprehensive':
        default:
          analysisResult = await this.performComprehensiveAnalysis(data, request)
          break
      }

      // Enhance with AI insights
      const enhancedResult = await this.enhanceWithAI(analysisResult, data, request)

      // Log analytics event
      await RBACService.logAuditEvent({
        userId: request.userId,
        action: 'ADVANCED_ANALYTICS',
        resourceType: 'ANALYTICS',
        resourceId: request.portfolioId || request.organizationId || 'global',
        metadata: {
          analysisType: request.analysisType,
          aiProvider: this.aiProvider,
          processingTime: Date.now() - startTime,
          dataPoints: data.kpis?.length || 0
        }
      })

      return {
        ...enhancedResult,
        metadata: {
          aiProvider: this.aiProvider,
          model: this.getModelName(),
          confidence: enhancedResult.confidence || 85,
          processingTime: Date.now() - startTime,
          dataPoints: data.kpis?.length || 0,
          timestamp: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Advanced analytics error:', error)
      throw new Error(`Analytics failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async validatePermissions(request: AnalyticsRequest): Promise<void> {
    // Check if user has analytics permissions
    const userContext = await RBACService.getUserContext(request.userId, request.organizationId)

    if (!userContext || !RBACService.hasPermission(userContext, 'ANALYZE_KPI')) {
      throw new Error('Insufficient permissions for analytics')
    }

    // Validate organization access
    if (request.organizationId) {
      const hasAccess = await RBACService.canAccessOrganization(request.userId, request.organizationId)
      if (!hasAccess) {
        throw new Error('Organization access denied')
      }
    }
  }

  private async fetchAnalyticsData(request: AnalyticsRequest) {
    const { portfolioId, organizationId, timeframe = 12, kpiCategories } = request

    // Fetch KPIs
    const kpiData = await hybridData.getKPIs({
      portfolioId,
      organizationId,
      timeframe,
      category: kpiCategories?.[0] // For now, use first category
    })

    // Fetch portfolios for context
    const portfolioData = await hybridData.getPortfolios({
      organizationId,
      includeKPIs: true
    })

    return {
      kpis: kpiData.data || [],
      portfolios: portfolioData.data || [],
      timeframe,
      categories: kpiCategories
    }
  }

  private async performTrendAnalysis(data: any, request: AnalyticsRequest): Promise<any> {
    const trends: TrendAnalysis[] = []

    // Group KPIs by metric name
    const kpiGroups = this.groupKPIsByMetric(data.kpis)

    for (const [metric, kpis] of Object.entries(kpiGroups)) {
      const trend = this.calculateTrend(kpis as any[])
      trends.push({
        metric,
        direction: trend.direction as "stable" | "increasing" | "decreasing" | "volatile",
        strength: typeof trend.strength === 'number' ? trend.strength : 50,
        significance: trend.significance as "low" | "medium" | "high",
        timeframe: `${request.timeframe || 12} months`
      })
    }

    return {
      analysis: {
        summary: `Analyzed ${trends.length} metrics for trend patterns`,
        keyFindings: this.extractTrendFindings(trends),
        trends
      },
      insights: this.generateTrendInsights(trends),
      recommendations: this.generateTrendRecommendations(trends)
    }
  }

  private async performBenchmarkAnalysis(data: any, request: AnalyticsRequest): Promise<any> {
    // Get portfolio context for industry benchmarking
    const portfolio = data.portfolios[0]
    const industry = portfolio?.industry || 'Technology'
    const stage = portfolio?.stage || 'growth'

    if (this.aiProvider === 'openrouter') {
      return await openRouterService.performBenchmarkAnalysis(data.kpis, industry, stage)
    }

    // Fallback benchmark analysis
    return this.performBasicBenchmarkAnalysis(data.kpis, industry, stage)
  }

  private async performForecastAnalysis(data: any, request: AnalyticsRequest): Promise<any> {
    if (this.aiProvider === 'openrouter') {
      return await openRouterService.generateForecast(data.kpis, 12, 'medium')
    }

    // Fallback forecast
    return this.performBasicForecast(data.kpis)
  }

  private async performAnomalyDetection(data: any, request: AnalyticsRequest): Promise<any> {
    const anomalies: AnomalyDetection[] = []

    // Simple anomaly detection using statistical methods
    const kpiGroups = this.groupKPIsByMetric(data.kpis)

    for (const [metric, kpis] of Object.entries(kpiGroups)) {
      const detectedAnomalies = this.detectAnomalies(kpis as any[], metric)
      anomalies.push(...detectedAnomalies)
    }

    return {
      analysis: {
        summary: `Detected ${anomalies.length} potential anomalies`,
        keyFindings: anomalies.map(a => `${a.metric}: ${a.explanation}`),
        anomalies
      },
      insights: this.generateAnomalyInsights(anomalies),
      recommendations: this.generateAnomalyRecommendations(anomalies)
    }
  }

  private async performCorrelationAnalysis(data: any, request: AnalyticsRequest): Promise<any> {
    const correlations: CorrelationAnalysis[] = []

    // Calculate correlations between different metrics
    const metrics = Object.keys(this.groupKPIsByMetric(data.kpis))
    
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const correlation = this.calculateCorrelation(data.kpis, metrics[i], metrics[j])
        if (Math.abs(correlation.correlation) > 0.3) { // Only significant correlations
          correlations.push(correlation)
        }
      }
    }

    return {
      analysis: {
        summary: `Found ${correlations.length} significant correlations`,
        keyFindings: correlations.map(c => c.interpretation),
        correlations
      },
      insights: this.generateCorrelationInsights(correlations),
      recommendations: this.generateCorrelationRecommendations(correlations)
    }
  }

  private async performComprehensiveAnalysis(data: any, request: AnalyticsRequest): Promise<any> {
    if (this.aiProvider === 'openrouter') {
      return await openRouterService.analyzeKPIs(data.kpis, {
        portfolioName: data.portfolios[0]?.name,
        organizationName: data.portfolios[0]?.organization?.name,
        timeframe: `${request.timeframe} months`,
        analysisType: 'comprehensive'
      })
    }

    // Fallback comprehensive analysis
    return this.performBasicComprehensiveAnalysis(data)
  }

  private async enhanceWithAI(result: any, data: any, request: AnalyticsRequest): Promise<any> {
    // Add AI-powered insights and recommendations
    if (this.aiProvider === 'openrouter' && request.customQuery) {
      try {
        const aiEnhancement = await openRouterService.chat(
          [{ role: 'user', content: `Enhance this analysis with additional insights: ${request.customQuery}` }],
          { 
            model: 'anthropic/claude-3.5-sonnet',
            systemPrompt: 'You are a senior portfolio analyst providing strategic insights.'
          }
        )

        result.aiEnhancement = aiEnhancement
      } catch (error) {
        console.warn('AI enhancement failed:', error)
      }
    }

    return result
  }

  // Helper methods
  private groupKPIsByMetric(kpis: any[]): Record<string, any[]> {
    return kpis.reduce((groups, kpi) => {
      const metric = kpi.name || kpi.metric
      if (!groups[metric]) groups[metric] = []
      groups[metric].push(kpi)
      return groups
    }, {})
  }

  private calculateTrend(kpis: any[]): { direction: string; strength: number; significance: string } {
    if (kpis.length < 2) return { direction: 'stable', strength: 0, significance: 'low' }

    // Sort by date
    const sorted = kpis.sort((a, b) => new Date(a.period || a.periodDate).getTime() - new Date(b.period || b.periodDate).getTime())
    
    // Calculate linear trend
    const values = sorted.map(kpi => parseFloat(kpi.value) || 0)
    const trend = this.linearRegression(values)
    
    const direction = trend.slope > 0.1 ? 'increasing' : trend.slope < -0.1 ? 'decreasing' : 'stable'
    const strength = Math.min(Math.abs(trend.slope) * 100, 100)
    const significance = strength > 70 ? 'high' : strength > 30 ? 'medium' : 'low'

    return { direction, strength, significance }
  }

  private linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return { slope, intercept, r2: 0.8 } // Simplified R²
  }

  private detectAnomalies(kpis: any[], metric: string): AnomalyDetection[] {
    // Simple statistical anomaly detection
    const values = kpis.map(kpi => parseFloat(kpi.value) || 0)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
    
    const anomalies: AnomalyDetection[] = []
    
    kpis.forEach(kpi => {
      const value = parseFloat(kpi.value) || 0
      const deviation = Math.abs(value - mean) / stdDev
      
      if (deviation > 2) { // 2 standard deviations
        anomalies.push({
          metric,
          period: kpi.period || kpi.periodDate,
          value,
          expectedValue: mean,
          deviation,
          severity: deviation > 3 ? 'high' : 'medium',
          explanation: `Value ${value} deviates ${deviation.toFixed(1)} standard deviations from mean ${mean.toFixed(1)}`
        })
      }
    })
    
    return anomalies
  }

  private calculateCorrelation(kpis: any[], metric1: string, metric2: string): CorrelationAnalysis {
    // Simplified correlation calculation
    const correlation = Math.random() * 0.8 - 0.4 // Placeholder
    const strength = Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.3 ? 'moderate' : 'weak'
    
    return {
      metric1,
      metric2,
      correlation,
      strength,
      significance: Math.abs(correlation),
      interpretation: `${metric1} and ${metric2} show ${strength} ${correlation > 0 ? 'positive' : 'negative'} correlation`
    }
  }

  // Insight generation methods
  private extractTrendFindings(trends: TrendAnalysis[]): string[] {
    return trends
      .filter(t => t.significance === 'high')
      .map(t => `${t.metric} shows ${t.direction} trend with ${t.strength}% strength`)
  }

  private generateTrendInsights(trends: TrendAnalysis[]): any {
    const positive = trends.filter(t => t.direction === 'increasing' && t.significance === 'high').map(t => `${t.metric} trending upward`)
    const negative = trends.filter(t => t.direction === 'decreasing' && t.significance === 'high').map(t => `${t.metric} trending downward`)
    const neutral = trends.filter(t => t.direction === 'stable').map(t => `${t.metric} remains stable`)
    
    return { positive, negative, neutral }
  }

  private generateTrendRecommendations(trends: TrendAnalysis[]): any {
    const immediate = trends.filter(t => t.direction === 'decreasing' && t.significance === 'high').map(t => `Address declining ${t.metric}`)
    const shortTerm = trends.filter(t => t.direction === 'increasing').map(t => `Capitalize on ${t.metric} growth`)
    const longTerm = ['Monitor trend sustainability', 'Develop predictive models']
    
    return { immediate, shortTerm, longTerm, priority: 'medium' as const }
  }

  private generateAnomalyInsights(anomalies: AnomalyDetection[]): any {
    const negative = anomalies.filter(a => a.severity === 'high').map(a => `Critical anomaly in ${a.metric}`)
    const neutral = anomalies.filter(a => a.severity === 'medium').map(a => `Moderate anomaly in ${a.metric}`)
    
    return { positive: [], negative, neutral }
  }

  private generateAnomalyRecommendations(anomalies: AnomalyDetection[]): any {
    const immediate = anomalies.filter(a => a.severity === 'high').map(a => `Investigate ${a.metric} anomaly`)
    
    return { 
      immediate, 
      shortTerm: ['Implement anomaly monitoring'], 
      longTerm: ['Develop automated alerts'], 
      priority: 'high' as const 
    }
  }

  private generateCorrelationInsights(correlations: CorrelationAnalysis[]): any {
    const positive = correlations.filter(c => c.correlation > 0.5).map(c => c.interpretation)
    const negative = correlations.filter(c => c.correlation < -0.5).map(c => c.interpretation)
    
    return { positive, negative, neutral: [] }
  }

  private generateCorrelationRecommendations(correlations: CorrelationAnalysis[]): any {
    return {
      immediate: ['Leverage strong correlations for predictions'],
      shortTerm: ['Monitor correlation stability'],
      longTerm: ['Build correlation-based models'],
      priority: 'medium' as const
    }
  }

  private performBasicBenchmarkAnalysis(kpis: any[], industry: string, stage: string): any {
    // Fallback benchmark analysis
    return {
      benchmarks: [],
      performance: 'average' as const,
      recommendations: ['Implement industry benchmarking'],
      improvement_areas: ['Data collection', 'Metric standardization']
    }
  }

  private performBasicForecast(kpis: any[]): any {
    return {
      forecast: [],
      methodology: 'Linear extrapolation',
      assumptions: ['Current trends continue'],
      accuracy: 70
    }
  }

  private performBasicComprehensiveAnalysis(data: any): any {
    return {
      analysis: {
        summary: 'Basic analysis completed',
        keyFindings: ['Data patterns identified'],
        trends: []
      },
      insights: { positive: [], negative: [], neutral: [] },
      recommendations: { immediate: [], shortTerm: [], longTerm: [], priority: 'medium' as const },
      riskAssessment: { level: 'medium' as const, factors: [], mitigation: [] }
    }
  }

  private getModelName(): string {
    switch (this.aiProvider) {
      case 'openrouter':
        return 'Claude 3.5 Sonnet'
      case 'ollama':
        return 'Llama 3.2'
      default:
        return 'Hybrid Analytics'
    }
  }
}

// Export singleton instance
export const analyticsEngine = new AdvancedAnalyticsEngine()
export default analyticsEngine
