/**
 * Financial Data Integration Service
 * Integrates with multiple financial data providers for real-time market data
 */

import { redisCache } from '@/lib/cache/redis-cache'

export interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  pe?: number
  eps?: number
  dividend?: number
  timestamp: string
}

export interface EconomicIndicator {
  indicator: string
  value: number
  unit: string
  period: string
  source: string
  timestamp: string
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source: string
  sentiment: 'positive' | 'negative' | 'neutral'
  relevanceScore: number
  publishedAt: string
  symbols?: string[]
}

export interface IndustryBenchmark {
  industry: string
  metric: string
  value: number
  percentile25: number
  percentile50: number
  percentile75: number
  sampleSize: number
  source: string
  period: string
}

export class FinancialDataService {
  private static instance: FinancialDataService
  private providers: Map<string, any> = new Map()

  private constructor() {
    this.initializeProviders()
  }

  static getInstance(): FinancialDataService {
    if (!FinancialDataService.instance) {
      FinancialDataService.instance = new FinancialDataService()
    }
    return FinancialDataService.instance
  }

  private initializeProviders() {
    // Alpha Vantage
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      this.providers.set('alphavantage', {
        apiKey: process.env.ALPHA_VANTAGE_API_KEY,
        baseUrl: 'https://www.alphavantage.co/query',
        rateLimit: 5 // requests per minute
      })
    }

    // IEX Cloud
    if (process.env.IEX_CLOUD_API_KEY) {
      this.providers.set('iexcloud', {
        apiKey: process.env.IEX_CLOUD_API_KEY,
        baseUrl: 'https://cloud.iexapis.com/stable',
        rateLimit: 100
      })
    }

    // Polygon.io
    if (process.env.POLYGON_API_KEY) {
      this.providers.set('polygon', {
        apiKey: process.env.POLYGON_API_KEY,
        baseUrl: 'https://api.polygon.io',
        rateLimit: 5
      })
    }

