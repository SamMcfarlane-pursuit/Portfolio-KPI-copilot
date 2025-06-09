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

    // Configuration validation
    const validation = {
      environment_variables: {
        status: envCheck.GOOGLE_CLIENT_ID && envCheck.GOOGLE_CLIENT_SECRET ? 'PASS' : 'FAIL',
        details: {
          google_client_id: envCheck.GOOGLE_CLIENT_ID ? 'CONFIGURED' : 'MISSING',
          google_client_secret: envCheck.GOOGLE_CLIENT_SECRET ? 'CONFIGURED' : 'MISSING',
          nextauth_url: envCheck.NEXTAUTH_URL ? 'CONFIGURED' : 'MISSING',
          nextauth_secret: envCheck.NEXTAUTH_SECRET ? 'CONFIGURED' : 'MISSING',
        }
      },
      oauth_configuration: {
        status: 'READY',
        redirect_uri_correct: oauthUrls.google_callback === `${baseUrl}/api/auth/callback/google`,
        domain_matches: baseUrl.includes('portfolio-kpi-copilot.vercel.app'),
      },
      session_status: {
        authenticated: !!session,
        user_info: session ? {
          email: session.user?.email,
          name: session.user?.name,
          provider: 'Available after first login'
        } : null
      }
    }

    // Next steps based on current status
    const nextSteps = []
    if (!envCheck.GOOGLE_CLIENT_ID || !envCheck.GOOGLE_CLIENT_SECRET) {
      nextSteps.push('❌ Configure Google OAuth credentials in Vercel environment variables')
    } else {
      nextSteps.push('✅ Environment variables are properly configured')
    }

    if (!session) {
      nextSteps.push('🔧 Test Google OAuth by visiting /auth/signin')
      nextSteps.push('📋 If OAuth fails, check Google Console configuration')
      nextSteps.push('🚀 Most likely fix: Publish OAuth app or add test users in Google Console')
    } else {
      nextSteps.push('🎉 OAuth is working! User is successfully authenticated')
    }

    return NextResponse.json({
      status: 'OAuth Configuration Test - Enhanced',
      timestamp: new Date().toISOString(),
      overall_status: validation.environment_variables.status === 'PASS' ?
        (session ? 'FULLY_WORKING' : 'READY_FOR_TESTING') : 'NEEDS_CONFIGURATION',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        ...envCheck,
      },
      validation,
      session: session ? {
        user: session.user,
        expires: session.expires,
      } : null,
      oauth_urls: oauthUrls,
      google_config: googleConfig,
      next_steps: nextSteps,
      google_console_requirements: {
        redirect_uri: oauthUrls.google_callback,
        authorized_domains: ['portfolio-kpi-copilot.vercel.app', 'vercel.app'],
        required_scopes: ['openid', 'profile', 'email'],
        publishing_status: 'Must be PUBLISHED or user added to TEST USERS'
      },
      quick_links: {
        google_console: 'https://console.cloud.google.com/',
        test_signin: `${baseUrl}/auth/signin`,
        setup_guide: `${baseUrl}/setup/oauth`,
        oauth_consent_screen: 'https://console.cloud.google.com/apis/credentials/consent'
      }
    })
  } catch (error) {
    console.error('OAuth test error:', error)
    return NextResponse.json({
      error: 'OAuth configuration test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      next_steps: [
        'Check server logs for detailed error information',
        'Verify all environment variables are set correctly',
        'Ensure NextAuth configuration is valid'
      ]
    }, { status: 500 })
  }
}
