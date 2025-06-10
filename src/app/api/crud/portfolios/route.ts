/**
 * Portfolio CRUD API Routes
 * Handles Create, Read, Update, Delete operations for portfolios
 */

import { NextRequest, NextResponse } from 'next/server'
import { crudService, portfolioSchema } from '@/lib/services/crud-service'
import { rateLimiter } from '@/lib/middleware/rate-limiter'
import { z } from 'zod'

// GET /api/crud/portfolios - List all portfolios or get specific portfolio
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit(request, 'crud-read', 100, 60000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const filters = {
      name: searchParams.get('name'),
      isActive: searchParams.get('isActive') === 'true',
      createdBy: searchParams.get('createdBy')
    }

    // Remove null values from filters
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== null)
    )

    const result = await crudService.read('portfolio', id || undefined, cleanFilters, request)

    if (id && !result) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Portfolio GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch portfolios',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/crud/portfolios - Create new portfolio
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit(request, 'crud-create', 20, 60000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const result = await crudService.create('portfolio', body, portfolioSchema, request)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Portfolio created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })
  } catch (error) {
    console.error('Portfolio POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/crud/portfolios - Update portfolio
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit(request, 'crud-update', 30, 60000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const result = await crudService.update('portfolio', id, body, portfolioSchema, request)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Portfolio updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Portfolio PUT error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/crud/portfolios - Delete portfolio
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit(request, 'crud-delete', 10, 60000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const hardDelete = searchParams.get('hardDelete') === 'true'
    const backup = searchParams.get('backup') !== 'false' // Default to true

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    // Create backup before deletion if requested
    let backupData = null
    if (backup) {
      try {
        backupData = await crudService.backupBeforeDelete('portfolio', id)
      } catch (backupError) {
        console.warn('Failed to create backup:', backupError)
        // Continue with deletion even if backup fails
      }
    }

    const result = await crudService.delete('portfolio', id, hardDelete, request)

    return NextResponse.json({
      success: true,
      data: { deleted: result, backup: backupData ? 'created' : 'skipped' },
      message: hardDelete ? 'Portfolio permanently deleted' : 'Portfolio deactivated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Portfolio DELETE error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PATCH /api/crud/portfolios - Bulk operations
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit(request, 'crud-bulk', 5, 60000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { operation, data } = body

    if (!operation || !data) {
      return NextResponse.json(
        { error: 'Operation and data are required' },
        { status: 400 }
      )
    }

    let result: any

    switch (operation) {
      case 'bulkCreate':
        result = await crudService.bulkCreate('portfolio', data, portfolioSchema, request)
        break
      case 'bulkUpdate':
        result = await crudService.bulkUpdate('portfolio', data, portfolioSchema, request)
        break
      case 'bulkDelete':
        const { ids, hardDelete = false } = data
        result = await crudService.bulkDelete('portfolio', ids, hardDelete, request)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid bulk operation' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk ${operation} completed`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Portfolio PATCH error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
