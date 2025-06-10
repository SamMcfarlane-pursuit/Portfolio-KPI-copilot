/**
 * Company CRUD API Routes
 * Handles Create, Read, Update, Delete operations for companies
 */

import { NextRequest, NextResponse } from 'next/server'
import { crudService, companySchema } from '@/lib/services/crud-service'
import { rateLimiter, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limiter'
import { z } from 'zod'

// GET /api/crud/companies - List all companies or get specific company
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request, RATE_LIMIT_CONFIGS.API_MODERATE)
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
      symbol: searchParams.get('symbol'),
      sector: searchParams.get('sector'),
      industry: searchParams.get('industry'),
      isActive: searchParams.get('isActive') === 'true',
      createdBy: searchParams.get('createdBy')
    }

    // Remove null values from filters
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== null)
    )

    const result = await crudService.read('company', id || undefined, cleanFilters, request)

    if (id && !result) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Company GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch companies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/crud/companies - Create new company
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request, RATE_LIMIT_CONFIGS.API_STRICT)
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

    const result = await crudService.create('company', body, companySchema, request)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Company created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })
  } catch (error) {
    console.error('Company POST error:', error)
    
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
        error: 'Failed to create company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/crud/companies - Update company
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request, RATE_LIMIT_CONFIGS.API_MODERATE)
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
        { error: 'Company ID is required' },
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

    const result = await crudService.update('company', id, body, companySchema, request)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Company updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Company PUT error:', error)
    
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
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/crud/companies - Delete company
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request, RATE_LIMIT_CONFIGS.API_STRICT)
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
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Create backup before deletion if requested
    let backupData = null
    if (backup) {
      try {
        backupData = await crudService.backupBeforeDelete('company', id)
      } catch (backupError) {
        console.warn('Failed to create backup:', backupError)
        // Continue with deletion even if backup fails
      }
    }

    const result = await crudService.delete('company', id, hardDelete, request)

    return NextResponse.json({
      success: true,
      data: { deleted: result, backup: backupData ? 'created' : 'skipped' },
      message: hardDelete ? 'Company permanently deleted' : 'Company deactivated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Company DELETE error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PATCH /api/crud/companies - Bulk operations
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(request, RATE_LIMIT_CONFIGS.API_STRICT)
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
        result = await crudService.bulkCreate('company', data, companySchema, request)
        break
      case 'bulkUpdate':
        result = await crudService.bulkUpdate('company', data, companySchema, request)
        break
      case 'bulkDelete':
        const { ids, hardDelete = false } = data
        result = await crudService.bulkDelete('company', ids, hardDelete, request)
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
    console.error('Company PATCH error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
