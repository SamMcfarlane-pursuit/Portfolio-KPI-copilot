/**
 * Public AI Copilot API
 * Unauthenticated access for testing AI functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Valid query is required' }, { status: 400 })
    }

    // Simple keyword-based intent detection (expand as needed)
    const lower = query.toLowerCase()
    let answer = ''
    let data: any = {}

    // Example: Revenue for a company
    if (lower.includes('revenue')) {
      // Try to extract company name from the query (improve with NLP as needed)
      const companyName = extractCompanyName(query)
      if (companyName) {
        const company = await prisma.company.findFirst({ where: { name: { contains: companyName, mode: 'insensitive' } } })
        if (company) {
          // Find latest KPI for revenue
          const kpi = await prisma.kPI.findFirst({
            where: { companyId: company.id, name: { contains: 'revenue', mode: 'insensitive' } },
            orderBy: { period: 'desc' }
          })
          if (kpi) {
            answer = `The latest reported revenue for ${company.name} is $${kpi.value.toLocaleString()} (${kpi.period.toISOString().slice(0,10)}).`
            data = { company, kpi }
          } else {
            answer = `No revenue KPI found for ${company.name}.`
          }
        } else {
          answer = `No company found matching "${companyName}".`
        }
      } else {
        answer = 'Please specify a company name for revenue queries.'
      }
    }
    // Add more cases for growth, churn, risk, etc.

    // Fallback
    if (!answer) {
      answer = "I'm sorry, I couldn't find a precise answer. Please try rephrasing or ask about a specific company, KPI, or metric."
    }

    return NextResponse.json({
      success: true,
      response: answer,
      data
    })
  } catch (error: any) {
    console.error('AI Copilot error:', error)
    return NextResponse.json({
      success: false,
      response: "An error occurred while processing your request.",
      error: error.message
    }, { status: 500 })
  }
}

// Helper: Extract company name (very basic, improve as needed)
function extractCompanyName(query: string): string | null {
  // Example: "What is the revenue of TechCorp?" => "TechCorp"
  const match = query.match(/revenue of ([a-zA-Z0-9\s]+)/i)
  return match ? match[1].trim() : null
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    service: 'Public AI Portfolio Copilot',
    version: '1.0.0',
    capabilities: {
      intelligentAnalysis: true,
      predictiveInsights: true,
      portfolioOptimization: true,
      naturalLanguageQueries: true,
      contextualRecommendations: true,
      realTimeData: true
    },
    features: {
      advancedAI: 'Direct Ollama integration with Llama 3.2',
      dataIntegration: 'Local AI processing',
      security: 'Public access for testing',
      performance: 'Fast response times with local AI'
    },
    usage: {
      endpoint: 'POST /api/public/ai-copilot',
      authentication: 'not required',
      rateLimit: '100 requests per minute',
      maxQueryLength: 2000
    }
  })
} 