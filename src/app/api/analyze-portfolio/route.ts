import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow demo mode - return mock data if no session
    if (!session) {
      return NextResponse.json({
        success: true,
        data: {
          totalPortfolios: 12,
          sectorBreakdown: [
            { 
              sector: 'Technology', 
              _count: { id: 5 }, 
              _avg: { currentValuation: 450000 }
            },
            { 
              sector: 'Healthcare', 
              _count: { id: 3 }, 
              _avg: { currentValuation: 320000 }
            },
            { 
              sector: 'Finance', 
              _count: { id: 2 }, 
              _avg: { currentValuation: 280000 }
            },
            { 
              sector: 'Energy', 
              _count: { id: 2 }, 
              _avg: { currentValuation: 190000 }
            }
          ],
          insights: [
            "Technology sector shows strong 15% growth this quarter with AI companies leading performance",
            "Healthcare portfolio demonstrates resilient performance with 8% steady growth",
            "Energy sector presents opportunity for diversification with emerging clean tech investments",
            "Overall portfolio risk is well-balanced across sectors with moderate volatility"
          ],
          recommendations: [
            {
              type: "growth_opportunity",
              description: "Consider increasing allocation to AI and machine learning companies in technology sector",
              priority: "high"
            },
            {
              type: "risk_management", 
              description: "Monitor healthcare regulatory changes that may impact portfolio companies",
              priority: "medium"
            },
            {
              type: "diversification",
              description: "Explore renewable energy investments to balance traditional energy holdings",
              priority: "medium"
            }
          ]
        }
      });
    }

    // For authenticated users, fetch real data
    const client = supabaseServer.getClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 });
    }

    const { data: companies, error } = await client
      .from('companies')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch portfolio data'
      }, { status: 500 });
    }

    // Analyze real portfolio data
    const sectorBreakdown = analyzeSectorBreakdown(companies || []);
    const insights = generateInsights(companies || []);
    const recommendations = generateRecommendations(companies || []);

    return NextResponse.json({
      success: true,
      data: {
        totalPortfolios: companies?.length || 0,
        sectorBreakdown,
        insights,
        recommendations
      }
    });

  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { query, analysisType = 'performance' } = body;

    // Generate AI-powered insights based on query
    const insights = await generateAIInsights(query, analysisType, session?.user?.id);

    return NextResponse.json({
      success: true,
      data: {
        insights,
        recommendations: insights.recommendations || [],
        query,
        analysisType
      }
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate AI insights'
    }, { status: 500 });
  }
}

function analyzeSectorBreakdown(companies: any[]) {
  const sectorMap = new Map();
  
  companies.forEach(company => {
    const sector = company.sector || 'Unknown';
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, {
        sector,
        _count: { id: 0 },
        _avg: { currentValuation: 0 }
      });
    }
    
    const sectorData = sectorMap.get(sector);
    sectorData._count.id += 1;
    sectorData._avg.currentValuation += (company.current_valuation || 0);
  });

  // Calculate averages
  Array.from(sectorMap.values()).forEach(sector => {
    if (sector._count.id > 0) {
      sector._avg.currentValuation = sector._avg.currentValuation / sector._count.id;
    }
  });

  return Array.from(sectorMap.values());
}

function generateInsights(companies: any[]) {
  const insights = [];
  
  if (companies.length === 0) {
    return [
      "No portfolio companies found. Consider adding companies to start tracking performance.",
      "Portfolio analysis will be available once company data is added.",
      "Use the 'Manage Companies' feature to begin building your portfolio."
    ];
  }

  const totalValuation = companies.reduce((sum, c) => sum + (c.current_valuation || 0), 0);
  const avgValuation = totalValuation / companies.length;
  
  insights.push(`Portfolio contains ${companies.length} companies with average valuation of $${avgValuation.toLocaleString()}`);
  
  const sectorSet = new Set(companies.map(c => c.sector).filter(Boolean));
  const sectors = Array.from(sectorSet);
  if (sectors.length > 1) {
    insights.push(`Well-diversified portfolio across ${sectors.length} sectors: ${sectors.join(', ')}`);
  }

  const highValueCompanies = companies.filter(c => (c.current_valuation || 0) > avgValuation);
  if (highValueCompanies.length > 0) {
    insights.push(`${highValueCompanies.length} companies performing above portfolio average`);
  }

  return insights;
}

function generateRecommendations(companies: any[]) {
  const recommendations = [];
  
  if (companies.length < 5) {
    recommendations.push({
      type: "portfolio_growth",
      description: "Consider expanding portfolio to 5+ companies for better diversification",
      priority: "high"
    });
  }

  const sectorSet = new Set(companies.map(c => c.sector).filter(Boolean));
  const sectors = Array.from(sectorSet);
  if (sectors.length < 3) {
    recommendations.push({
      type: "diversification",
      description: "Increase sector diversification to reduce portfolio risk",
      priority: "medium"
    });
  }

  return recommendations;
}

async function generateAIInsights(query: string, analysisType: string, userId?: string) {
  // Simplified AI insights generation
  const baseInsights = [
    "Portfolio shows balanced risk-return profile across sectors",
    "Technology investments demonstrate strong growth potential",
    "Consider rebalancing allocation based on recent performance trends",
    "Market conditions favor current portfolio composition"
  ];

  return {
    insights: baseInsights,
    recommendations: [
      {
        type: "optimization",
        description: "Review quarterly performance metrics for portfolio optimization opportunities",
        priority: "medium"
      }
    ]
  };
}
