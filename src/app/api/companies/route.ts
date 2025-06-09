import { NextRequest, NextResponse } from 'next/server'
import { hybridData } from '@/lib/data/hybrid-data-layer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Enhanced Company API with Smart Data Handling
 * Supports both real and mock data with intelligent validation
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    const { name, sector, investment, organizationId } = body
    if (!name || !sector || !investment || !organizationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, sector, investment, organizationId' 
        },
        { status: 400 }
      )
    }

    // Create company using hybrid data layer
    const result = await hybridData.createCompany({
      name: body.name,
      sector: body.sector,
      geography: body.geography || 'North America',
      description: body.description,
      investment: parseFloat(body.investment),
      organizationId: body.organizationId,
      userId: session.user.id
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: `Company "${body.name}" created successfully with enhanced data`
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Company creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 }
      )
    }

    // Get company data using hybrid data layer
    const companies = await hybridData.getPortfolios({ organizationId })

    return NextResponse.json({
      success: true,
      data: companies,
      count: companies.data?.length || 0
    })

  } catch (error) {
    console.error('Company retrieval error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
