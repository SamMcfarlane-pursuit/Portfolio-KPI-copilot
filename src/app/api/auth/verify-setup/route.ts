import { NextRequest, NextResponse } from 'next/server'
import { getProviders } from 'next-auth/react'
import { authOptions } from '@/lib/auth'
import { checkDatabaseConnection } from '@/lib/prisma'

/**
 * Authentication Setup Verification API
 * Checks all authentication providers and configurations
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database connection
    const dbHealth = await checkDatabaseConnection()
    
    // Check environment variables
    const envCheck = {
      nextauth_url: !!process.env.NEXTAUTH_URL,
      nextauth_secret: !!process.env.NEXTAUTH_SECRET,
      google_client_id: !!process.env.GOOGLE_CLIENT_ID,
      google_client_secret: !!process.env.GOOGLE_CLIENT_SECRET,
      github_id: !!process.env.GITHUB_ID,
      github_secret: !!process.env.GITHUB_SECRET,
      azure_ad_client_id: !!process.env.AZURE_AD_CLIENT_ID,
      azure_ad_client_secret: !!process.env.AZURE_AD_CLIENT_SECRET,
      azure_ad_tenant_id: !!process.env.AZURE_AD_TENANT_ID,
      linkedin_client_id: !!process.env.LINKEDIN_CLIENT_ID,
      linkedin_client_secret: !!process.env.LINKEDIN_CLIENT_SECRET,
      okta_client_id: !!process.env.OKTA_CLIENT_ID,
      okta_client_secret: !!process.env.OKTA_CLIENT_SECRET,
      okta_domain: !!process.env.OKTA_DOMAIN
    }

    // Check configured providers
    const configuredProviders = []
    
    // Google OAuth
    if (envCheck.google_client_id && envCheck.google_client_secret) {
      configuredProviders.push({
        id: 'google',
        name: 'Google',
        type: 'oauth',
        status: 'configured',
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      })
    }

    // GitHub OAuth
    if (envCheck.github_id && envCheck.github_secret) {
      configuredProviders.push({
        id: 'github',
        name: 'GitHub',
        type: 'oauth',
        status: 'configured',
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/github`
      })
    }

    // Azure AD
    if (envCheck.azure_ad_client_id && envCheck.azure_ad_client_secret && envCheck.azure_ad_tenant_id) {
      configuredProviders.push({
        id: 'azure-ad',
        name: 'Microsoft Azure AD',
        type: 'oauth',
        status: 'configured',
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`
      })
    }

    // LinkedIn
    if (envCheck.linkedin_client_id && envCheck.linkedin_client_secret) {
      configuredProviders.push({
        id: 'linkedin',
        name: 'LinkedIn',
        type: 'oauth',
        status: 'configured',
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/linkedin`
      })
    }

    // Okta
    if (envCheck.okta_client_id && envCheck.okta_client_secret && envCheck.okta_domain) {
      configuredProviders.push({
        id: 'okta',
        name: 'Okta',
        type: 'oauth',
        status: 'configured',
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/okta`
      })
    }

    // Credentials provider (always available)
    configuredProviders.push({
      id: 'credentials',
      name: 'Email & Password',
      type: 'credentials',
      status: 'configured',
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/credentials`
    })

    // Check NextAuth configuration
    const nextAuthConfig = {
      url: process.env.NEXTAUTH_URL,
      secret: !!process.env.NEXTAUTH_SECRET,
      adapter: 'prisma',
      session_strategy: 'jwt',
      pages: {
        signIn: '/auth/signin',
        error: '/auth/error'
      }
    }

    // Determine overall authentication health
    const criticalEnvVars = ['nextauth_url', 'nextauth_secret']
    const hasCriticalVars = criticalEnvVars.every(key => envCheck[key as keyof typeof envCheck])
    const hasOAuthProviders = configuredProviders.some(p => p.type === 'oauth')
    
    let authStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (hasCriticalVars && hasOAuthProviders && dbHealth.status === 'healthy') {
      authStatus = 'healthy'
    } else if (hasCriticalVars && dbHealth.status === 'healthy') {
      authStatus = 'degraded'
    } else {
      authStatus = 'unhealthy'
    }

    // Generate recommendations
    const recommendations = []
    
    if (!hasCriticalVars) {
      recommendations.push('🚨 Critical: Set NEXTAUTH_URL and NEXTAUTH_SECRET environment variables')
    }
    
    if (dbHealth.status !== 'healthy') {
      recommendations.push('🔧 Database: Fix database connection for user authentication')
    }
    
    if (!hasOAuthProviders) {
      recommendations.push('⚡ OAuth: Configure at least one OAuth provider (Google/GitHub recommended)')
    }
    
    if (!envCheck.google_client_id || !envCheck.google_client_secret) {
      recommendations.push('🔑 Google OAuth: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google sign-in')
    }
    
    if (!envCheck.github_id || !envCheck.github_secret) {
      recommendations.push('🔑 GitHub OAuth: Set GITHUB_ID and GITHUB_SECRET for GitHub sign-in')
    }

    if (authStatus === 'healthy') {
      recommendations.push('✅ Authentication system is fully configured and operational')
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      success: authStatus !== 'unhealthy',
      status: authStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      
      // Authentication Configuration
      authentication: {
        nextauth: nextAuthConfig,
        database: dbHealth,
        providers: {
          configured: configuredProviders,
          total: configuredProviders.length,
          oauth_count: configuredProviders.filter(p => p.type === 'oauth').length,
          credentials_enabled: true
        }
      },

      // Environment Variables Status
      environment: {
        variables: envCheck,
        critical_configured: hasCriticalVars,
        oauth_configured: hasOAuthProviders,
        production_ready: hasCriticalVars && hasOAuthProviders && dbHealth.status === 'healthy'
      },

      // URLs and Endpoints
      urls: {
        signin: `${process.env.NEXTAUTH_URL}/auth/signin`,
        signout: `${process.env.NEXTAUTH_URL}/api/auth/signout`,
        session: `${process.env.NEXTAUTH_URL}/api/auth/session`,
        providers: `${process.env.NEXTAUTH_URL}/api/auth/providers`,
        csrf: `${process.env.NEXTAUTH_URL}/api/auth/csrf`
      },

      // Security Configuration
      security: {
        session_strategy: 'jwt',
        session_max_age: '30 days',
        csrf_protection: true,
        secure_cookies: process.env.NODE_ENV === 'production',
        same_site: 'lax'
      },

      // Capabilities
      capabilities: {
        oauth_signin: hasOAuthProviders,
        credentials_signin: true,
        user_registration: true,
        session_management: true,
        audit_logging: dbHealth.status === 'healthy',
        role_based_access: true
      },

      // Recommendations
      recommendations,

      // Test URLs for verification
      test_urls: {
        signin_page: `${process.env.NEXTAUTH_URL}/auth/signin`,
        providers_api: `${process.env.NEXTAUTH_URL}/api/auth/providers`,
        session_api: `${process.env.NEXTAUTH_URL}/api/auth/session`
      }
    }, {
      status: authStatus === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Authentication verification error:', error)
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      responseTime: `${Date.now() - startTime}ms`,
      recommendations: [
        '🚨 Critical: Authentication system verification failed',
        '🔧 Check NextAuth configuration and environment variables',
        '📞 Contact system administrator for assistance'
      ]
    }, { status: 500 })
  }
}
