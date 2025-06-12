import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all environment variables related to database
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      USE_SUPABASE_PRIMARY: process.env.USE_SUPABASE_PRIMARY,
      FALLBACK_TO_SQLITE: process.env.FALLBACK_TO_SQLITE,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET'
    }

    // Determine database type
    const databaseType = envVars.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 
                        envVars.DATABASE_URL?.startsWith('file:') ? 'SQLite' : 'Unknown'

    // Show first 100 characters of DATABASE_URL for debugging
    const databaseUrlPreview = envVars.DATABASE_URL ? 
      envVars.DATABASE_URL.substring(0, 100) + (envVars.DATABASE_URL.length > 100 ? '...' : '') : 
      'NOT_SET'

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envVars,
      analysis: {
        databaseType,
        databaseUrlPreview,
        isProduction: envVars.NODE_ENV === 'production',
        isVercel: !!envVars.VERCEL_URL,
        hasSupabaseConfig: !!(envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.SUPABASE_SERVICE_ROLE_KEY)
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
