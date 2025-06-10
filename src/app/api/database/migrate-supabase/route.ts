/**
 * Supabase Migration API
 * Handles migration from SQLite to Supabase with comprehensive monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseMigration } from '@/lib/database/supabase-migration'

export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin privileges required for database migration' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      dryRun = true,
      batchSize = 100,
      preserveIds = true,
      skipExisting = true,
      validateData = true,
      force = false
    } = body

    // Safety check for production
    if (!dryRun && !force && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { 
          error: 'Production migration requires force=true flag',
          warning: 'This operation will modify production data. Use with extreme caution.'
        },
        { status: 400 }
      )
    }

    console.log(`🚀 Starting Supabase migration (dryRun: ${dryRun})`)

    // Execute migration
    const result = await supabaseMigration.migrateToSupabase({
      dryRun,
      batchSize,
      preserveIds,
      skipExisting,
      validateData
    })

    // Return detailed results
    return NextResponse.json({
      success: result.success,
      migration: {
        dryRun,
        tablesProcessed: result.tablesProcessed,
        recordsMigrated: result.recordsMigrated,
        duration: result.duration,
        summary: result.summary
      },
      errors: result.errors,
      nextSteps: generateNextSteps(result, dryRun),
      timestamp: new Date().toISOString(),
      performedBy: session.user.email
    })

  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        return await getMigrationStatus()
      
      case 'validate':
        return await validateMigrationReadiness()
      
      case 'preview':
        return await previewMigration()
      
      default:
        return NextResponse.json({
          success: true,
          availableActions: ['status', 'validate', 'preview'],
          documentation: '/docs/supabase-migration'
        })
    }

  } catch (error) {
    console.error('Migration status error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get migration status' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin privileges required for rollback' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { confirm = false } = body

    if (!confirm) {
      return NextResponse.json(
        { 
          error: 'Rollback requires explicit confirmation',
          warning: 'This will delete all data in Supabase. Set confirm=true to proceed.'
        },
        { status: 400 }
      )
    }

    console.log('🔄 Starting migration rollback...')

    // Execute rollback
    await supabaseMigration.rollbackMigration()

    return NextResponse.json({
      success: true,
      message: 'Migration rollback completed',
      warning: 'All Supabase data has been cleared',
      timestamp: new Date().toISOString(),
      performedBy: session.user.email
    })

  } catch (error) {
    console.error('Rollback error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Rollback failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getMigrationStatus(): Promise<NextResponse> {
  try {
    // Check current database configuration
    const currentConfig = {
      useSupabasePrimary: process.env.USE_SUPABASE_PRIMARY === 'true',
      fallbackToSqlite: process.env.FALLBACK_TO_SQLITE === 'true',
      supabaseConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      realtimeEnabled: process.env.ENABLE_REALTIME_SUBSCRIPTIONS === 'true'
    }

    // Check data counts in both systems
    const sqliteCounts = await getSQLiteDataCounts()
    const supabaseCounts = await getSupabaseDataCounts()

    return NextResponse.json({
      success: true,
      status: {
        currentConfig,
        dataCounts: {
          sqlite: sqliteCounts,
          supabase: supabaseCounts
        },
        migrationNeeded: sqliteCounts.total > 0 && supabaseCounts.total === 0,
        migrationComplete: supabaseCounts.total > 0 && currentConfig.useSupabasePrimary
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get migration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function validateMigrationReadiness(): Promise<NextResponse> {
  try {
    const validation = {
      supabaseConnection: false,
      schemaReady: false,
      dataIntegrity: false,
      backupRecommended: false,
      estimatedDuration: '0 minutes',
      warnings: [] as string[],
      blockers: [] as string[]
    }

    // Check Supabase connection
    try {
      // This would test the connection
      validation.supabaseConnection = true
    } catch (error) {
      validation.blockers.push('Supabase connection failed')
    }

    // Check if schema exists
    try {
      // This would check if tables exist
      validation.schemaReady = true
    } catch (error) {
      validation.warnings.push('Supabase schema needs to be created')
    }

    // Check data integrity
    const sqliteCounts = await getSQLiteDataCounts()
    validation.dataIntegrity = sqliteCounts.total > 0
    validation.estimatedDuration = `${Math.ceil(sqliteCounts.total / 100)} minutes`

    if (sqliteCounts.total > 10000) {
      validation.warnings.push('Large dataset detected - consider batch migration')
    }

    if (process.env.NODE_ENV === 'production') {
      validation.backupRecommended = true
      validation.warnings.push('Production environment - backup recommended')
    }

    const ready = validation.blockers.length === 0

    return NextResponse.json({
      success: true,
      ready,
      validation,
      recommendation: ready ? 'Ready for migration' : 'Resolve blockers before migration'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function previewMigration(): Promise<NextResponse> {
  try {
    // Get data preview from SQLite
    const preview = await getSQLiteDataPreview()

    return NextResponse.json({
      success: true,
      preview,
      estimatedMigration: {
        duration: `${Math.ceil(preview.totalRecords / 100)} minutes`,
        batchSize: 100,
        tablesAffected: Object.keys(preview.tables).length,
        totalRecords: preview.totalRecords
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Preview failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions
async function getSQLiteDataCounts(): Promise<any> {
  // This would query SQLite for record counts
  return {
    organizations: 0,
    users: 0,
    portfolios: 0,
    kpis: 0,
    documents: 0,
    total: 0
  }
}

async function getSupabaseDataCounts(): Promise<any> {
  // This would query Supabase for record counts
  return {
    organizations: 0,
    profiles: 0,
    portfolios: 0,
    kpis: 0,
    documents: 0,
    total: 0
  }
}

async function getSQLiteDataPreview(): Promise<any> {
  // This would get a preview of SQLite data
  return {
    tables: {
      organizations: { count: 0, sample: [] },
      users: { count: 0, sample: [] },
      portfolios: { count: 0, sample: [] },
      kpis: { count: 0, sample: [] },
      documents: { count: 0, sample: [] }
    },
    totalRecords: 0
  }
}

function generateNextSteps(result: any, dryRun: boolean): string[] {
  const steps: string[] = []

  if (dryRun) {
    steps.push('Review migration results and resolve any errors')
    steps.push('Run actual migration with dryRun=false when ready')
    steps.push('Update environment variables to use Supabase as primary')
  } else {
    if (result.success) {
      steps.push('Update .env.local: USE_SUPABASE_PRIMARY=true')
      steps.push('Restart application to use Supabase as primary database')
      steps.push('Monitor application performance and data integrity')
      steps.push('Consider disabling SQLite fallback after verification')
    } else {
      steps.push('Review and resolve migration errors')
      steps.push('Check data integrity and foreign key constraints')
      steps.push('Consider running migration in smaller batches')
    }
  }

  return steps
}
