// src/app/api/analyze-portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kpiExplanationChain } from '@/lib/langchainClient';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Request validation schema
const AnalyzePortfolioSchema = z.object({
  query: z.string().min(1).max(1000),
  portfolioId: z.string().optional(),
  organizationId: z.string().optional(),
  analysisType: z.enum(['performance', 'trends', 'risks', 'opportunities', 'benchmarking']).optional(),
  timeframe: z.enum(['current', 'quarterly', 'yearly', 'custom']).optional(),
  includeComparisons: z.boolean().optional(),
  includeRecommendations: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AnalyzePortfolioSchema.parse(body);

    // Fetch portfolio data based on query
    const portfolioData = await fetchPortfolioData(validatedData);
    
    // Generate AI analysis
    const analysis = await generatePortfolioAnalysis(validatedData, portfolioData);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Portfolio Analysis API Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function fetchPortfolioData(params: any) {
  const whereClause: any = {};
  
  if (params.portfolioId) {
    whereClause.id = params.portfolioId;
  }
  
  if (params.organizationId) {
    whereClause.organizationId = params.organizationId;
  }

  return await prisma.portfolio.findMany({
    where: whereClause,
    include: {
      fund: true,
      kpis: {
        orderBy: { period: 'desc' },
        take: 20 // Recent KPIs
      }
    },
    take: 50 // Limit for performance
  });
}

async function generatePortfolioAnalysis(params: any, portfolioData: any) {
  const prompt = buildAnalysisPrompt(params, portfolioData);
  
  const result = await kpiExplanationChain.explainKPI({
    question: prompt,
    userRole: 'portfolio_manager',
    portfolioContext: JSON.stringify(portfolioData),
    timePeriod: params.timeframe
  });

  return {
    analysis: result.data,
    insights: extractKeyInsights(result.data),
    recommendations: params.includeRecommendations ? generateRecommendations(portfolioData) : null,
    metadata: {
      ...result.metadata,
      portfolioCount: portfolioData.length,
      analysisType: params.analysisType
    }
  };
}

function buildAnalysisPrompt(params: any, portfolioData: any) {
  const baseQuery = params.query;
  const analysisType = params.analysisType || 'performance';
  
  let prompt = `${baseQuery}\n\nAnalysis Type: ${analysisType}\n`;
  
  if (portfolioData.length > 0) {
    prompt += `\nPortfolio Context: ${portfolioData.length} companies across various sectors.\n`;
    
    // Add sector breakdown
    const sectors = portfolioData.map((p: any) => p.sector).filter(Boolean);
    const sectorCounts = sectors.reduce((acc: any, sector: string) => {
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});
    
    if (Object.keys(sectorCounts).length > 0) {
      prompt += `Sector breakdown: ${Object.entries(sectorCounts).map(([sector, count]) => `${sector}: ${count}`).join(', ')}\n`;
    }
  }
  
  switch (analysisType) {
    case 'performance':
      prompt += '\nFocus on: Revenue growth, profitability metrics, operational efficiency, and key performance trends.';
      break;
    case 'trends':
      prompt += '\nFocus on: Identifying patterns, seasonal variations, growth trajectories, and emerging trends.';
      break;
    case 'risks':
      prompt += '\nFocus on: Risk assessment, potential threats, market vulnerabilities, and mitigation strategies.';
      break;
    case 'opportunities':
      prompt += '\nFocus on: Growth opportunities, value creation potential, market expansion, and optimization areas.';
      break;
    case 'benchmarking':
      prompt += '\nFocus on: Industry comparisons, peer analysis, market positioning, and competitive advantages.';
      break;
  }
  
  return prompt;
}

function extractKeyInsights(analysis: any): string[] {
  // Extract key insights from the AI response
  // This is a simplified version - you could make this more sophisticated
  const insights: string[] = [];
  
  if (analysis.explanation) {
    const text = analysis.explanation;
    
    // Look for key phrases that indicate insights
    const insightPatterns = [
      /shows?\s+(?:strong|weak|declining|improving|significant)/gi,
      /indicates?\s+(?:that|a|an)/gi,
      /suggests?\s+(?:that|a|an)/gi,
      /reveals?\s+(?:that|a|an)/gi
    ];
    
    insightPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        insights.push(...matches.slice(0, 3).map((m: string) => m.trim())); // Limit to 3 per pattern
      }
    });
  }
  
  return insights.slice(0, 5); // Top 5 insights
}

function generateRecommendations(portfolioData: any) {
  const recommendations = [];
  
  // Simple rule-based recommendations
  // In a real system, this would be more sophisticated
  
  if (portfolioData.length > 10) {
    recommendations.push({
      type: 'diversification',
      priority: 'medium',
      description: 'Consider portfolio concentration risk with large number of holdings'
    });
  }
  
  // Check for companies without recent KPIs
  const companiesWithoutRecentKPIs = portfolioData.filter((p: any) => 
    !p.kpis || p.kpis.length === 0
  );
  
  if (companiesWithoutRecentKPIs.length > 0) {
    recommendations.push({
      type: 'data_quality',
      priority: 'high',
      description: `${companiesWithoutRecentKPIs.length} companies missing recent KPI data - consider updating reporting`
    });
  }
  
  return recommendations;
}

// GET endpoint for portfolio summary
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get portfolio summary
    const portfolioSummary = await prisma.portfolio.groupBy({
      by: ['sector'],
      _count: {
        id: true
      },
      _avg: {
        investment: true
      }
    });

    const totalPortfolios = await prisma.portfolio.count();
    
    return NextResponse.json({
      success: true,
      data: {
        totalPortfolios,
        sectorBreakdown: portfolioSummary,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Portfolio Summary Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio summary' },
      { status: 500 }
    );
  }
}
