/**
 * Global Error Handling System
 * Production-grade error handling, logging, and recovery
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/monitoring/health-monitor'
import RBACService from '@/lib/rbac'

export interface ErrorContext {
  userId?: string
  organizationId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  path?: string
  method?: string
  timestamp: string
}

export interface ErrorDetails {
  code: string
  message: string
  stack?: string
  context: ErrorContext
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'validation' | 'authentication' | 'authorization' | 'database' | 'external_api' | 'system' | 'unknown'
  recoverable: boolean
  userMessage: string
}

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler
  private errorCounts: Map<string, number> = new Map()
  private lastErrors: ErrorDetails[] = []

  private constructor() {}

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler()
    }
    return GlobalErrorHandler.instance
  }

  async handleError(
    error: Error | unknown,
    request?: NextRequest,
    context?: Partial<ErrorContext>
  ): Promise<NextResponse> {
    const errorDetails = this.processError(error, request, context)
    
    // Log error
    await this.logError(errorDetails)
    
    // Track error metrics
    this.trackError(errorDetails)
    
    // Determine response
    return this.createErrorResponse(errorDetails)
  }

  private processError(
    error: Error | unknown,
    request?: NextRequest,
    context?: Partial<ErrorContext>
  ): ErrorDetails {
    const timestamp = new Date().toISOString()
    const requestId = this.generateRequestId()

    // Extract error information
    let message = 'An unexpected error occurred'
    let stack: string | undefined
    let code = 'UNKNOWN_ERROR'

    if (error instanceof Error) {
      message = error.message
      stack = error.stack
      code = this.extractErrorCode(error)
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object') {
      message = (error as any).message || JSON.stringify(error)
      code = (error as any).code || 'UNKNOWN_ERROR'
    }

    // Build context
    const errorContext: ErrorContext = {
      requestId,
      timestamp,
      ...context
    }

    if (request) {
      errorContext.path = request.nextUrl.pathname
      errorContext.method = request.method
      errorContext.userAgent = request.headers.get('user-agent') || undefined
      errorContext.ip = this.extractClientIP(request)
    }

    // Categorize error
    const category = this.categorizeError(error, code)
    const severity = this.determineSeverity(error, category, code)
    const recoverable = this.isRecoverable(error, category, severity)
    const userMessage = this.generateUserMessage(category, severity, recoverable)

    return {
      code,
      message,
      stack: process.env.NODE_ENV === 'development' ? stack : undefined,
      context: errorContext,
      severity,
      category,
      recoverable,
      userMessage
    }
  }

  private extractErrorCode(error: Error): string {
    // Extract error codes from different error types
    if ('code' in error) {
      return (error as any).code
    }

    // Common error patterns
    if (error.message.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED'
    if (error.message.includes('ENOTFOUND')) return 'DNS_ERROR'
    if (error.message.includes('timeout')) return 'TIMEOUT_ERROR'
    if (error.message.includes('unauthorized')) return 'UNAUTHORIZED'
    if (error.message.includes('forbidden')) return 'FORBIDDEN'
    if (error.message.includes('not found')) return 'NOT_FOUND'
    if (error.message.includes('validation')) return 'VALIDATION_ERROR'
    if (error.message.includes('database')) return 'DATABASE_ERROR'

    return 'UNKNOWN_ERROR'
  }

  private categorizeError(error: unknown, code: string): ErrorDetails['category'] {
    // Categorize based on error code and type
    if (code.includes('VALIDATION') || code.includes('INVALID')) return 'validation'
    if (code.includes('AUTH') || code.includes('UNAUTHORIZED')) return 'authentication'
    if (code.includes('FORBIDDEN') || code.includes('PERMISSION')) return 'authorization'
    if (code.includes('DATABASE') || code.includes('PRISMA')) return 'database'
    if (code.includes('CONNECTION') || code.includes('TIMEOUT')) return 'external_api'
    if (code.includes('SYSTEM') || code.includes('MEMORY')) return 'system'

    // Categorize based on error instance
    if (error instanceof TypeError || error instanceof ReferenceError) return 'system'
    if (error instanceof SyntaxError) return 'validation'

    return 'unknown'
  }

  private determineSeverity(
    error: unknown,
    category: ErrorDetails['category'],
    code: string
  ): ErrorDetails['severity'] {
    // Critical errors
    if (category === 'system' && code.includes('MEMORY')) return 'critical'
    if (category === 'database' && code.includes('CONNECTION')) return 'critical'
    if (code.includes('SECURITY') || code.includes('BREACH')) return 'critical'

    // High severity errors
    if (category === 'authentication' || category === 'authorization') return 'high'
    if (category === 'database') return 'high'
    if (code.includes('TIMEOUT') && category === 'external_api') return 'high'

    // Medium severity errors
    if (category === 'external_api') return 'medium'
    if (category === 'system') return 'medium'

    // Low severity errors
    if (category === 'validation') return 'low'

    return 'medium'
  }

  private isRecoverable(
    error: unknown,
    category: ErrorDetails['category'],
    severity: ErrorDetails['severity']
  ): boolean {
    // Non-recoverable errors
    if (severity === 'critical') return false
    if (category === 'system' && severity === 'high') return false

    // Recoverable errors
    if (category === 'validation') return true
    if (category === 'external_api') return true
    if (category === 'authentication') return true

    return severity !== 'high'
  }

  private generateUserMessage(
    category: ErrorDetails['category'],
    severity: ErrorDetails['severity'],
    recoverable: boolean
  ): string {
    if (severity === 'critical') {
      return 'A critical system error occurred. Our team has been notified and is working to resolve this issue.'
    }

    switch (category) {
      case 'validation':
        return 'Please check your input and try again.'
      case 'authentication':
        return 'Authentication failed. Please check your credentials and try again.'
      case 'authorization':
        return 'You do not have permission to perform this action.'
      case 'database':
        return 'A database error occurred. Please try again in a few moments.'
      case 'external_api':
        return 'An external service is temporarily unavailable. Please try again later.'
      case 'system':
        return recoverable 
          ? 'A temporary system error occurred. Please try again.'
          : 'A system error occurred. Our team has been notified.'
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    }
  }

  private extractClientIP(request: NextRequest): string {
    // Extract client IP from various headers
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
      return realIP
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    if (cfConnectingIP) {
      return cfConnectingIP
    }

    return 'unknown'
  }

  private async logError(errorDetails: ErrorDetails): Promise<void> {
    try {
      // Console logging
      console.error('Global Error Handler:', {
        code: errorDetails.code,
        message: errorDetails.message,
        severity: errorDetails.severity,
        category: errorDetails.category,
        context: errorDetails.context
      })

      // Log to audit system if user context available
      if (errorDetails.context.userId) {
        await RBACService.logAuditEvent({
          userId: errorDetails.context.userId,
          action: 'ERROR_OCCURRED',
          resourceType: 'ERROR',
          resourceId: errorDetails.code,
          metadata: {
            severity: errorDetails.severity,
            category: errorDetails.category,
            recoverable: errorDetails.recoverable,
            path: errorDetails.context.path,
            method: errorDetails.context.method
          }
        }).catch(auditError => {
          console.error('Failed to log error to audit system:', auditError)
        })
      }

      // Store recent errors for monitoring
      this.lastErrors.unshift(errorDetails)
      if (this.lastErrors.length > 100) {
        this.lastErrors = this.lastErrors.slice(0, 50)
      }

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private trackError(errorDetails: ErrorDetails): void {
    // Track error counts for monitoring
    const key = `${errorDetails.category}:${errorDetails.code}`
    const currentCount = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, currentCount + 1)

    // Record error in health monitor
    healthMonitor.recordRequest(0, true)
  }

  private createErrorResponse(errorDetails: ErrorDetails): NextResponse {
    const statusCode = this.getStatusCode(errorDetails.category, errorDetails.code)
    
    const response = {
      success: false,
      error: {
        code: errorDetails.code,
        message: errorDetails.userMessage,
        category: errorDetails.category,
        severity: errorDetails.severity,
        recoverable: errorDetails.recoverable,
        requestId: errorDetails.context.requestId,
        timestamp: errorDetails.context.timestamp
      }
    }

    // Add debug information in development
    if (process.env.NODE_ENV === 'development') {
      (response.error as any).debug = {
        originalMessage: errorDetails.message,
        stack: errorDetails.stack,
        context: errorDetails.context
      }
    }

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'X-Error-Code': errorDetails.code,
        'X-Error-Category': errorDetails.category,
        'X-Request-ID': errorDetails.context.requestId || 'unknown'
      }
    })
  }

  private getStatusCode(category: ErrorDetails['category'], code: string): number {
    // Map error categories to HTTP status codes
    if (code.includes('NOT_FOUND')) return 404
    if (code.includes('UNAUTHORIZED')) return 401
    if (code.includes('FORBIDDEN') || category === 'authorization') return 403
    if (category === 'validation') return 400
    if (category === 'authentication') return 401
    if (code.includes('TIMEOUT')) return 408
    if (code.includes('CONFLICT')) return 409
    if (category === 'external_api') return 502
    if (category === 'database' || category === 'system') return 500

    return 500
  }

  private generateRequestId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public methods for monitoring
  getErrorStats(): any {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByCategory: this.groupErrorsByCategory(),
      recentErrors: this.lastErrors.slice(0, 10),
      topErrors: this.getTopErrors()
    }
  }

  private groupErrorsByCategory(): Record<string, number> {
    const categories: Record<string, number> = {}
    
    Array.from(this.errorCounts.entries()).forEach(([key, count]) => {
      const category = key.split(':')[0]
      categories[category] = (categories[category] || 0) + count
    })
    
    return categories
  }

  private getTopErrors(): Array<{ error: string; count: number }> {
    return Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }))
  }

  clearStats(): void {
    this.errorCounts.clear()
    this.lastErrors = []
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance()
export default globalErrorHandler
