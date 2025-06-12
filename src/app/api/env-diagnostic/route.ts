import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get the actual DATABASE_URL being used
    const databaseUrl = process.env.DATABASE_URL
    
    // Determine database type
    const dbType = databaseUrl?.startsWith('postgresql') ? 'PostgreSQL' : 
                   databaseUrl?.startsWith('file:') ? 'SQLite' : 'Unknown'
    
    // Show first 100 characters for debugging
    const urlPreview = databaseUrl ? 
      databaseUrl.substring(0, 100) + (databaseUrl.length > 100 ? '...' : '') : 
      'NOT_SET'

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        VERCEL_ENV: process.env.VERCEL_ENV
      },
      database: {
        DATABASE_URL_SET: !!databaseUrl,
        DATABASE_URL_TYPE: dbType,
        DATABASE_URL_PREVIEW: urlPreview,
        DATABASE_URL_LENGTH: databaseUrl?.length || 0
      },
      supabase: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET'
      },
      flags: {
        USE_SUPABASE_PRIMARY: process.env.USE_SUPABASE_PRIMARY,
        FALLBACK_TO_SQLITE: process.env.FALLBACK_TO_SQLITE
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
