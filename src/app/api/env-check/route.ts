import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const useSupabasePrimary = process.env.USE_SUPABASE_PRIMARY
    const fallbackToSqlite = process.env.FALLBACK_TO_SQLITE
    
    return NextResponse.json({
      success: true,
      environment: {
        databaseUrl: databaseUrl ? databaseUrl.substring(0, 50) + '...' : 'NOT_SET',
        databaseType: databaseUrl?.startsWith('postgresql') ? 'PostgreSQL' : 
                     databaseUrl?.startsWith('file:') ? 'SQLite' : 'Unknown',
        supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'NOT_SET',
        useSupabasePrimary,
        fallbackToSqlite,
        nodeEnv: process.env.NODE_ENV,
        vercelUrl: process.env.VERCEL_URL,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
