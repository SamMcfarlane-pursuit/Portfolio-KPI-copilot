import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

// Performance monitoring and optimization middleware
export default withAuth(
  function middleware(request: NextRequest) {
    const startTime = Date.now()
    
    // Add performance headers
    const response = NextResponse.next()
    
    // Security headers for production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      )
    }

    // Performance monitoring
    const processingTime = Date.now() - startTime
    response.headers.set('X-Response-Time', `${processingTime}ms`)
    response.headers.set('X-Powered-By', 'Portfolio-KPI-Copilot')
    
    // Business context headers
    response.headers.set('X-API-Version', '1.0.0')
    response.headers.set('X-Service-Type', 'portfolio-analytics')
    
    // Rate limiting headers (for API routes)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      response.headers.set('X-RateLimit-Limit', '1000')
      response.headers.set('X-RateLimit-Remaining', '999')
      response.headers.set('X-RateLimit-Reset', String(Date.now() + 900000))
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
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signup', 
          '/auth/error',
          '/api/health',
          '/api/system/status',
          '/api/docs'
        ]

        const { pathname } = req.nextUrl
        
        // Allow public routes
        if (publicRoutes.includes(pathname)) {
          return true
        }

        // Allow API documentation
        if (pathname.startsWith('/api/docs')) {
          return true
        }

        // Require authentication for protected routes
        if (pathname.startsWith('/dashboard') || 
            pathname.startsWith('/real-data') ||
            pathname.startsWith('/api/portfolios') ||
            pathname.startsWith('/api/kpis') ||
            pathname.startsWith('/api/chat')) {
          return !!token
        }

        // Default to allowing the request
        return true
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
