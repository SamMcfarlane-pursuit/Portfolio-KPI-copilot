import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    }

    // Get current session
    const session = await getServerSession(authOptions)

    // Check OAuth URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'https://portfolio-kpi-copilot.vercel.app'
    const oauthUrls = {
      google_callback: `${baseUrl}/api/auth/callback/google`,
      signin: `${baseUrl}/api/auth/signin`,
      providers: `${baseUrl}/api/auth/providers`,
      session: `${baseUrl}/api/auth/session`,
    }

    // Test Google OAuth configuration
    const googleConfig = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: oauthUrls.google_callback,
      scope: 'openid profile email',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    }

    return NextResponse.json({
      status: 'OAuth Configuration Test',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        ...envCheck,
      },
      session: session ? {
        user: session.user,
        expires: session.expires,
      } : null,
      oauth_urls: oauthUrls,
      google_config: googleConfig,
      recommendations: [
        'Ensure Google OAuth app has the correct redirect URI configured',
        'Verify that the Google OAuth app is not in testing mode (if using production)',
        'Check that the domain is verified in Google Console',
        'Ensure OAuth consent screen is properly configured',
      ],
    })
  } catch (error) {
    console.error('OAuth test error:', error)
    return NextResponse.json({
      error: 'OAuth configuration test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
