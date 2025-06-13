import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * Direct Supabase Test Endpoint
 * Tests Supabase connection without any Prisma interference
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Get Supabase client
    const client = supabaseServer.getClient()
    
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Supabase client not configured',
        details: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET'
        },
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Test basic query - try organizations table
    const { data: orgData, error: orgError } = await client
      .from('organizations')
      .select('id, name')
      .limit(5)

    const responseTime = Date.now() - startTime

    // Test another table - try profiles
    const { data: profileData, error: profileError } = await client
      .from('profiles')
      .select('id, email')
      .limit(5)

    // Test portfolios table
    const { data: portfolioData, error: portfolioError } = await client
      .from('portfolios')
      .select('id, name')
      .limit(5)

    return NextResponse.json({
      success: true,
      message: 'Supabase connection test completed',
      responseTime,
      results: {
        organizations: {
          success: !orgError || orgError.message.includes('does not exist'),
          data: orgData || [],
          error: orgError?.message || null,
          count: orgData?.length || 0
        },
        profiles: {
          success: !profileError || profileError.message.includes('does not exist'),
          data: profileData || [],
          error: profileError?.message || null,
          count: profileData?.length || 0
        },
        portfolios: {
          success: !portfolioError || portfolioError.message.includes('does not exist'),
          data: portfolioData || [],
          error: portfolioError?.message || null,
          count: portfolioData?.length || 0
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Supabase test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}
