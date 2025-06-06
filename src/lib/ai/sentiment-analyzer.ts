import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface SentimentAnalysis {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  confidence: number
  score: number // -1 to 1
  reasoning: string
  keyFactors: string[]
  riskFactors: string[]
  opportunities: string[]
  marketTrend: 'bullish' | 'neutral' | 'bearish'
  investmentRecommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
}

export interface PortfolioInsight {
  companyName: string
  sector: string
  overallHealth: number // 0-100
  sentiment: SentimentAnalysis
  kpiTrends: {
    revenue: 'improving' | 'stable' | 'declining'
    profitability: 'improving' | 'stable' | 'declining'
    growth: 'accelerating' | 'stable' | 'slowing'
  }
  alerts: string[]
  recommendations: string[]
  aiProvider?: string
  analysisTimestamp?: string
}

// AI Tools for sentiment analysis
const sentimentAnalysisTools = [
  {
    type: "function" as const,
    function: {
      name: "analyze_financial_metrics",
      description: "Analyze financial KPIs and determine sentiment based on performance trends",
      parameters: {
        type: "object",
        properties: {
          revenue_trend: {
            type: "string",
            enum: ["increasing", "stable", "decreasing"],
            description: "Revenue trend over the analysis period"
          },
          profitability_trend: {
            type: "string", 
            enum: ["improving", "stable", "declining"],
            description: "Profitability trend (EBITDA, margins)"
          },
          growth_metrics: {
            type: "object",
            properties: {
              revenue_growth: { type: "number", description: "Revenue growth rate %" },
              customer_growth: { type: "number", description: "Customer growth rate %" },
              market_share_change: { type: "number", description: "Market share change %" }
            }
          },
          risk_indicators: {
            type: "array",
            items: { type: "string" },
            description: "List of identified risk factors"
          }
        },
        required: ["revenue_trend", "profitability_trend", "growth_metrics"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "assess_market_conditions",
      description: "Assess market conditions and sector-specific factors affecting sentiment",
      parameters: {
        type: "object",
        properties: {
          sector: {
            type: "string",
            description: "Industry sector of the portfolio company"
          },
          market_conditions: {
            type: "string",
            enum: ["favorable", "neutral", "challenging"],
            description: "Overall market conditions for the sector"
          },
          competitive_position: {
            type: "string",
            enum: ["leader", "strong", "average", "weak"],
            description: "Company's competitive position in the market"
          },
          regulatory_environment: {
            type: "string",
            enum: ["supportive", "neutral", "restrictive"],
            description: "Regulatory environment impact"
          },
          technology_disruption_risk: {
            type: "number",
            minimum: 0,
            maximum: 10,
            description: "Technology disruption risk score (0-10)"
          }
        },
        required: ["sector", "market_conditions", "competitive_position"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "generate_investment_recommendation",
      description: "Generate investment recommendation based on comprehensive analysis",
      parameters: {
        type: "object",
        properties: {
          overall_score: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Overall investment score (0-100)"
          },
          recommendation: {
            type: "string",
            enum: ["strong_buy", "buy", "hold", "sell", "strong_sell"],
            description: "Investment recommendation"
          },
          confidence_level: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence in the recommendation (0-1)"
          },
          key_drivers: {
            type: "array",
            items: { type: "string" },
            description: "Key factors driving the recommendation"
          },
          risk_mitigation: {
            type: "array",
            items: { type: "string" },
            description: "Recommended risk mitigation strategies"
          },
          exit_strategy: {
            type: "string",
            description: "Recommended exit strategy and timeline"
          }
        },
        required: ["overall_score", "recommendation", "confidence_level", "key_drivers"]
      }
    }
  }
]

export class SentimentAnalyzer {
  
  async analyzePortfolioCompany(portfolioId: string): Promise<PortfolioInsight> {
    try {
      // Fetch portfolio company data with KPIs
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
        include: {
          kpis: {
            orderBy: { period: 'desc' },
            take: 24 // Last 2 years of data
          },
          fund: true
        }
      })

      if (!portfolio) {
        throw new Error(`Portfolio company not found: ${portfolioId}`)
      }

      // Check if OpenAI is available
      const useOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'

      let sentimentAnalysis: SentimentAnalysis
      let aiProvider = 'miniature-llm'

      if (useOpenAI) {
        try {
          // Try OpenAI first
          const kpiData = this.prepareKPIData(portfolio.kpis)
          sentimentAnalysis = await this.performAISentimentAnalysis(portfolio, kpiData)
          aiProvider = 'openai-gpt4'
        } catch (error) {
          console.warn('OpenAI analysis failed, falling back to simple analysis:', error)
          sentimentAnalysis = await this.performSimpleAnalysis(portfolio)
        }
      } else {
        // Use simple analysis
        sentimentAnalysis = await this.performSimpleAnalysis(portfolio)
      }

      // Generate portfolio insight
      const insight: PortfolioInsight = {
        companyName: portfolio.name,
        sector: portfolio.sector || 'Unknown',
        overallHealth: this.calculateOverallHealthFromKPIs(portfolio.kpis),
        sentiment: sentimentAnalysis,
        kpiTrends: this.analyzeTrendsFromKPIs(portfolio.kpis),
        alerts: this.generateAlertsFromAnalysis(portfolio.kpis, sentimentAnalysis),
        recommendations: this.generateRecommendations(sentimentAnalysis),
        aiProvider,
        analysisTimestamp: new Date().toISOString()
      }

      // Store analysis results
      await this.storeAnalysisResults(portfolioId, insight)

      return insight

    } catch (error) {
      console.error('Error analyzing portfolio company:', error)
      throw error
    }
  }

  private async performSimpleAnalysis(portfolio: any): Promise<SentimentAnalysis> {
    try {
      // Simple analysis based on KPI trends
      const kpis = portfolio.kpis || []
      const revenueKPIs = kpis.filter((kpi: any) => kpi.category === 'revenue')
      const profitabilityKPIs = kpis.filter((kpi: any) => kpi.category === 'profitability')

      let score = 0
      let sentiment: SentimentAnalysis['sentiment'] = 'neutral'

      // Analyze revenue growth
      if (revenueKPIs.length >= 2) {
        const latest = revenueKPIs[0].value
        const previous = revenueKPIs[1].value
        const growth = ((latest - previous) / previous) * 100

        if (growth > 20) score += 0.4
        else if (growth > 10) score += 0.2
        else if (growth < -10) score -= 0.3
      }

      // Analyze profitability
      if (profitabilityKPIs.length > 0) {
        const avgMargin = profitabilityKPIs.reduce((sum: number, kpi: any) => sum + kpi.value, 0) / profitabilityKPIs.length
        if (avgMargin > 20) score += 0.3
        else if (avgMargin > 10) score += 0.1
        else if (avgMargin < 0) score -= 0.2
      }

      // Determine sentiment
      if (score > 0.3) sentiment = 'positive'
      else if (score > 0.6) sentiment = 'very_positive'
      else if (score < -0.3) sentiment = 'negative'
      else if (score < -0.6) sentiment = 'very_negative'

      return {
        sentiment,
        confidence: 0.8,
        score: Math.max(-1, Math.min(1, score)),
        reasoning: `Analysis based on ${kpis.length} KPIs including revenue and profitability trends`,
        keyFactors: ['Revenue growth', 'Profitability margins', 'KPI trends'],
        riskFactors: score < 0 ? ['Declining performance', 'Market challenges'] : [],
        opportunities: score > 0 ? ['Growth potential', 'Market expansion'] : [],
        marketTrend: score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral',
        investmentRecommendation: score > 0.4 ? 'buy' : score < -0.4 ? 'sell' : 'hold'
      }

    } catch (error) {
      console.error('Simple analysis failed:', error)
      return this.generateFallbackSentiment({})
    }
  }

  private prepareKPIData(kpis: any[]) {
    const grouped = kpis.reduce((acc, kpi) => {
      if (!acc[kpi.category]) acc[kpi.category] = []
      acc[kpi.category].push({
        name: kpi.name,
        value: kpi.value,
        period: kpi.period,
        confidence: kpi.confidence
      })
      return acc
    }, {} as Record<string, any[]>)

    return {
      revenue: grouped.revenue || [],
      profitability: grouped.profitability || [],
      customers: grouped.customers || [],
      operational: grouped.operational || [],
      growth: grouped.growth || [],
      financial: grouped.financial || []
    }
  }

  private async performAISentimentAnalysis(portfolio: any, kpiData: any): Promise<SentimentAnalysis> {
    const prompt = `
    Analyze the sentiment and investment outlook for portfolio company: ${portfolio.name}
    
    Sector: ${portfolio.sector}
    Geography: ${portfolio.geography}
    Investment: $${(portfolio.investment / 1000000).toFixed(1)}M
    Ownership: ${(portfolio.ownership * 100).toFixed(1)}%
    
    Recent KPI Performance:
    ${JSON.stringify(kpiData, null, 2)}
    
    Please analyze this portfolio company's performance and provide:
    1. Overall sentiment assessment
    2. Key performance drivers
    3. Risk factors and mitigation strategies
    4. Investment recommendation
    5. Market outlook for the sector
    
    Use the provided tools to structure your analysis.
    `

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert private equity analyst specializing in portfolio company performance analysis and sentiment assessment. Use the provided tools to structure your analysis comprehensively."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: sentimentAnalysisTools,
        tool_choice: "auto",
        temperature: 0.3
      })

      // Process tool calls and generate sentiment analysis
      const toolCalls = response.choices[0].message.tool_calls || []
      const analysisResults = await this.processToolCalls(toolCalls)
      
      // Generate final sentiment analysis
      return this.synthesizeSentimentAnalysis(analysisResults, response.choices[0].message.content)

    } catch (error) {
      console.error('Error in AI sentiment analysis:', error)
      // Fallback to basic analysis
      return this.generateFallbackSentiment(kpiData)
    }
  }

  private async processToolCalls(toolCalls: any[]) {
    const results: any = {}

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name
      const args = JSON.parse(toolCall.function.arguments)
      
      switch (functionName) {
        case 'analyze_financial_metrics':
          results.financialAnalysis = args
          break
        case 'assess_market_conditions':
          results.marketAssessment = args
          break
        case 'generate_investment_recommendation':
          results.investmentRecommendation = args
          break
      }
    }

    return results
  }

  private synthesizeSentimentAnalysis(toolResults: any, aiResponse: string | null): SentimentAnalysis {
    const financial = toolResults.financialAnalysis || {}
    const market = toolResults.marketAssessment || {}
    const investment = toolResults.investmentRecommendation || {}

    // Calculate sentiment score based on tool results
    let sentimentScore = 0
    
    // Financial metrics impact (40% weight)
    if (financial.revenue_trend === 'increasing') sentimentScore += 0.4
    else if (financial.revenue_trend === 'stable') sentimentScore += 0.2
    
    if (financial.profitability_trend === 'improving') sentimentScore += 0.3
    else if (financial.profitability_trend === 'stable') sentimentScore += 0.15
    
    // Market conditions impact (30% weight)
    if (market.market_conditions === 'favorable') sentimentScore += 0.3
    else if (market.market_conditions === 'neutral') sentimentScore += 0.15
    
    // Competitive position impact (30% weight)
    if (market.competitive_position === 'leader') sentimentScore += 0.3
    else if (market.competitive_position === 'strong') sentimentScore += 0.2
    else if (market.competitive_position === 'average') sentimentScore += 0.1

    // Normalize to -1 to 1 scale
    const normalizedScore = (sentimentScore - 0.5) * 2

    return {
      sentiment: this.scoresToSentiment(normalizedScore),
      confidence: investment.confidence_level || 0.75,
      score: normalizedScore,
      reasoning: aiResponse || 'Analysis based on financial metrics and market conditions',
      keyFactors: investment.key_drivers || [],
      riskFactors: financial.risk_indicators || [],
      opportunities: [],
      marketTrend: this.determineMarketTrend(market),
      investmentRecommendation: investment.recommendation || 'hold'
    }
  }

  private scoresToSentiment(score: number): SentimentAnalysis['sentiment'] {
    if (score >= 0.6) return 'very_positive'
    if (score >= 0.2) return 'positive'
    if (score >= -0.2) return 'neutral'
    if (score >= -0.6) return 'negative'
    return 'very_negative'
  }

  private determineMarketTrend(market: any): 'bullish' | 'neutral' | 'bearish' {
    if (market.market_conditions === 'favorable') return 'bullish'
    if (market.market_conditions === 'challenging') return 'bearish'
    return 'neutral'
  }

  private calculateOverallHealth(kpiData: any): number {
    // Simple health calculation based on available KPIs
    let healthScore = 50 // Base score
    
    // Revenue trend impact
    const revenueKPIs = kpiData.revenue || []
    if (revenueKPIs.length >= 2) {
      const latest = revenueKPIs[0]?.value || 0
      const previous = revenueKPIs[1]?.value || 0
      if (latest > previous) healthScore += 20
      else if (latest < previous * 0.95) healthScore -= 15
    }

    // Profitability impact
    const profitabilityKPIs = kpiData.profitability || []
    if (profitabilityKPIs.length > 0) {
      const avgProfitability = profitabilityKPIs.reduce((sum: number, kpi: any) => sum + kpi.value, 0) / profitabilityKPIs.length
      if (avgProfitability > 0) healthScore += 15
      else healthScore -= 20
    }

    return Math.max(0, Math.min(100, healthScore))
  }

  private analyzeTrends(kpiData: any) {
    return {
      revenue: this.calculateTrend(kpiData.revenue),
      profitability: this.calculateTrend(kpiData.profitability),
      growth: this.calculateTrend(kpiData.growth)
    }
  }

  private calculateTrend(kpis: any[]): 'improving' | 'stable' | 'declining' {
    if (!kpis || kpis.length < 2) return 'stable'
    
    const latest = kpis[0]?.value || 0
    const previous = kpis[1]?.value || 0
    
    if (latest > previous * 1.05) return 'improving'
    if (latest < previous * 0.95) return 'declining'
    return 'stable'
  }

  private generateAlerts(kpiData: any, sentiment: SentimentAnalysis): string[] {
    const alerts: string[] = []
    
    if (sentiment.score < -0.3) {
      alerts.push('⚠️ Negative sentiment detected - requires attention')
    }
    
    if (sentiment.riskFactors.length > 3) {
      alerts.push('🚨 Multiple risk factors identified')
    }
    
    return alerts
  }

  private generateRecommendations(sentiment: SentimentAnalysis): string[] {
    const recommendations: string[] = []
    
    if (sentiment.investmentRecommendation === 'strong_buy') {
      recommendations.push('💰 Consider increasing investment allocation')
    } else if (sentiment.investmentRecommendation === 'sell') {
      recommendations.push('📉 Evaluate exit opportunities')
    }
    
    recommendations.push('📊 Monitor key performance indicators closely')
    
    return recommendations
  }

  private generateFallbackSentiment(kpiData: any): SentimentAnalysis {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      score: 0,
      reasoning: 'Fallback analysis - AI service unavailable',
      keyFactors: ['Limited data available'],
      riskFactors: ['AI analysis unavailable'],
      opportunities: [],
      marketTrend: 'neutral',
      investmentRecommendation: 'hold'
    }
  }

  private calculateOverallHealthFromKPIs(kpis: any[]): number {
    let healthScore = 50 // Base score

    const revenueKPIs = kpis.filter(kpi => kpi.category === 'revenue').sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())
    const profitabilityKPIs = kpis.filter(kpi => kpi.category === 'profitability')

    // Revenue trend impact
    if (revenueKPIs.length >= 2) {
      const latest = revenueKPIs[0]?.value || 0
      const previous = revenueKPIs[1]?.value || 0
      if (latest > previous) healthScore += 20
      else if (latest < previous * 0.95) healthScore -= 15
    }

    // Profitability impact
    if (profitabilityKPIs.length > 0) {
      const avgProfitability = profitabilityKPIs.reduce((sum, kpi) => sum + kpi.value, 0) / profitabilityKPIs.length
      if (avgProfitability > 0) healthScore += 15
      else healthScore -= 20
    }

    return Math.max(0, Math.min(100, healthScore))
  }

  private analyzeTrendsFromKPIs(kpis: any[]) {
    const revenueKPIs = kpis.filter(kpi => kpi.category === 'revenue').sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())
    const profitabilityKPIs = kpis.filter(kpi => kpi.category === 'profitability').sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())
    const growthKPIs = kpis.filter(kpi => kpi.category === 'growth').sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())

    return {
      revenue: this.calculateTrend(revenueKPIs),
      profitability: this.calculateTrend(profitabilityKPIs),
      growth: this.calculateGrowthTrend(growthKPIs)
    }
  }

  private calculateGrowthTrend(kpis: any[]): 'stable' | 'accelerating' | 'slowing' {
    if (!kpis || kpis.length < 2) return 'stable'

    const latest = kpis[0]?.value || 0
    const previous = kpis[1]?.value || 0

    const changePercent = previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : 0

    if (changePercent > 5) return 'accelerating'
    if (changePercent < -5) return 'slowing'
    return 'stable'
  }

  private generateAlertsFromAnalysis(kpis: any[], sentiment: SentimentAnalysis): string[] {
    const alerts: string[] = []

    if (sentiment.score < -0.3) {
      alerts.push('⚠️ Negative sentiment detected - requires attention')
    }

    if (sentiment.riskFactors && sentiment.riskFactors.length > 3) {
      alerts.push('🚨 Multiple risk factors identified')
    }

    // Check for declining revenue
    const revenueKPIs = kpis.filter(kpi => kpi.category === 'revenue').sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())
    if (revenueKPIs.length >= 2 && revenueKPIs[0].value < revenueKPIs[1].value * 0.95) {
      alerts.push('📉 Revenue decline detected')
    }

    return alerts
  }

  private async storeAnalysisResults(portfolioId: string, insight: PortfolioInsight) {
    try {
      // Store in database for future reference
      await prisma.document.create({
        data: {
          title: `AI Analysis - ${insight.companyName}`,
          filename: `analysis-${portfolioId}-${Date.now()}.json`,
          fileType: 'application/json',
          fileSize: JSON.stringify(insight).length,
          filePath: `/analysis/${portfolioId}`,
          uploadedBy: 'system',
          organizationId: (await prisma.portfolio.findUnique({
            where: { id: portfolioId },
            select: { fund: { select: { organizationId: true } } }
          }))?.fund.organizationId || '',
          status: 'COMPLETED',
          extractedText: insight.sentiment.reasoning,
          metadata: JSON.stringify({
            analysisDate: new Date().toISOString(),
            portfolioId,
            sentimentScore: insight.sentiment.score,
            overallHealth: insight.overallHealth,
            aiProvider: insight.aiProvider,
            recommendation: insight.sentiment.investmentRecommendation
          }),
          tags: `sentiment,ai-analysis,portfolio-insight,${insight.aiProvider}`,
          isEmbedded: false
        }
      })
    } catch (error) {
      console.error('Error storing analysis results:', error)
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer()