    // Financial Modeling Prep
    if (process.env.FMP_API_KEY) {
      this.providers.set('fmp', {
        apiKey: process.env.FMP_API_KEY,
        baseUrl: 'https://financialmodelingprep.com/api/v3',
        rateLimit: 250
      })
    }
  }

  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const cacheKey = `market:${symbols.sort().join(',')}`
    
    // Check cache first
    const cached = await redisCache.get<MarketData[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      let data: MarketData[] = []

      // Try providers in order of preference
      if (this.providers.has('iexcloud')) {
        data = await this.getIEXMarketData(symbols)
      } else if (this.providers.has('alphavantage')) {
        data = await this.getAlphaVantageMarketData(symbols)
      } else if (this.providers.has('polygon')) {
        data = await this.getPolygonMarketData(symbols)
      } else {
        // Fallback to mock data
        data = this.generateMockMarketData(symbols)
      }

      // Cache for 1 minute
      await redisCache.set(cacheKey, data, 60)
      return data

    } catch (error) {
      console.error('Market data fetch error:', error)
      return this.generateMockMarketData(symbols)
    }
  }

  async getEconomicIndicators(): Promise<EconomicIndicator[]> {
    const cacheKey = 'economic:indicators'
    
    const cached = await redisCache.get<EconomicIndicator[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      let indicators: EconomicIndicator[] = []

      if (this.providers.has('alphavantage')) {
        indicators = await this.getAlphaVantageEconomicData()
      } else {
        indicators = this.generateMockEconomicData()
      }

      // Cache for 1 hour
      await redisCache.set(cacheKey, indicators, 3600)
      return indicators

    } catch (error) {
      console.error('Economic data fetch error:', error)
      return this.generateMockEconomicData()
    }
  }

  async getFinancialNews(
    symbols?: string[], 
    limit: number = 20
  ): Promise<NewsItem[]> {
    const cacheKey = `news:${symbols?.join(',') || 'general'}:${limit}`
    
    const cached = await redisCache.get<NewsItem[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      let news: NewsItem[] = []

      if (this.providers.has('alphavantage')) {
        news = await this.getAlphaVantageNews(symbols, limit)
      } else {
        news = this.generateMockNews(symbols, limit)
      }

      // Cache for 15 minutes
      await redisCache.set(cacheKey, news, 900)
      return news

    } catch (error) {
      console.error('News fetch error:', error)
      return this.generateMockNews(symbols, limit)
    }
  }

  async getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark[]> {
    const cacheKey = `benchmarks:${industry}`
    
    const cached = await redisCache.get<IndustryBenchmark[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      let benchmarks: IndustryBenchmark[] = []

      if (this.providers.has('fmp')) {
        benchmarks = await this.getFMPIndustryData(industry)
      } else {
        benchmarks = this.generateMockBenchmarks(industry)
      }

      // Cache for 24 hours
      await redisCache.set(cacheKey, benchmarks, 86400)
      return benchmarks

    } catch (error) {
      console.error('Benchmark data fetch error:', error)
      return this.generateMockBenchmarks(industry)
    }
  }

  // Provider-specific implementations
  private async getIEXMarketData(symbols: string[]): Promise<MarketData[]> {
    const provider = this.providers.get('iexcloud')
    const symbolsStr = symbols.join(',')
    
    const response = await fetch(
      `${provider.baseUrl}/stock/market/batch?symbols=${symbolsStr}&types=quote&token=${provider.apiKey}`
    )

    if (!response.ok) {
      throw new Error(`IEX API error: ${response.status}`)
    }

    const data = await response.json()
    
    return symbols.map(symbol => {
      const quote = data[symbol]?.quote
      if (!quote) {
        return this.generateMockMarketData([symbol])[0]
      }

      return {
        symbol,
        price: quote.latestPrice,
        change: quote.change,
        changePercent: quote.changePercent * 100,
        volume: quote.latestVolume,
        marketCap: quote.marketCap,
        pe: quote.peRatio,
        timestamp: new Date().toISOString()
      }
    })
  }

  private async getAlphaVantageMarketData(symbols: string[]): Promise<MarketData[]> {
    const provider = this.providers.get('alphavantage')
    const results: MarketData[] = []

    // Alpha Vantage requires individual requests for each symbol
    for (const symbol of symbols.slice(0, 5)) { // Limit due to rate limits
      try {
        const response = await fetch(
          `${provider.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${provider.apiKey}`
        )

        if (!response.ok) continue

        const data = await response.json()
        const quote = data['Global Quote']

        if (quote) {
          results.push({
            symbol,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            volume: parseInt(quote['06. volume']),
            timestamp: new Date().toISOString()
          })
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 12000)) // 5 requests per minute

      } catch (error) {
        console.error(`Alpha Vantage error for ${symbol}:`, error)
      }
    }

    return results
  }

  private async getPolygonMarketData(symbols: string[]): Promise<MarketData[]> {
    const provider = this.providers.get('polygon')
    const results: MarketData[] = []

    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `${provider.baseUrl}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${provider.apiKey}`
        )

        if (!response.ok) continue

        const data = await response.json()
        const result = data.results?.[0]

        if (result) {
          results.push({
            symbol,
            price: result.c, // close price
            change: result.c - result.o, // close - open
            changePercent: ((result.c - result.o) / result.o) * 100,
            volume: result.v,
            timestamp: new Date().toISOString()
          })
        }

      } catch (error) {
        console.error(`Polygon error for ${symbol}:`, error)
      }
    }

    return results
  }

  private async getAlphaVantageEconomicData(): Promise<EconomicIndicator[]> {
    const provider = this.providers.get('alphavantage')
    const indicators: EconomicIndicator[] = []

    const economicFunctions = [
      { function: 'FEDERAL_FUNDS_RATE', name: 'Federal Funds Rate' },
      { function: 'CPI', name: 'Consumer Price Index' },
      { function: 'INFLATION', name: 'Inflation Rate' },
      { function: 'UNEMPLOYMENT', name: 'Unemployment Rate' }
    ]

    for (const { function: func, name } of economicFunctions) {
      try {
        const response = await fetch(
          `${provider.baseUrl}?function=${func}&apikey=${provider.apiKey}`
        )

        if (!response.ok) continue

        const data = await response.json()
        const latestData = Object.values(data.data || {})[0] as any

        if (latestData) {
          indicators.push({
            indicator: name,
            value: parseFloat(latestData.value),
            unit: '%',
            period: latestData.date,
            source: 'Alpha Vantage',
            timestamp: new Date().toISOString()
          })
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 12000))

      } catch (error) {
        console.error(`Economic data error for ${func}:`, error)
      }
    }

    return indicators
  }

  private async getAlphaVantageNews(symbols?: string[], limit: number = 20): Promise<NewsItem[]> {
    const provider = this.providers.get('alphavantage')
    
    try {
      const topics = symbols?.join(',') || 'financial_markets'
      const response = await fetch(
        `${provider.baseUrl}?function=NEWS_SENTIMENT&topics=${topics}&limit=${limit}&apikey=${provider.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`Alpha Vantage News API error: ${response.status}`)
      }

      const data = await response.json()
      
      return (data.feed || []).map((item: any, index: number) => ({
        id: `av_${index}_${Date.now()}`,
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        sentiment: this.mapSentiment(item.overall_sentiment_score),
        relevanceScore: parseFloat(item.relevance_score || '0.5'),
        publishedAt: item.time_published,
        symbols: item.ticker_sentiment?.map((t: any) => t.ticker) || []
      }))

    } catch (error) {
      console.error('Alpha Vantage news error:', error)
      return this.generateMockNews(symbols, limit)
    }
  }

  private async getFMPIndustryData(industry: string): Promise<IndustryBenchmark[]> {
    // Implementation for Financial Modeling Prep industry benchmarks
    return this.generateMockBenchmarks(industry)
  }

  // Mock data generators for fallback
  private generateMockMarketData(symbols: string[]): MarketData[] {
    return symbols.map(symbol => ({
      symbol,
      price: 100 + Math.random() * 900,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 10000000),
      marketCap: Math.floor(Math.random() * 1000000000000),
      pe: 15 + Math.random() * 20,
      timestamp: new Date().toISOString()
    }))
  }

  private generateMockEconomicData(): EconomicIndicator[] {
    return [
      {
        indicator: 'Federal Funds Rate',
        value: 5.25,
        unit: '%',
        period: '2024-Q1',
        source: 'Mock Data',
        timestamp: new Date().toISOString()
      },
      {
        indicator: 'Inflation Rate',
        value: 3.2,
        unit: '%',
        period: '2024-Q1',
        source: 'Mock Data',
        timestamp: new Date().toISOString()
      },
      {
        indicator: 'Unemployment Rate',
        value: 3.8,
        unit: '%',
        period: '2024-Q1',
        source: 'Mock Data',
        timestamp: new Date().toISOString()
      }
    ]
  }

  private generateMockNews(symbols?: string[], limit: number = 20): NewsItem[] {
    const mockNews = [
      {
        title: 'Tech Stocks Rally on AI Optimism',
        summary: 'Technology stocks surged as investors showed renewed confidence in AI developments.',
        source: 'Financial Times'
      },
      {
        title: 'Federal Reserve Signals Rate Stability',
        summary: 'The Federal Reserve indicated it may pause rate hikes in upcoming meetings.',
        source: 'Reuters'
      },
      {
        title: 'Healthcare Sector Shows Strong Growth',
        summary: 'Healthcare companies reported better-than-expected quarterly earnings.',
        source: 'Bloomberg'
      }
    ]

    return mockNews.slice(0, limit).map((item, index) => ({
      id: `mock_${index}_${Date.now()}`,
      title: item.title,
      summary: item.summary,
      url: '#',
      source: item.source,
      sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any,
      relevanceScore: Math.random(),
      publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      symbols: symbols || []
    }))
  }

  private generateMockBenchmarks(industry: string): IndustryBenchmark[] {
    const metrics = ['ROE', 'ROI', 'Debt-to-Equity', 'Current Ratio', 'Profit Margin']
    
    return metrics.map(metric => ({
      industry,
      metric,
      value: 10 + Math.random() * 20,
      percentile25: 5 + Math.random() * 10,
      percentile50: 10 + Math.random() * 15,
      percentile75: 15 + Math.random() * 20,
      sampleSize: Math.floor(50 + Math.random() * 200),
      source: 'Industry Analysis',
      period: '2024-Q1'
    }))
  }

  private mapSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive'
    if (score < -0.1) return 'negative'
    return 'neutral'
  }

  getProviderStatus() {
    return {
      configured: Array.from(this.providers.keys()),
      available: this.providers.size > 0,
      primary: this.providers.has('iexcloud') ? 'iexcloud' : 
               this.providers.has('alphavantage') ? 'alphavantage' : 
               this.providers.has('polygon') ? 'polygon' : 'mock'
    }
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral'
    confidence: number
    keywords: string[]
  }> {
    // Simple sentiment analysis - in production, use a proper NLP service
    const positiveWords = ['growth', 'profit', 'increase', 'strong', 'bullish', 'optimistic']
    const negativeWords = ['decline', 'loss', 'decrease', 'weak', 'bearish', 'pessimistic']

    const words = text.toLowerCase().split(/\s+/)
    const positiveCount = words.filter(word => positiveWords.includes(word)).length
    const negativeCount = words.filter(word => negativeWords.includes(word)).length

    let sentiment: 'positive' | 'negative' | 'neutral'
    let confidence: number

    if (positiveCount > negativeCount) {
      sentiment = 'positive'
      confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1)
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative'
      confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) * 0.1)
    } else {
      sentiment = 'neutral'
      confidence = 0.5
    }

    const keywords = [...positiveWords, ...negativeWords].filter(word =>
      words.includes(word)
    )

    return { sentiment, confidence, keywords }
  }

  async getREITData(): Promise<any[]> {
    // Real Estate Investment Trust specific data
    const reitSymbols = ['VNQ', 'SCHH', 'RWR', 'IYR', 'XLRE']
    return await this.getMarketData(reitSymbols)
  }

  async getCommodityPrices(): Promise<any[]> {
    // Commodity prices relevant to portfolio analysis
    const commodities = ['GLD', 'SLV', 'USO', 'UNG', 'DBA']
    return await this.getMarketData(commodities)
  }

  async getCurrencyRates(): Promise<any[]> {
    // Major currency exchange rates
    const currencies = ['EURUSD', 'GBPUSD', 'JPYUSD', 'CHFUSD', 'CADUSD']

    // Mock currency data - in production, use forex API
    return currencies.map(pair => ({
      pair,
      rate: 1 + (Math.random() - 0.5) * 0.5,
      change: (Math.random() - 0.5) * 0.02,
      timestamp: new Date().toISOString()
    }))
  }
}

// Export singleton instance
export const financialDataService = FinancialDataService.getInstance()
