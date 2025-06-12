import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Test direct Supabase connection bypassing Prisma
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials',
        supabaseUrl: supabaseUrl ? 'SET' : 'NOT_SET',
        supabaseKey: supabaseKey ? 'SET' : 'NOT_SET'
      }, { status: 500 })
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Supabase query failed',
        details: error.message,
        supabaseUrl: supabaseUrl.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Direct Supabase connection successful',
      data: data,
      supabaseUrl: supabaseUrl.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
