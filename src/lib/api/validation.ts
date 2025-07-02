/**
 * API Validation Schemas
 * Comprehensive validation for all API endpoints using Zod
 */

import { z } from 'zod'

// Common validation patterns
export const commonSchemas = {
  id: z.string().min(1, 'ID is required'),
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  date: z.string().datetime('Invalid date format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  currency: z.number().min(0, 'Currency amount must be non-negative'),
  
  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),
  
  // Time ranges
  timeframe: z.enum(['1d', '7d', '30d', '90d', '1y', 'all']).default('30d'),
  
  // Common filters
  filters: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    category: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional()
  })
}

// Portfolio validation schemas
export const portfolioSchemas = {
  create: z.object({
    name: z.string().min(1, 'Portfolio name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    sector: z.string().min(1, 'Sector is required'),
    geography: z.string().min(1, 'Geography is required'),
    stage: z.enum(['seed', 'series-a', 'series-b', 'series-c', 'growth', 'mature']),
    investment: commonSchemas.currency,
    ownership: commonSchemas.percentage,
    status: z.enum(['active', 'monitoring', 'exited']).default('active'),
    tags: z.array(z.string()).optional(),
    fundId: commonSchemas.id.optional(),
    organizationId: commonSchemas.id
  }),
  
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    sector: z.string().min(1).optional(),
    geography: z.string().min(1).optional(),
    stage: z.enum(['seed', 'series-a', 'series-b', 'series-c', 'growth', 'mature']).optional(),
    investment: commonSchemas.currency.optional(),
    ownership: commonSchemas.percentage.optional(),
    status: z.enum(['active', 'monitoring', 'exited']).optional(),
    tags: z.array(z.string()).optional()
  }),
  
  query: z.object({
    organizationId: commonSchemas.id.optional(),
    fundId: commonSchemas.id.optional(),
    sector: z.string().optional(),
    includeKPIs: z.boolean().default(false),
    includeAnalytics: z.boolean().default(false),
    ...commonSchemas.pagination.shape,
    ...commonSchemas.filters.shape
  }).extend({
    status: z.enum(['active', 'monitoring', 'exited']).optional()
  })
}

// KPI validation schemas
export const kpiSchemas = {
  create: z.object({
    name: z.string().min(1, 'KPI name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    category: z.enum(['financial', 'operational', 'growth', 'efficiency', 'risk', 'customer', 'product']),
    value: z.number(),
    unit: z.string().min(1, 'Unit is required').max(20, 'Unit too long'),
    targetValue: z.number().optional(),
    period: commonSchemas.date,
    portfolioId: commonSchemas.id,
    source: z.string().max(100, 'Source too long').optional(),
    confidence: z.number().min(0).max(100).default(100),
    isPublic: z.boolean().default(false),
    metadata: z.record(z.any()).optional()
  }),
  
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    category: z.enum(['financial', 'operational', 'growth', 'efficiency', 'risk', 'customer', 'product']).optional(),
    value: z.number().optional(),
    unit: z.string().min(1).max(20).optional(),
    targetValue: z.number().optional(),
    period: commonSchemas.date.optional(),
    source: z.string().max(100).optional(),
    confidence: z.number().min(0).max(100).optional(),
    isPublic: z.boolean().optional(),
    metadata: z.record(z.any()).optional()
  }),
  
  query: z.object({
    portfolioId: commonSchemas.id.optional(),
    periodFrom: commonSchemas.date.optional(),
    periodTo: commonSchemas.date.optional(),
    includeTargets: z.boolean().default(false),
    includeAnalytics: z.boolean().default(false),
    ...commonSchemas.pagination.shape,
    ...commonSchemas.filters.shape
  }).extend({
    category: z.enum(['financial', 'operational', 'growth', 'efficiency', 'risk', 'customer', 'product']).optional()
  }),
  
  analyze: z.object({
    kpiIds: z.array(commonSchemas.id).min(1, 'At least one KPI ID is required'),
    analysisType: z.enum(['trend', 'benchmark', 'forecast', 'correlation', 'comprehensive']).default('comprehensive'),
    timeframe: commonSchemas.timeframe,
    includeForecasting: z.boolean().default(false),
    includeBenchmarks: z.boolean().default(false),
    confidence: z.number().min(0).max(100).default(80)
  })
}

// AI service validation schemas
export const aiSchemas = {
  chat: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1, 'Message content is required').max(4000, 'Message too long'),
      timestamp: commonSchemas.date.optional()
    })).min(1, 'At least one message is required'),
    context: z.enum(['portfolio', 'kpi', 'analytics', 'general']).default('general'),
    portfolioId: commonSchemas.id.optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).max(4000).default(1000),
    stream: z.boolean().default(false)
  }),
  
  copilot: z.object({
    query: z.string().min(1, 'Query is required').max(2000, 'Query too long'),
    type: z.enum(['chat', 'analysis', 'prediction', 'explanation', 'summary']).default('chat'),
    portfolioId: commonSchemas.id.optional(),
    conversationId: z.string().optional(),
    context: z.object({
      source: z.string().optional(),
      requiresData: z.boolean().default(false),
      analysisType: z.string().optional()
    }).optional(),
    preferences: z.object({
      aiProvider: z.enum(['auto', 'openrouter', 'openai', 'ollama']).default('auto'),
      priority: z.enum(['speed', 'quality', 'cost']).default('quality'),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().min(1).max(4000).default(2000)
    }).optional()
  }),
  
  insights: z.object({
    portfolioId: commonSchemas.id.optional(),
    type: z.enum(['performance', 'risk', 'opportunity', 'prediction', 'all']).default('all'),
    timeframe: commonSchemas.timeframe,
    focusAreas: z.array(z.string()).optional(),
    minConfidence: z.number().min(0).max(100).default(70),
    maxResults: z.number().int().min(1).max(50).default(20)
  }),
  
  predictions: z.object({
    portfolioId: commonSchemas.id.optional(),
    metrics: z.array(z.string()).optional(),
    timeframe: z.enum(['1m', '3m', '6m', '12m', '24m']).default('12m'),
    confidence: z.number().min(0).max(100).default(80),
    includeScenarios: z.boolean().default(false),
    scenarios: z.array(z.object({
      name: z.string(),
      assumptions: z.record(z.any())
    })).optional()
  })
}

