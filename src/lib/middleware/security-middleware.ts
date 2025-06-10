/**
 * Production Security Middleware
 * Comprehensive security headers, validation, and protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiter, RATE_LIMIT_CONFIGS } from './rate-limiter'
import crypto from 'crypto'

export interface SecurityConfig {
  enableCSP?: boolean
  enableHSTS?: boolean
  enableXFrameOptions?: boolean
  enableXContentTypeOptions?: boolean
  enableReferrerPolicy?: boolean
  enablePermissionsPolicy?: boolean
  rateLimitConfig?: string
  validateOrigin?: boolean
  allowedOrigins?: string[]
  enableRequestSigning?: boolean
  maxRequestSize?: number
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware
  private config: SecurityConfig
  private nonces = new Map<string, { nonce: string; timestamp: number }>()

  private constructor(config: SecurityConfig = {}) {
    this.config = {
      enableCSP: true,
      enableHSTS: true,
      enableXFrameOptions: true,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      rateLimitConfig: 'API_MODERATE',
      validateOrigin: true,
      allowedOrigins: [
        'https://portfolio-kpi-copilot.vercel.app',
        'https://*.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      enableRequestSigning: false,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      ...config
    }

    // Cleanup nonces every 5 minutes
    setInterval(() => this.cleanupNonces(), 5 * 60 * 1000)
  }

  static getInstance(config?: SecurityConfig): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware(config)
    }
    return SecurityMiddleware.instance
  }

  async processRequest(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now()

    try {
      // 1. Request size validation
      const sizeCheck = await this.validateRequestSize(request)
      if (sizeCheck) return sizeCheck

      // 2. Origin validation
      const originCheck = this.validateOrigin(request)
      if (originCheck) return originCheck

      // 3. Rate limiting
      const rateLimitCheck = await this.applyRateLimit(request)
      if (rateLimitCheck) return rateLimitCheck

      // 4. Request signing validation (if enabled)
      if (this.config.enableRequestSigning) {
        const signatureCheck = await this.validateRequestSignature(request)
        if (signatureCheck) return signatureCheck
      }

      // 5. Input sanitization for API routes
      if (request.nextUrl.pathname.startsWith('/api/')) {
        const sanitizationCheck = await this.sanitizeRequest(request)
        if (sanitizationCheck) return sanitizationCheck
      }

      return null // Continue processing

    } catch (error) {
      console.error('Security middleware error:', error)
      return new NextResponse('Security validation failed', { status: 500 })
    }
  }

  applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const nonce = this.generateNonce(request)

    // Content Security Policy
    if (this.config.enableCSP) {
      const csp = this.buildCSP(nonce)
      response.headers.set('Content-Security-Policy', csp)
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }

    // X-Frame-Options
    if (this.config.enableXFrameOptions) {
      response.headers.set('X-Frame-Options', 'DENY')
    }

    // X-Content-Type-Options
    if (this.config.enableXContentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
      )
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off')
    response.headers.set('X-Download-Options', 'noopen')
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

    // Remove server information
    response.headers.delete('Server')
    response.headers.delete('X-Powered-By')

    return response
  }

  private async validateRequestSize(request: NextRequest): Promise<NextResponse | null> {
    const contentLength = request.headers.get('content-length')
    
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > this.config.maxRequestSize!) {
        return new NextResponse('Request too large', { 
          status: 413,
          headers: {
            'Content-Type': 'text/plain'
          }
        })
      }
    }

    return null
  }

  private validateOrigin(request: NextRequest): NextResponse | null {
    if (!this.config.validateOrigin) return null

    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    // Skip validation for same-origin requests
    if (!origin && !referer) return null

    const requestOrigin = origin || (referer ? new URL(referer).origin : null)
    
    if (requestOrigin && this.config.allowedOrigins) {
      const isAllowed = this.config.allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*')
          return new RegExp(`^${pattern}$`).test(requestOrigin)
        }
        return allowed === requestOrigin
      })

      if (!isAllowed) {
        return new NextResponse('Origin not allowed', { 
          status: 403,
          headers: {
            'Content-Type': 'text/plain'
          }
        })
      }
    }

    return null
  }

  private async applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
    const path = request.nextUrl.pathname

    // Determine rate limit config based on path
    let configName = this.config.rateLimitConfig || 'API_MODERATE'
    
    if (path.includes('/auth/')) {
      configName = 'AUTH'
    } else if (path.includes('/upload') || path.includes('/documents')) {
      configName = 'UPLOAD'
    } else if (path.startsWith('/api/')) {
      configName = 'API_STRICT'
    }

    const rateLimitConfig = RATE_LIMIT_CONFIGS[configName as keyof typeof RATE_LIMIT_CONFIGS]
    
    if (rateLimitConfig) {
      const result = await rateLimiter.checkLimit(request, rateLimitConfig)
      
      if (!result.allowed) {
        return new NextResponse('Rate limit exceeded', {
          status: 429,
          headers: {
            'Retry-After': result.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Content-Type': 'text/plain'
          }
        })
      }

      // Add rate limit headers to successful requests
      request.headers.set('X-RateLimit-Limit', result.limit.toString())
      request.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      request.headers.set('X-RateLimit-Reset', result.resetTime.toString())
    }

    return null
  }

  private async validateRequestSignature(request: NextRequest): Promise<NextResponse | null> {
    const signature = request.headers.get('x-signature')
    const timestamp = request.headers.get('x-timestamp')
    
    if (!signature || !timestamp) {
      return new NextResponse('Missing signature or timestamp', { status: 401 })
    }

    // Check timestamp (prevent replay attacks)
    const now = Date.now()
    const requestTime = parseInt(timestamp, 10)
    const maxAge = 5 * 60 * 1000 // 5 minutes

    if (Math.abs(now - requestTime) > maxAge) {
      return new NextResponse('Request timestamp too old', { status: 401 })
    }

    // Validate signature
    const secret = process.env.REQUEST_SIGNING_SECRET
    if (!secret) {
      console.error('REQUEST_SIGNING_SECRET not configured')
      return new NextResponse('Server configuration error', { status: 500 })
    }

    try {
      const body = await request.text()
      const payload = `${request.method}${request.url}${timestamp}${body}`
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      if (signature !== expectedSignature) {
        return new NextResponse('Invalid signature', { status: 401 })
      }
    } catch (error) {
      console.error('Signature validation error:', error)
      return new NextResponse('Signature validation failed', { status: 401 })
    }

    return null
  }

  private async sanitizeRequest(request: NextRequest): Promise<NextResponse | null> {
    // Basic input sanitization for API requests
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      try {
        const body = await request.text()
        
        // Check for potential XSS patterns
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
        ]

        for (const pattern of xssPatterns) {
          if (pattern.test(body)) {
            return new NextResponse('Potentially malicious content detected', { 
              status: 400,
              headers: { 'Content-Type': 'text/plain' }
            })
          }
        }

        // Check for SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
          /(--|\/\*|\*\/|;)/g,
          /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi
        ]

        for (const pattern of sqlPatterns) {
          if (pattern.test(body)) {
            return new NextResponse('Potentially malicious SQL detected', { 
              status: 400,
              headers: { 'Content-Type': 'text/plain' }
            })
          }
        }

      } catch (error) {
        // If we can't parse the body, let it through (might be handled elsewhere)
        console.warn('Could not parse request body for sanitization:', error)
      }
    }

    return null
  }

  private generateNonce(request: NextRequest): string {
    const key = `${request.ip || 'unknown'}-${Date.now()}`
    const existing = this.nonces.get(key)
    
    if (existing && Date.now() - existing.timestamp < 60000) { // 1 minute
      return existing.nonce
    }

    const nonce = crypto.randomBytes(16).toString('base64')
    this.nonces.set(key, { nonce, timestamp: Date.now() })
    
    return nonce
  }

  private buildCSP(nonce: string): string {
    const directives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ]

    return directives.join('; ')
  }

  private cleanupNonces(): void {
    const now = Date.now()
    const maxAge = 10 * 60 * 1000 // 10 minutes
    const keysToDelete: string[] = []

    this.nonces.forEach((value, key) => {
      if (now - value.timestamp > maxAge) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.nonces.delete(key))
  }

  getStats(): any {
    return {
      activeNonces: this.nonces.size,
      config: this.config
    }
  }
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware.getInstance()
