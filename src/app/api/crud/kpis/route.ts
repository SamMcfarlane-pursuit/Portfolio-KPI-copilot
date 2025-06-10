/**
 * KPI CRUD API Routes
 * Handles Create, Read, Update, Delete operations for KPIs
 */

import { NextRequest, NextResponse } from 'next/server'
import { crudService, kpiSchema } from '@/lib/services/crud-service'
import { rateLimiter } from '@/lib/middleware/rate-limiter'
import { z } from 'zod'

// GET /api/crud/kpis - List all KPIs or get specific KPI
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
      category: searchParams.get('category'),
      portfolioId: searchParams.get('portfolioId'),
      companyId: searchParams.get('companyId'),
      isActive: searchParams.get('isActive') === 'true',
      createdBy: searchParams.get('createdBy')
    }

    // Remove null values from filters
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== null)
    )

    const result = await crudService.read('kpi', id || undefined, cleanFilters, request)

    if (id && !result) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('KPI GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch KPIs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/crud/kpis - Create new KPI
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

    const result = await crudService.create('kpi', body, kpiSchema, request)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'KPI created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })
  } catch (error) {
    console.error('KPI POST error:', error)
    
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
        error: 'Failed to create KPI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/crud/kpis - Update KPI
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
        { error: 'KPI ID is required' },
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

    const result = await crudService.update('kpi', id, body, kpiSchema, request)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'KPI updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('KPI PUT error:', error)
    
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
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update KPI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/crud/kpis - Delete KPI
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
        { error: 'KPI ID is required' },
        { status: 400 }
      )
    }

    // Create backup before deletion if requested
    let backupData = null
    if (backup) {
      try {
        backupData = await crudService.backupBeforeDelete('kpi', id)
      } catch (backupError) {
        console.warn('Failed to create backup:', backupError)
        // Continue with deletion even if backup fails
      }
    }

    const result = await crudService.delete('kpi', id, hardDelete, request)

    return NextResponse.json({
      success: true,
      data: { deleted: result, backup: backupData ? 'created' : 'skipped' },
      message: hardDelete ? 'KPI permanently deleted' : 'KPI deactivated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('KPI DELETE error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete KPI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PATCH /api/crud/kpis - Bulk operations
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
        result = await crudService.bulkCreate('kpi', data, kpiSchema, request)
        break
      case 'bulkUpdate':
        result = await crudService.bulkUpdate('kpi', data, kpiSchema, request)
        break
      case 'bulkDelete':
        const { ids, hardDelete = false } = data
        result = await crudService.bulkDelete('kpi', ids, hardDelete, request)
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
    console.error('KPI PATCH error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