// Organization validation schemas
export const organizationSchemas = {
  create: z.object({
    name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    industry: z.string().min(1, 'Industry is required'),
    size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
    website: commonSchemas.url.optional(),
    settings: z.object({
      timezone: z.string().default('UTC'),
      currency: z.string().length(3).default('USD'),
      dateFormat: z.string().default('YYYY-MM-DD'),
      features: z.array(z.string()).default([])
    }).optional()
  }),
  
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    industry: z.string().min(1).optional(),
    size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
    website: commonSchemas.url.optional(),
    settings: z.object({
      timezone: z.string().optional(),
      currency: z.string().length(3).optional(),
      dateFormat: z.string().optional(),
      features: z.array(z.string()).optional()
    }).optional()
  })
}

// User validation schemas
export const userSchemas = {
  create: z.object({
    email: commonSchemas.email,
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'ANALYST', 'VIEWER']),
    organizationId: commonSchemas.id,
    permissions: z.array(z.string()).optional(),
    profile: z.object({
      title: z.string().max(100).optional(),
      department: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
      timezone: z.string().optional()
    }).optional()
  }),
  
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'ANALYST', 'VIEWER']).optional(),
    permissions: z.array(z.string()).optional(),
    profile: z.object({
      title: z.string().max(100).optional(),
      department: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
      timezone: z.string().optional()
    }).optional(),
    isActive: z.boolean().optional()
  })
}

// System validation schemas
export const systemSchemas = {
  healthCheck: z.object({
    includeDetails: z.boolean().default(false),
    services: z.array(z.string()).optional()
  }),
  
  audit: z.object({
    userId: commonSchemas.id.optional(),
    action: z.string().optional(),
    resourceType: z.string().optional(),
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional(),
    ...commonSchemas.pagination.shape
  }),
  
  backup: z.object({
    includeData: z.boolean().default(true),
    includeFiles: z.boolean().default(false),
    compression: z.enum(['none', 'gzip', 'brotli']).default('gzip'),
    encryption: z.boolean().default(true)
  })
}

// Webhook validation schemas
export const webhookSchemas = {
  create: z.object({
    url: commonSchemas.url,
    events: z.array(z.string()).min(1, 'At least one event is required'),
    secret: z.string().min(8, 'Secret must be at least 8 characters'),
    active: z.boolean().default(true),
    retryPolicy: z.object({
      maxRetries: z.number().int().min(0).max(10).default(3),
      backoffMultiplier: z.number().min(1).max(10).default(2),
      initialDelay: z.number().int().min(1000).default(1000)
    }).optional()
  }),
  
  update: z.object({
    url: commonSchemas.url.optional(),
    events: z.array(z.string()).optional(),
    secret: z.string().min(8).optional(),
    active: z.boolean().optional(),
    retryPolicy: z.object({
      maxRetries: z.number().int().min(0).max(10).optional(),
      backoffMultiplier: z.number().min(1).max(10).optional(),
      initialDelay: z.number().int().min(1000).optional()
    }).optional()
  })
}

// Export all schemas
export const validationSchemas = {
  common: commonSchemas,
  portfolio: portfolioSchemas,
  kpi: kpiSchemas,
  ai: aiSchemas,
  organization: organizationSchemas,
  user: userSchemas,
  system: systemSchemas,
  webhook: webhookSchemas
}

// Validation helper functions
export const validateRequest = {
  body: <T>(schema: z.ZodSchema<T>, data: unknown): T => {
    return schema.parse(data)
  },
  
  query: <T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): T => {
    const data = Object.fromEntries(searchParams.entries())
    // Convert string values to appropriate types
    const converted = convertQueryTypes(data)
    return schema.parse(converted)
  },
  
  params: <T>(schema: z.ZodSchema<T>, params: Record<string, string>): T => {
    return schema.parse(params)
  }
}

// Helper function to convert query string types
function convertQueryTypes(data: Record<string, string>): Record<string, any> {
  const converted: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(data)) {
    // Convert boolean strings
    if (value === 'true') {
      converted[key] = true
    } else if (value === 'false') {
      converted[key] = false
    }
    // Convert number strings
    else if (/^\d+$/.test(value)) {
      converted[key] = parseInt(value, 10)
    } else if (/^\d+\.\d+$/.test(value)) {
      converted[key] = parseFloat(value)
    }
    // Keep as string
    else {
      converted[key] = value
    }
  }
  
  return converted
}
