import { NextRequest, NextResponse } from 'next/server'
import { getPortfolios, createPortfolio, updatePortfolio, deletePortfolio } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const { data: portfolios, error } = await getPortfolios(userId || undefined)

    if (error) {
      console.error('Error fetching portfolios:', error)
      return NextResponse.json(
        { error: 'Failed to fetch portfolios' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      portfolios,
      count: portfolios.length
    })

  } catch (error) {
    console.error('Portfolios GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const portfolioData = await request.json()

    // Validate required fields
    if (!portfolioData.name) {
      return NextResponse.json(
        { error: 'Portfolio name is required' },
        { status: 400 }
      )
    }

    // Add timestamp
    const portfolioWithTimestamp = {
      ...portfolioData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: portfolio, error } = await createPortfolio(portfolioWithTimestamp)

    if (error) {
      console.error('Error creating portfolio:', error)
      return NextResponse.json(
        { error: 'Failed to create portfolio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      portfolio,
      message: 'Portfolio created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Portfolios POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    const updates = await request.json()

    // Add updated timestamp
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: portfolio, error } = await updatePortfolio(id, updatesWithTimestamp)

    if (error) {
      console.error('Error updating portfolio:', error)
      return NextResponse.json(
        { error: 'Failed to update portfolio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      portfolio,
      message: 'Portfolio updated successfully'
    })

  } catch (error) {
    console.error('Portfolios PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    const { error } = await deletePortfolio(id)

    if (error) {
      console.error('Error deleting portfolio:', error)
      return NextResponse.json(
        { error: 'Failed to delete portfolio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Portfolio deleted successfully'
    })

  } catch (error) {
    console.error('Portfolios DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
