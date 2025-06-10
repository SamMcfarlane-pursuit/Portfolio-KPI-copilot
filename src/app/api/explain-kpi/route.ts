import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { question, userRole = 'portfolio_manager', includeExamples = true } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Question is required'
      }, { status: 400 });
    }

    // Generate KPI explanation based on question
    const explanation = await generateKPIExplanation(question, userRole, includeExamples);

    return NextResponse.json({
      success: true,
      data: {
        explanation,
        question,
        userRole,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('KPI explanation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate KPI explanation'
    }, { status: 500 });
  }
}

async function generateKPIExplanation(question: string, userRole: string, includeExamples: boolean) {
  const lowerQuestion = question.toLowerCase();
  
  // Portfolio performance related questions
  if (lowerQuestion.includes('performance') || lowerQuestion.includes('growth') || lowerQuestion.includes('return')) {
    return {
      explanation: `Portfolio performance analysis shows how your investments are performing over time. Key metrics include total return, sector-wise growth, and risk-adjusted returns. Current data indicates strong performance in technology and healthcare sectors with balanced risk distribution.`,
      keyMetrics: ['Total Return', 'Sector Growth', 'Risk-Adjusted Return', 'Volatility'],
      recommendations: [
        'Monitor quarterly performance trends',
        'Rebalance portfolio based on sector performance',
        'Consider risk tolerance in investment decisions'
      ],
      examples: includeExamples ? [
        'Technology sector: +15% quarterly growth',
        'Healthcare sector: +8% steady growth',
        'Overall portfolio: +12.5% performance'
      ] : []
    };
  }

  // Risk analysis questions
  if (lowerQuestion.includes('risk') || lowerQuestion.includes('volatility') || lowerQuestion.includes('exposure')) {
    return {
      explanation: `Risk analysis evaluates potential downside and volatility in your portfolio. This includes sector concentration risk, market exposure, and individual company risk factors. Your portfolio shows moderate risk with good diversification across sectors.`,
      keyMetrics: ['Beta', 'Standard Deviation', 'Sector Concentration', 'Correlation'],
      recommendations: [
        'Maintain diversification across sectors',
        'Monitor individual company risk factors',
        'Consider hedging strategies for high-risk positions'
      ],
      examples: includeExamples ? [
        'Technology sector: 35% allocation (moderate concentration)',
        'Healthcare sector: 25% allocation (balanced)',
        'Overall portfolio beta: 1.2 (moderate risk)'
      ] : []
    };
  }

  // Valuation questions
  if (lowerQuestion.includes('valuation') || lowerQuestion.includes('value') || lowerQuestion.includes('worth')) {
    return {
      explanation: `Portfolio valuation represents the current market value of your investments. This includes individual company valuations, sector-wise breakdown, and total portfolio worth. Valuations are updated based on latest market data and company performance.`,
      keyMetrics: ['Market Value', 'Book Value', 'P/E Ratio', 'Enterprise Value'],
      recommendations: [
        'Review valuations quarterly',
        'Compare with industry benchmarks',
        'Consider rebalancing overvalued positions'
      ],
      examples: includeExamples ? [
        'Total portfolio value: $2,847,392',
        'Average company valuation: $237,283',
        'Technology sector average: $450,000'
      ] : []
    };
  }

  // Sector analysis questions
  if (lowerQuestion.includes('sector') || lowerQuestion.includes('industry') || lowerQuestion.includes('diversification')) {
    return {
      explanation: `Sector analysis examines how your portfolio is distributed across different industries. This helps identify concentration risks and diversification opportunities. Your portfolio spans technology, healthcare, finance, and energy sectors with balanced allocation.`,
      keyMetrics: ['Sector Allocation', 'Industry Concentration', 'Correlation Matrix', 'Sector Performance'],
      recommendations: [
        'Maintain balanced sector allocation',
        'Monitor sector-specific trends',
        'Consider emerging sector opportunities'
      ],
      examples: includeExamples ? [
        'Technology: 5 companies (42% allocation)',
        'Healthcare: 3 companies (25% allocation)',
        'Finance: 2 companies (17% allocation)',
        'Energy: 2 companies (16% allocation)'
      ] : []
    };
  }

  // Default general explanation
  return {
    explanation: `Your question relates to portfolio KPI analysis. Portfolio KPIs help track investment performance, risk exposure, and strategic alignment. Key areas include performance metrics, risk analysis, valuation tracking, and sector diversification.`,
    keyMetrics: ['Performance', 'Risk', 'Valuation', 'Diversification'],
    recommendations: [
      'Regular portfolio review and rebalancing',
      'Monitor key performance indicators',
      'Maintain strategic asset allocation'
    ],
    examples: includeExamples ? [
      'Quarterly performance review',
      'Risk-adjusted return analysis',
      'Sector allocation optimization'
    ] : []
  };
}
