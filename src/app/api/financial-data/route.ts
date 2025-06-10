/**
 * Financial Data API
 * Provides access to real-time market data, economic indicators, and industry benchmarks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { financialDataService } from '@/lib/integrations/financial-data-service'
import { rateLimiter } from '@/lib/middleware/rate-limiter'
import { requireFeature } from '@/lib/config/feature-flags'

export async function GET(request: NextRequest) {
  try {
    // Check if financial data API is enabled
    requireFeature('enableFinancialDataAPI', 'Financial Data API')

    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      request,
      {
        maxRequests: 100,
        windowMs: 60000, // 100 requests per minute
        strategy: 'fixed-window'
      }
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      )
    }

    // Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const symbols = searchParams.get('symbols')?.split(',') || []
    const industry = searchParams.get('industry')
    const limit = parseInt(searchParams.get('limit') || '20')

    switch (type) {
      case 'market':
        return await getMarketData(symbols)
      
      case 'economic':
        return await getEconomicIndicators()
      
      case 'news':
        return await getFinancialNews(symbols, limit)
      
      case 'benchmarks':
        if (!industry) {
          return NextResponse.json(
            { error: 'Industry parameter required for benchmarks' },
            { status: 400 }
          )
        }
        return await getIndustryBenchmarks(industry)
      
      case 'reits':
        return await getREITData()
      
      case 'commodities':
        return await getCommodityPrices()
      
      case 'currencies':
        return await getCurrencyRates()
      
      case 'sentiment':
        const text = searchParams.get('text')
        if (!text) {
          return NextResponse.json(
            { error: 'Text parameter required for sentiment analysis' },
            { status: 400 }
          )
        }
        return await analyzeSentiment(text)
      
      case 'status':
        return await getProviderStatus()
      
      default:
        return NextResponse.json({
          success: true,
          availableTypes: [
            'market', 'economic', 'news', 'benchmarks', 
            'reits', 'commodities', 'currencies', 'sentiment', 'status'
          ],
          usage: {
            market: '?type=market&symbols=AAPL,GOOGL,MSFT',
            economic: '?type=economic',
            news: '?type=news&symbols=AAPL&limit=10',
            benchmarks: '?type=benchmarks&industry=technology',
            reits: '?type=reits',
            commodities: '?type=commodities',
            currencies: '?type=currencies',
            sentiment: '?type=sentiment&text=The market is showing strong growth',
            status: '?type=status'
          }
        })
    }

  } catch (error) {
    console.error('Financial data API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch financial data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getMarketData(symbols: string[]): Promise<NextResponse> {
  try {
    if (symbols.length === 0) {
      // Default symbols for demo
      symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
    }

    if (symbols.length > 50) {
      return NextResponse.json(
        { error: 'Too many symbols (max 50)' },
        { status: 400 }
      )
    }

    const data = await financialDataService.getMarketData(symbols)

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        symbols: symbols.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getEconomicIndicators(): Promise<NextResponse> {
  try {
    const data = await financialDataService.getEconomicIndicators()

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        indicators: data.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch economic indicators',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getFinancialNews(symbols: string[], limit: number): Promise<NextResponse> {
  try {
    const data = await financialDataService.getFinancialNews(
      symbols.length > 0 ? symbols : undefined, 
      Math.min(limit, 100) // Cap at 100
    )

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        articles: data.length,
        symbols: symbols.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch financial news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getIndustryBenchmarks(industry: string): Promise<NextResponse> {
  try {
    const data = await financialDataService.getIndustryBenchmarks(industry)

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        industry,
        benchmarks: data.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch industry benchmarks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getREITData(): Promise<NextResponse> {
  try {
    const data = await financialDataService.getREITData()

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        reits: data.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch REIT data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getCommodityPrices(): Promise<NextResponse> {
  try {
    const data = await financialDataService.getCommodityPrices()

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        commodities: data.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch commodity prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getCurrencyRates(): Promise<NextResponse> {
  try {
    const data = await financialDataService.getCurrencyRates()

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        currencies: data.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch currency rates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function analyzeSentiment(text: string): Promise<NextResponse> {
  try {
    const data = await financialDataService.analyzeSentiment(text)

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        textLength: text.length,
        timestamp: new Date().toISOString(),
        source: 'financial-data-service'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze sentiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getProviderStatus(): Promise<NextResponse> {
  try {
    const status = financialDataService.getProviderStatus()

    return NextResponse.json({
      success: true,
      status,
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get provider status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
