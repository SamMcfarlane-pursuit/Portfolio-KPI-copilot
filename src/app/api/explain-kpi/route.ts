// src/app/api/explain-kpi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kpiExplanationChain, extractKPIContext, suggestFollowUpQuestions } from '@/lib/langchainClient';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Request validation schema
const ExplainKPISchema = z.object({
  question: z.string().min(1).max(500),
  userRole: z.enum(['executive', 'portfolio_manager', 'analyst', 'operations']).optional(),
  portfolioContext: z.string().optional(),
  timePeriod: z.string().optional(),
  includeFormula: z.boolean().optional(),
  includeExamples: z.boolean().optional()
});

// Rate limiting (simple in-memory store for MVP)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

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

    // Rate limiting
    if (!checkRateLimit(session.user.email)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ExplainKPISchema.parse(body);

    // Extract user context and preferences
    const userRole = validatedData.userRole || 'analyst'; // Default role
    const question = validatedData.question.trim();

    // Get portfolio context if not provided
    let portfolioContext = validatedData.portfolioContext;
    if (!portfolioContext) {
      try {
        // Fetch user's portfolio data for context
        const portfolioData = await prisma.portfolio.findMany({
          take: 5, // Limit for performance
          include: {
            fund: true,
            kpis: {
              take: 10,
              orderBy: { period: 'desc' }
            }
          }
        });

        portfolioContext = await extractKPIContext(portfolioData);
      } catch (error) {
        console.warn('Could not fetch portfolio context:', error);
        portfolioContext = 'General portfolio management context';
      }
    }

    // Log the query for analytics (optional - skip if table doesn't exist)
    try {
      // Check if we have a queries table to log to
      await prisma.query.create({
        data: {
          userId: session.user.id,
          question,
          context: JSON.stringify({
            userRole,
            userEmail: session.user.email,
            portfolioContext
          }),
          status: 'COMPLETED'
        }
      });
    } catch (error) {
      console.warn('Could not log query (table may not exist):', error);
      // Continue processing even if logging fails
    }

    // Call LangChain to generate explanation
    const startTime = Date.now();
    const result = await kpiExplanationChain.explainKPI({
      question,
      userRole,
      portfolioContext,
      timePeriod: validatedData.timePeriod
    });

    const responseTime = Date.now() - startTime;

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to generate explanation',
          details: result.error,
          fallback: result.fallback
        },
        { status: 500 }
      );
    }

    // Generate follow-up suggestions
    const followUpQuestions = suggestFollowUpQuestions(question, userRole);

    // Prepare response
    const response = {
      success: true,
      data: {
        explanation: result.data,
        followUpQuestions,
        metadata: {
          ...result.metadata,
          responseTime: `${responseTime}ms`,
          userRole,
          portfolioContext: portfolioContext.substring(0, 100) + '...' // Truncate for response
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Explain KPI API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Please try again later'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query history for the user
    const queries = await prisma.query.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Last 10 queries
    });

    return NextResponse.json({
      success: true,
      data: {
        recentQueries: queries.map(q => ({
          question: q.question,
          context: q.context ? JSON.parse(q.context) : null,
          timestamp: q.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get KPI queries error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch query history' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
