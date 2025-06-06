import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createChatCompletion, SYSTEM_PROMPTS } from '@/lib/openai'
import { searchSimilarDocuments } from '@/lib/pinecone'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  try {
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, organizationId, context } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user's organization access
    const userOrg = await prisma.organizationUser.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organizationId || undefined,
      },
      include: {
        organization: true,
      },
    })

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const startTime = Date.now()

    // Search for relevant documents using RAG
    const relevantDocs = await searchSimilarDocuments({
      query: message,
      organizationId: userOrg.organizationId,
      topK: 5,
    })

    // Get recent KPIs for context
    const recentKPIs = await prisma.kPI.findMany({
      where: {
        organizationId: userOrg.organizationId,
      },
      orderBy: {
        period: 'desc',
      },
      take: 20,
      include: {
        fund: true,
        portfolio: true,
      },
    })

    // Get fund and portfolio summaries
    const funds = await prisma.fund.findMany({
      where: {
        organizationId: userOrg.organizationId,
      },
      include: {
        portfolios: {
          include: {
            kpis: {
              orderBy: { period: 'desc' },
              take: 3,
            },
          },
        },
        kpis: {
          orderBy: { period: 'desc' },
          take: 5,
        },
      },
    })

    // Build context for the AI
    const contextData = {
      documents: relevantDocs.map(doc => ({
        title: doc.metadata.title,
        content: doc.metadata.content.substring(0, 1000), // Truncate for token limits
        type: doc.metadata.fileType,
      })),
      kpis: recentKPIs.map(kpi => ({
        name: kpi.name,
        value: kpi.value.toString(),
        category: kpi.category,
        period: kpi.period.toISOString(),
        fund: kpi.fund?.name,
        portfolio: kpi.portfolio?.name,
      })),
      organization: userOrg.organization.name,
    }

    // Create AI response
    const aiResponse = await createChatCompletion({
      messages: [
        {
          role: 'user',
          content: `Context: ${JSON.stringify(contextData, null, 2)}\n\nUser Question: ${message}`,
        },
      ],
      systemPrompt: SYSTEM_PROMPTS.KPI_ANALYSIS,
      temperature: 0.1,
      maxTokens: 2000,
    })

    const processingTime = Date.now() - startTime

    // Save query to database for audit and learning
    const savedQuery = await prisma.query.create({
      data: {
        userId: session.user.id,
        organizationId: userOrg.organizationId,
        question: message,
        response: aiResponse.content,
        context: JSON.stringify(contextData),
        sources: relevantDocs.map(doc => doc.id).join(','),
        status: 'COMPLETED',
        processingTime,
        tokens: aiResponse.usage?.total_tokens,
      },
    })

    // Log the interaction for audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CHAT_QUERY',
        resource: 'AI_ASSISTANT',
        resourceId: savedQuery.id,
        details: JSON.stringify({
          question: message,
          processingTime,
          tokensUsed: aiResponse.usage?.total_tokens,
          sourcesFound: relevantDocs.length,
        }),
      },
    })

    return NextResponse.json({
      response: aiResponse.content,
      sources: relevantDocs.map(doc => ({
        id: doc.id,
        title: doc.metadata.title,
        type: doc.metadata.fileType,
        score: doc.score,
      })),
      processingTime,
      queryId: savedQuery.id,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Log error for monitoring
    if (session?.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CHAT_ERROR',
          resource: 'AI_ASSISTANT',
          details: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }),
        },
      }).catch(console.error)
    }

    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get user's queries
    const queries = await prisma.query.findMany({
      where: {
        userId: session.user.id,
        organizationId: organizationId || undefined,
        status: 'COMPLETED',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        question: true,
        response: true,
        sources: true,
        processingTime: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      queries,
      hasMore: queries.length === limit,
    })

  } catch (error) {
    console.error('Chat history API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve chat history' },
      { status: 500 }
    )
  }
}
