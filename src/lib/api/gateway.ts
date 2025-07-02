/**
 * Enterprise API Gateway
 * Unified routing, validation, and response handling for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import RBACService, { Permission } from '@/lib/rbac'
import { z } from 'zod'

// Standard API Response Format
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
    timestamp: string
    requestId: string
  }
  metadata?: {
    requestId: string
    timestamp: string
    version: string
    processingTime: number
    rateLimit?: {
      limit: number
      remaining: number
      reset: number
    }
    pagination?: {
      page: number
      limit: number
      total: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

// API Error Codes
export enum APIErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Business Logic
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  
  // AI Services
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  AI_MODEL_UNAVAILABLE = 'AI_MODEL_UNAVAILABLE'
}

// Request Context
export interface RequestContext {
  requestId: string
  user?: any
  session?: any
  startTime: number
  ip: string
  userAgent: string
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
}

// API Handler Configuration
export interface APIHandlerConfig {
  requireAuth?: boolean
  permissions?: Permission[]
  rateLimit?: {
    requests: number
    window: number // seconds
  }
  validation?: {
    body?: z.ZodSchema
    query?: z.ZodSchema
    params?: z.ZodSchema
  }
  cache?: {
    ttl: number // seconds
    key?: string
  }
  timeout?: number // milliseconds
}

// API Handler Function Type
export type APIHandler<T = any> = (
  request: NextRequest,
  context: RequestContext,
  config: APIHandlerConfig
) => Promise<APIResponse<T>>

export class APIGateway {
  private static instance: APIGateway
  private requestCache = new Map<string, { data: any; expires: number }>()
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>()

  public static getInstance(): APIGateway {
    if (!APIGateway.instance) {
      APIGateway.instance = new APIGateway()
    }
    return APIGateway.instance
  }

  /**
   * Create standardized API handler with middleware
   */
  public createHandler(
    handler: APIHandler,
    config: APIHandlerConfig = {}
  ) {
    return async (request: NextRequest) => {
      const startTime = Date.now()
      const requestId = this.generateRequestId()
      
      try {
        // Build request context
        const context = await this.buildRequestContext(request, requestId, startTime)
        
        // Apply middleware chain
        const middlewareResult = await this.applyMiddleware(request, context, config)
        if (middlewareResult) return middlewareResult
        
        // Check cache if enabled
        if (config.cache) {
          const cached = this.getCachedResponse(request, config.cache)
          if (cached) {
            return this.createSuccessResponse(cached, context, config)
          }
        }
        
        // Execute handler with timeout
        const timeoutMs = config.timeout || 30000
        const result = await Promise.race([
          handler(request, context, config),
          this.createTimeoutPromise(timeoutMs)
        ])
        
        // Cache response if enabled
        if (config.cache && result.success) {
          this.setCachedResponse(request, config.cache, result.data)
        }
        
        return this.createSuccessResponse(result.data, context, config, result.metadata)
        
      } catch (error) {
        return this.createErrorResponse(error, requestId, startTime)
      }
    }
  }

  /**
   * Apply middleware chain
   */
  private async applyMiddleware(
    request: NextRequest,
    context: RequestContext,
    config: APIHandlerConfig
  ): Promise<NextResponse | null> {
    
    // Rate limiting
    if (config.rateLimit) {
      const rateLimitResult = await this.checkRateLimit(context.ip, config.rateLimit)
      if (!rateLimitResult.allowed) {
        return this.createErrorResponse(
          new APIError(APIErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded'),
          context.requestId,
          context.startTime,
          {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': config.rateLimit.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        )
      }
    }
    
    // Authentication
    if (config.requireAuth) {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return this.createErrorResponse(
          new APIError(APIErrorCode.UNAUTHORIZED, 'Authentication required'),
          context.requestId,
          context.startTime
        )
      }
      context.session = session
      context.user = session.user
    }
    
    // Authorization
    if (config.permissions && config.permissions.length > 0) {
      if (!context.user) {
        return this.createErrorResponse(
          new APIError(APIErrorCode.UNAUTHORIZED, 'Authentication required for permission check'),
          context.requestId,
          context.startTime
        )
      }
      
      const hasPermission = config.permissions.some(permission =>
        RBACService.hasPermission(context.user, permission)
      )
      
      if (!hasPermission) {
        return this.createErrorResponse(
          new APIError(APIErrorCode.FORBIDDEN, 'Insufficient permissions'),
          context.requestId,
          context.startTime
        )
      }
    }
    
    // Input validation
    if (config.validation) {
      try {
        if (config.validation.body && request.method !== 'GET') {
          const body = await request.json()
          config.validation.body.parse(body)
        }
        
        if (config.validation.query) {
          const query = Object.fromEntries(new URL(request.url).searchParams)
          config.validation.query.parse(query)
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return this.createErrorResponse(
            new APIError(APIErrorCode.VALIDATION_ERROR, 'Validation failed', error.errors),
            context.requestId,
            context.startTime
          )
        }
        throw error
      }
    }
    
    return null // Continue to handler
  }

  /**
   * Build request context
   */
  private async buildRequestContext(
    request: NextRequest,
    requestId: string,
    startTime: number
  ): Promise<RequestContext> {
    const url = new URL(request.url)
    
    return {
      requestId,
      startTime,
      ip: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers.entries())
    }
  }

  /**
   * Create success response
   */
  private createSuccessResponse<T>(
    data: T,
    context: RequestContext,
    config: APIHandlerConfig,
    additionalMetadata?: any
  ): NextResponse {
    const processingTime = Date.now() - context.startTime
    
    const response: APIResponse<T> = {
      success: true,
      data,
      metadata: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        processingTime,
        ...additionalMetadata
      }
    }
    
    return NextResponse.json(response, {
      headers: this.getResponseHeaders(context, config)
    })
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    error: any,
    requestId: string,
    startTime: number,
    additionalHeaders?: Record<string, string>
  ): NextResponse {
    const processingTime = Date.now() - startTime
    
    let apiError: APIError
    if (error instanceof APIError) {
      apiError = error
    } else {
      apiError = new APIError(
        APIErrorCode.INTERNAL_ERROR,
        'Internal server error',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    }
    
    const response: APIResponse = {
      success: false,
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
        timestamp: new Date().toISOString(),
        requestId
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        processingTime
      }
    }
    
    const status = this.getStatusCodeForError(apiError.code)
    
    return NextResponse.json(response, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...additionalHeaders
      }
    })
  }

  // Helper methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    
    const realIP = request.headers.get('x-real-ip')
    if (realIP) return realIP
    
    return 'unknown'
  }

  private async checkRateLimit(
    ip: string,
    config: { requests: number; window: number }
  ): Promise<{ allowed: boolean; resetTime: number }> {
    const key = `rate_limit_${ip}`
    const now = Date.now()
    const windowMs = config.window * 1000
    
    const existing = this.rateLimitStore.get(key)
    
    if (!existing || now > existing.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
      return { allowed: true, resetTime: now + windowMs }
    }
    
    if (existing.count >= config.requests) {
      return { allowed: false, resetTime: existing.resetTime }
    }
    
    existing.count++
    return { allowed: true, resetTime: existing.resetTime }
  }

  private getCachedResponse(request: NextRequest, config: { ttl: number; key?: string }): any {
    const cacheKey = config.key || `${request.method}_${request.url}`
    const cached = this.requestCache.get(cacheKey)
    
    if (cached && Date.now() < cached.expires) {
      return cached.data
    }
    
    return null
  }

  private setCachedResponse(request: NextRequest, config: { ttl: number; key?: string }, data: any): void {
    const cacheKey = config.key || `${request.method}_${request.url}`
    this.requestCache.set(cacheKey, {
      data,
      expires: Date.now() + (config.ttl * 1000)
    })
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new APIError(APIErrorCode.TIMEOUT, `Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  }

  private getResponseHeaders(context: RequestContext, config: APIHandlerConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Request-ID': context.requestId,
      'X-Response-Time': `${Date.now() - context.startTime}ms`,
      'Cache-Control': config.cache ? `max-age=${config.cache.ttl}` : 'no-cache'
    }
  }

  private getStatusCodeForError(code: APIErrorCode): number {
    switch (code) {
      case APIErrorCode.UNAUTHORIZED:
      case APIErrorCode.INVALID_TOKEN:
        return 401
      case APIErrorCode.FORBIDDEN:
        return 403
      case APIErrorCode.RESOURCE_NOT_FOUND:
        return 404
      case APIErrorCode.VALIDATION_ERROR:
      case APIErrorCode.INVALID_INPUT:
      case APIErrorCode.MISSING_REQUIRED_FIELD:
        return 400
      case APIErrorCode.RESOURCE_CONFLICT:
      case APIErrorCode.BUSINESS_RULE_VIOLATION:
        return 409
      case APIErrorCode.RATE_LIMIT_EXCEEDED:
        return 429
      case APIErrorCode.SERVICE_UNAVAILABLE:
      case APIErrorCode.AI_SERVICE_ERROR:
        return 503
      case APIErrorCode.TIMEOUT:
        return 408
      default:
        return 500
    }
  }
}

// Custom API Error Class
export class APIError extends Error {
  constructor(
    public code: APIErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Export singleton instance
export const apiGateway = APIGateway.getInstance()
