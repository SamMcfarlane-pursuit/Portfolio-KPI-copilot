import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * Direct Supabase Health Check
 * Bypasses Prisma entirely and tests Supabase connection directly
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Test direct Supabase connection
    const client = supabaseServer.getClient()
    
    if (!client) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase client not configured',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Test basic query
    const { data, error } = await client
      .from('organizations')
      .select('id')
      .limit(1)

    const responseTime = Date.now() - startTime

    if (error && !error.message.includes('does not exist')) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase query failed',
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Success - either got data or table doesn't exist yet (which is fine)
    return NextResponse.json({
      status: 'healthy',
      message: 'Supabase connection successful',
      responseTime,
      dataCount: data?.length || 0,
      tableExists: !error,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'not_configured'
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Supabase health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}
