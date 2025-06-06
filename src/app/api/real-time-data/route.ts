import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchRealTimeMarketData } from '@/lib/data/real-market-data'

// GET - Fetch real-time market data for portfolios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const portfolioId = searchParams.get('portfolioId')
    const organizationId = searchParams.get('organizationId')
    const sector = searchParams.get('sector')
    const includeMarketData = searchParams.get('includeMarketData') === 'true'

    // If specific portfolio requested
    if (portfolioId) {
      const realTimeData = await fetchRealTimeMarketData(portfolioId)
      return NextResponse.json({
        success: true,
        data: realTimeData,
        timestamp: new Date().toISOString()
      })
    }

    // Build query filters
    const where: any = {}
    
    if (organizationId) {
      where.fund = {
        organizationId: organizationId
      }
    }
    
    if (sector) {
      where.sector = sector
    }

    // Fetch portfolios with real-time enhancements
    const portfolios = await prisma.portfolio.findMany({
      where,
      include: {
        fund: {
          include: {
            organization: true
          }
        },
        kpis: {
          orderBy: { period: 'desc' },
          take: 5
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Enhance with real-time data if requested
    const enhancedPortfolios = await Promise.all(
      portfolios.map(async (portfolio) => {
        const baseData = {
          id: portfolio.id,
          name: portfolio.name,
          sector: portfolio.sector,
          geography: portfolio.geography,
          status: portfolio.status,
          investment: portfolio.investment,
          ownership: portfolio.ownership,
          organization: portfolio.fund.organization.name,
          fund: portfolio.fund.name,
          lastUpdated: portfolio.updatedAt
        }

        if (includeMarketData) {
          try {
            const realTimeData = await fetchRealTimeMarketData(portfolio.id)
            return {
              ...baseData,
              realTimeData: realTimeData.marketData,
              fundamentals: realTimeData.fundamentals,
              sentiment: realTimeData.sentiment
            }
          } catch (error) {
            console.error(`Error fetching real-time data for ${portfolio.name}:`, error)
            return baseData
          }
        }

        return baseData
      })
    )

    return NextResponse.json({
      success: true,
      data: enhancedPortfolios,
      count: enhancedPortfolios.length,
      timestamp: new Date().toISOString(),
      metadata: {
        includeMarketData,
        organizationFilter: organizationId,
        sectorFilter: sector
      }
    })

  } catch (error) {
    console.error('Error fetching real-time data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch real-time data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Update real-time data for a portfolio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { portfolioId, marketData, fundamentals, sentiment } = body

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    // Verify portfolio exists
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId }
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    // Create KPI records for real-time data updates
    const updates = []

    if (marketData) {
      // Update market data KPIs
      if (marketData.stockPrice) {
        const stockPriceKPI = await prisma.kPI.create({
          data: {
            name: 'Stock Price',
            category: 'market_data',
            value: marketData.stockPrice,
            unit: 'USD',
            period: new Date(),
            periodType: 'real_time',
            source: 'Real-time Market Data API',
            confidence: 0.99,
            notes: 'Real-time stock price update',
            metadata: JSON.stringify({
              dataType: 'real_time',
              source: 'market_api',
              timestamp: new Date().toISOString()
            }),
            portfolioId: portfolioId,
            fundId: portfolio.fundId,
            organizationId: (await prisma.fund.findUnique({ 
              where: { id: portfolio.fundId } 
            }))?.organizationId || ''
          }
        })
        updates.push(stockPriceKPI)
      }

      if (marketData.marketCap) {
        const marketCapKPI = await prisma.kPI.create({
          data: {
            name: 'Market Capitalization',
            category: 'market_data',
            value: marketData.marketCap,
            unit: 'USD',
            period: new Date(),
            periodType: 'real_time',
            source: 'Real-time Market Data API',
            confidence: 0.99,
            notes: 'Real-time market cap update',
            metadata: JSON.stringify({
              dataType: 'real_time',
              source: 'market_api',
              timestamp: new Date().toISOString()
            }),
            portfolioId: portfolioId,
            fundId: portfolio.fundId,
            organizationId: (await prisma.fund.findUnique({ 
              where: { id: portfolio.fundId } 
            }))?.organizationId || ''
          }
        })
        updates.push(marketCapKPI)
      }
    }

    if (fundamentals) {
      // Update fundamental data
      if (fundamentals.revenue) {
        const revenueKPI = await prisma.kPI.create({
          data: {
            name: 'Revenue (Real-time)',
            category: 'revenue',
            value: fundamentals.revenue,
            unit: 'USD',
            period: new Date(),
            periodType: 'real_time',
            source: 'Real-time Fundamental Data',
            confidence: 0.95,
            notes: 'Real-time revenue update',
            metadata: JSON.stringify({
              dataType: 'fundamental',
              source: 'real_time_api',
              timestamp: new Date().toISOString()
            }),
            portfolioId: portfolioId,
            fundId: portfolio.fundId,
            organizationId: (await prisma.fund.findUnique({ 
              where: { id: portfolio.fundId } 
            }))?.organizationId || ''
          }
        })
        updates.push(revenueKPI)
      }
    }

    if (sentiment) {
      // Update sentiment data
      const sentimentKPI = await prisma.kPI.create({
        data: {
          name: 'Market Sentiment Score',
          category: 'sentiment',
          value: sentiment.score,
          unit: 'score',
          period: new Date(),
          periodType: 'real_time',
          source: 'AI Sentiment Analysis',
          confidence: 0.90,
          notes: `Sentiment analysis from ${sentiment.sources?.join(', ') || 'multiple sources'}`,
          metadata: JSON.stringify({
            dataType: 'sentiment',
            sources: sentiment.sources,
            timestamp: new Date().toISOString()
          }),
          portfolioId: portfolioId,
          fundId: portfolio.fundId,
          organizationId: (await prisma.fund.findUnique({ 
            where: { id: portfolio.fundId } 
          }))?.organizationId || ''
        }
      })
      updates.push(sentimentKPI)
    }

    return NextResponse.json({
      success: true,
      message: 'Real-time data updated successfully',
      updates: updates.length,
      data: updates,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating real-time data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update real-time data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
