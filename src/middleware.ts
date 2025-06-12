/**
 * Production Middleware Stack
 * Comprehensive security, performance, and monitoring middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
import { getToken } from 'next-auth/jwt'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP

  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP

  return 'unknown'
}

async function applyRateLimit(clientIP: string, path: string): Promise<{ allowed: boolean; resetTime: number }> {
  const key = `${clientIP}:${path.split('/')[1] || 'root'}`
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = path.startsWith('/api/') ? 100 : 1000 // Lower limit for API routes

  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, resetTime: now + windowMs }
  }

  if (current.count >= maxRequests) {
    return { allowed: false, resetTime: current.resetTime }
  }

  current.count++
  return { allowed: true, resetTime: current.resetTime }
}

// Production RBAC & Security Middleware
export default withAuth(
  async function middleware(request: NextRequest) {
    const startTime = Date.now()
    const token = await getToken({ req: request })
    const clientIP = getClientIP(request)
    const path = request.nextUrl.pathname

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(clientIP, path)
    if (!rateLimitResult.allowed) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': path.startsWith('/api/') ? '100' : '1000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      })
    }

    // Create response with comprehensive headers
    const response = NextResponse.next()

    // Comprehensive security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // Production security headers
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
      response.headers.set('X-DNS-Prefetch-Control', 'off')
      response.headers.set('X-Download-Options', 'noopen')
      response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

      // Enhanced CSP for production
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https: blob:; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' https://api.openai.com https://openrouter.ai https://*.supabase.co; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';"
      )
    }

    // Performance and monitoring headers
    const processingTime = Date.now() - startTime
    response.headers.set('X-Response-Time', `${processingTime}ms`)
    response.headers.set('X-Powered-By', 'Portfolio-KPI-Copilot')
    response.headers.set('X-Request-ID', `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
    response.headers.set('X-Client-IP', clientIP)

    // Business context headers
    response.headers.set('X-API-Version', '1.0.0')
    response.headers.set('X-Service-Type', 'portfolio-analytics')
    response.headers.set('X-Environment', process.env.NODE_ENV || 'development')

    // Rate limiting headers
    const remaining = rateLimitResult.allowed ?
      (path.startsWith('/api/') ? 99 : 999) : 0
    response.headers.set('X-RateLimit-Limit', path.startsWith('/api/') ? '100' : '1000')
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())

    // RBAC: Check organization access for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const orgId = request.nextUrl.searchParams.get('organizationId')
      if (orgId && token?.userId) {
        // Organization access will be validated in RBAC service
        response.headers.set('X-Organization-ID', orgId)
      }
    }

    // Add user context headers
    if (token?.userId) {
      response.headers.set('X-User-ID', token.userId)
      response.headers.set('X-User-Role', token.role || 'VIEWER')
    }

    // Cache optimization for static assets
    if (request.nextUrl.pathname.startsWith('/_next/static/')) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      )
    }

    // API response caching
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // Different cache strategies based on endpoint
      if (request.nextUrl.pathname.includes('/health') || 
          request.nextUrl.pathname.includes('/status')) {
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate')
      } else if (request.nextUrl.pathname.includes('/portfolios') ||
                 request.nextUrl.pathname.includes('/kpis')) {
        response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate')
      }
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public routes
        if (req.nextUrl.pathname.startsWith('/auth/') ||
            req.nextUrl.pathname === '/' ||
            req.nextUrl.pathname.startsWith('/api/auth/') ||
            req.nextUrl.pathname.startsWith('/api/health') ||
            req.nextUrl.pathname.startsWith('/api/docs') ||
            req.nextUrl.pathname.startsWith('/api/system/') ||
            req.nextUrl.pathname.startsWith('/api/test/') ||
            req.nextUrl.pathname.startsWith('/api/debug/') ||
            req.nextUrl.pathname.startsWith('/api/env-check') ||
            req.nextUrl.pathname.startsWith('/api/public/') ||
            req.nextUrl.pathname === '/dashboard' ||
            req.nextUrl.pathname === '/data' ||
            req.nextUrl.pathname === '/demo' ||
            req.nextUrl.pathname === '/test-real-data' ||
            req.nextUrl.pathname.startsWith('/portfolio') ||
            req.nextUrl.pathname.startsWith('/analytics') ||
            req.nextUrl.pathname.startsWith('/ai-assistant')) {
          return true
        }

        // Allow demo mode access to dashboard and related pages
        if (req.nextUrl.pathname.startsWith('/dashboard') ||
            req.nextUrl.pathname.startsWith('/data') ||
            req.nextUrl.pathname.startsWith('/portfolio') ||
            req.nextUrl.pathname.startsWith('/analytics') ||
            req.nextUrl.pathname.startsWith('/ai-assistant')) {
          return true
        }

        // Require authentication for other protected routes
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
