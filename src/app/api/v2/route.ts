/**
 * API v2 Gateway
 * Next-generation API with enhanced features and standardized responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiGateway, APIHandlerConfig } from '@/lib/api/gateway'
import { validationSchemas } from '@/lib/api/validation'
import { PERMISSIONS } from '@/lib/middleware/rbac-middleware'

// API v2 Documentation
export async function GET(request: NextRequest) {
  return apiGateway.createHandler(
    async (req, context) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      
      return {
        success: true,
        data: {
          name: 'Portfolio KPI Copilot API v2',
          version: '2.0.0',
          description: 'Next-generation API with enhanced AI capabilities, standardized responses, and enterprise features',
          baseUrl: `${baseUrl}/api/v2`,
        
        // API Features
        features: {
          standardizedResponses: 'Consistent response format across all endpoints',
          comprehensiveValidation: 'Zod-based request/response validation',
          advancedRateLimit: 'Intelligent rate limiting with user-based quotas',
          realTimeMonitoring: 'Comprehensive API analytics and monitoring',
          enterpriseSecurity: 'RBAC, audit logging, and advanced authentication',
          aiIntegration: 'Native AI copilot and analytics integration',
          webhookSupport: 'Real-time event notifications',
          batchOperations: 'Bulk data operations for efficiency',
          graphqlSupport: 'Flexible GraphQL endpoint for complex queries',
          websocketSupport: 'Real-time data streaming'
        },
        
        // Authentication
        authentication: {
          type: 'Bearer Token (NextAuth.js)',
          endpoints: {
            signin: 'POST /auth/signin',
            signout: 'POST /auth/signout',
            session: 'GET /auth/session',
            refresh: 'POST /auth/refresh'
          },
          headers: {
            authorization: 'Bearer <token>',
            'x-api-key': 'Optional API key for service-to-service calls'
          }
        },
        
        // Rate Limiting
        rateLimiting: {
          default: '1000 requests per hour per user',
          authenticated: '5000 requests per hour per user',
          premium: '10000 requests per hour per user',
          headers: {
            'x-ratelimit-limit': 'Request limit for current window',
            'x-ratelimit-remaining': 'Remaining requests in current window',
            'x-ratelimit-reset': 'Unix timestamp when limit resets'
          }
        },
        
        // Response Format
        responseFormat: {
          success: {
            success: true,
            data: 'Response data',
            metadata: {
              requestId: 'Unique request identifier',
              timestamp: 'ISO 8601 timestamp',
              version: 'API version',
              processingTime: 'Response time in milliseconds',
              pagination: 'Pagination info (if applicable)',
              rateLimit: 'Rate limit info'
            }
          },
          error: {
            success: false,
            error: {
              code: 'Error code',
              message: 'Human-readable error message',
              details: 'Additional error details',
              timestamp: 'ISO 8601 timestamp',
              requestId: 'Unique request identifier'
            },
            metadata: {
              requestId: 'Unique request identifier',
              timestamp: 'ISO 8601 timestamp',
              version: 'API version',
              processingTime: 'Response time in milliseconds'
            }
          }
        },
        
        // Endpoints
        endpoints: {
          // Core Resources
          portfolios: {
            list: 'GET /v2/portfolios',
            create: 'POST /v2/portfolios',
            get: 'GET /v2/portfolios/{id}',
            update: 'PUT /v2/portfolios/{id}',
            delete: 'DELETE /v2/portfolios/{id}',
            analytics: 'GET /v2/portfolios/{id}/analytics',
            kpis: 'GET /v2/portfolios/{id}/kpis',
            insights: 'GET /v2/portfolios/{id}/insights'
          },
          
          kpis: {
            list: 'GET /v2/kpis',
            create: 'POST /v2/kpis',
            get: 'GET /v2/kpis/{id}',
            update: 'PUT /v2/kpis/{id}',
            delete: 'DELETE /v2/kpis/{id}',
            analyze: 'POST /v2/kpis/analyze',
            benchmark: 'GET /v2/kpis/benchmark',
            batch: 'POST /v2/kpis/batch'
          },
          
          // AI Services
          ai: {
            copilot: 'POST /v2/ai/copilot',
            chat: 'POST /v2/ai/chat',
            insights: 'POST /v2/ai/insights',
            predictions: 'POST /v2/ai/predictions',
            analytics: 'GET /v2/ai/analytics',
            models: 'GET /v2/ai/models',
            usage: 'GET /v2/ai/usage'
          },
          
          // Organizations & Users
          organizations: {
            list: 'GET /v2/organizations',
            create: 'POST /v2/organizations',
            get: 'GET /v2/organizations/{id}',
            update: 'PUT /v2/organizations/{id}',
            users: 'GET /v2/organizations/{id}/users',
            settings: 'GET /v2/organizations/{id}/settings'
          },
          
          users: {
            list: 'GET /v2/users',
            create: 'POST /v2/users',
            get: 'GET /v2/users/{id}',
            update: 'PUT /v2/users/{id}',
            permissions: 'GET /v2/users/{id}/permissions',
            activity: 'GET /v2/users/{id}/activity'
          },
          
          // System & Monitoring
          system: {
            health: 'GET /v2/system/health',
            status: 'GET /v2/system/status',
            metrics: 'GET /v2/system/metrics',
            audit: 'GET /v2/system/audit',
            backup: 'POST /v2/system/backup'
          },
          
          // Webhooks & Events
          webhooks: {
            list: 'GET /v2/webhooks',
            create: 'POST /v2/webhooks',
            get: 'GET /v2/webhooks/{id}',
            update: 'PUT /v2/webhooks/{id}',
            delete: 'DELETE /v2/webhooks/{id}',
            test: 'POST /v2/webhooks/{id}/test',
            logs: 'GET /v2/webhooks/{id}/logs'
          },
          
          // Batch Operations
          batch: {
            portfolios: 'POST /v2/batch/portfolios',
            kpis: 'POST /v2/batch/kpis',
            users: 'POST /v2/batch/users',
            status: 'GET /v2/batch/{jobId}/status'
          },
          
          // Real-time
          realtime: {
            websocket: 'WS /v2/realtime',
            subscribe: 'POST /v2/realtime/subscribe',
            unsubscribe: 'POST /v2/realtime/unsubscribe',
            events: 'GET /v2/realtime/events'
          },
          
          // GraphQL
          graphql: {
            endpoint: 'POST /v2/graphql',
            playground: 'GET /v2/graphql/playground',
            schema: 'GET /v2/graphql/schema'
          }
        },
        
        // Error Codes
        errorCodes: {
          // Authentication & Authorization
          UNAUTHORIZED: { status: 401, description: 'Authentication required' },
          FORBIDDEN: { status: 403, description: 'Insufficient permissions' },
          INVALID_TOKEN: { status: 401, description: 'Invalid or expired token' },
          
          // Validation
          VALIDATION_ERROR: { status: 400, description: 'Request validation failed' },
          INVALID_INPUT: { status: 400, description: 'Invalid input data' },
          MISSING_REQUIRED_FIELD: { status: 400, description: 'Required field missing' },
          
          // Business Logic
          RESOURCE_NOT_FOUND: { status: 404, description: 'Resource not found' },
          RESOURCE_CONFLICT: { status: 409, description: 'Resource conflict' },
          BUSINESS_RULE_VIOLATION: { status: 422, description: 'Business rule violation' },
          
          // System
          INTERNAL_ERROR: { status: 500, description: 'Internal server error' },
          SERVICE_UNAVAILABLE: { status: 503, description: 'Service temporarily unavailable' },
          RATE_LIMIT_EXCEEDED: { status: 429, description: 'Rate limit exceeded' },
          TIMEOUT: { status: 408, description: 'Request timeout' },
          
          // AI Services
          AI_SERVICE_ERROR: { status: 503, description: 'AI service error' },
          AI_QUOTA_EXCEEDED: { status: 429, description: 'AI quota exceeded' },
          AI_MODEL_UNAVAILABLE: { status: 503, description: 'AI model unavailable' }
        },
        
        // Webhooks
        webhooks: {
          events: [
            'portfolio.created',
            'portfolio.updated',
            'portfolio.deleted',
            'kpi.created',
            'kpi.updated',
            'kpi.deleted',
            'user.created',
            'user.updated',
            'organization.updated',
            'ai.analysis.completed',
            'ai.prediction.generated',
            'system.alert.triggered'
          ],
          payloadFormat: {
            event: 'Event name',
            timestamp: 'ISO 8601 timestamp',
            data: 'Event-specific data',
            organizationId: 'Organization ID',
            userId: 'User ID (if applicable)',
            metadata: 'Additional metadata'
          },
          security: {
            signature: 'HMAC-SHA256 signature in X-Webhook-Signature header',
            verification: 'Verify signature using webhook secret'
          }
        },
        
        // SDKs and Libraries
        sdks: {
          javascript: 'npm install @portfolio-kpi/sdk-js',
          python: 'pip install portfolio-kpi-sdk',
          go: 'go get github.com/portfolio-kpi/sdk-go',
          curl: 'Examples available in documentation'
        },
        
        // Support
        support: {
          documentation: `${baseUrl}/docs`,
          apiReference: `${baseUrl}/api/v2`,
          status: `${baseUrl}/status`,
          support: 'support@portfolio-kpi.com',
          community: 'https://github.com/portfolio-kpi/community'
        },
        
        // Changelog
        changelog: {
          '2.0.0': {
            date: '2024-01-01',
            changes: [
              'Complete API redesign with standardized responses',
              'Enhanced AI copilot integration',
              'Advanced rate limiting and monitoring',
              'Webhook support for real-time notifications',
              'Batch operations for bulk data management',
              'GraphQL endpoint for flexible queries',
              'WebSocket support for real-time updates',
              'Comprehensive validation and error handling'
            ]
          }
        }
        }
      }
    },
    {
      cache: { ttl: 3600 }, // Cache for 1 hour
      rateLimit: { requests: 100, window: 3600 } // 100 requests per hour
    }
  )(request)
}

// API v2 Health Check
export async function HEAD(request: NextRequest) {
  return apiGateway.createHandler(
    async (req, context) => {
      return {
        success: true,
        data: {
          status: 'healthy',
          version: '2.0.0',
          timestamp: new Date().toISOString()
        }
      }
    },
    {
      cache: { ttl: 60 }, // Cache for 1 minute
      rateLimit: { requests: 1000, window: 3600 } // High limit for health checks
    }
  )(request)
}
