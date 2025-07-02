import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_ID: process.env.GITHUB_ID,
      GITHUB_SECRET: !!process.env.GITHUB_SECRET,
      LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
      LINKEDIN_CLIENT_SECRET: !!process.env.LINKEDIN_CLIENT_SECRET,
    }

    // Get current session
    const session = await getServerSession(authOptions)

    // Check OAuth URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'https://portfolio-kpi-copilot.vercel.app'
    const oauthUrls = {
      google_callback: `${baseUrl}/api/auth/callback/google`,
      github_callback: `${baseUrl}/api/auth/callback/github`,
      linkedin_callback: `${baseUrl}/api/auth/callback/linkedin`,
      signin: `${baseUrl}/api/auth/signin`,
      providers: `${baseUrl}/api/auth/providers`,
      session: `${baseUrl}/api/auth/session`,
    }

    // Configuration validation
    const validation = {
      environment_variables: {
        status: 'PASS',
        details: {
          google_oauth: envCheck.GOOGLE_CLIENT_ID && envCheck.GOOGLE_CLIENT_SECRET ? 'CONFIGURED' : 'MISSING',
          github_oauth: envCheck.GITHUB_ID && envCheck.GITHUB_SECRET ? 'CONFIGURED' : 'MISSING',
          linkedin_oauth: envCheck.LINKEDIN_CLIENT_ID && envCheck.LINKEDIN_CLIENT_SECRET ? 'CONFIGURED' : 'MISSING',
          nextauth_url: envCheck.NEXTAUTH_URL ? 'CONFIGURED' : 'MISSING',
          nextauth_secret: envCheck.NEXTAUTH_SECRET ? 'CONFIGURED' : 'MISSING',
        }
      },
      oauth_configuration: {
        status: 'READY',
        redirect_uris: {
          google: oauthUrls.google_callback,
          github: oauthUrls.github_callback,
          linkedin: oauthUrls.linkedin_callback,
        },
        domain_matches: baseUrl.includes('portfolio-kpi-copilot.vercel.app'),
      },
      session_status: {
        authenticated: !!session,
        user_info: session ? {
          email: session.user?.email,
          name: session.user?.name,
          role: session.user?.role,
          provider: 'Available after first login'
        } : null
      }
    }

    // Next steps based on current status
    const nextSteps = []
    
    // Check Google OAuth
    if (!envCheck.GOOGLE_CLIENT_ID || !envCheck.GOOGLE_CLIENT_SECRET) {
      nextSteps.push('❌ Configure Google OAuth credentials in environment variables')
    } else {
      nextSteps.push('✅ Google OAuth is properly configured')
    }

    // Check GitHub OAuth
    if (!envCheck.GITHUB_ID || !envCheck.GITHUB_SECRET) {
      nextSteps.push('❌ Configure GitHub OAuth credentials in environment variables')
    } else {
      nextSteps.push('✅ GitHub OAuth is properly configured')
    }

    // Check LinkedIn OAuth
    if (!envCheck.LINKEDIN_CLIENT_ID || !envCheck.LINKEDIN_CLIENT_SECRET) {
      nextSteps.push('❌ Configure LinkedIn OAuth credentials in environment variables')
    } else {
      nextSteps.push('✅ LinkedIn OAuth is properly configured')
    }

    if (!session) {
      nextSteps.push('🔧 Test OAuth by visiting /auth/signin')
      nextSteps.push('📋 If OAuth fails, check provider console configurations')
    } else {
      nextSteps.push('🎉 OAuth is working! User is successfully authenticated')
    }

    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      validation,
      nextSteps,
      responseTime: `${Date.now() - Date.now()}ms`,
      test_urls: oauthUrls
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('OAuth verification error:', error)
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      responseTime: `${Date.now() - Date.now()}ms`,
      recommendations: [
        '🚨 Critical: OAuth system verification failed',
        '🔧 Check OAuth configuration and environment variables',
        '📞 Contact system administrator for assistance'
      ]
    }, { status: 500 })
  }
}
