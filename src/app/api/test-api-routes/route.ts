import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route Testing Endpoint
 * Tests all critical API routes to ensure they return JSON responses
 */

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://portfolio-kpi-copilot.vercel.app'
  
  const testResults = {
    timestamp: new Date().toISOString(),
    baseUrl,
    tests: [] as any[]
  }

  // Test critical API endpoints
  const endpoints = [
    { path: '/api/health', method: 'GET', expectsAuth: false },
    { path: '/api/system/status', method: 'GET', expectsAuth: false },
    { path: '/api/auth/verify-setup', method: 'GET', expectsAuth: false },
    { path: '/api/docs', method: 'GET', expectsAuth: false },
    { path: '/api/portfolios', method: 'GET', expectsAuth: true },
    { path: '/api/companies', method: 'GET', expectsAuth: true },
    { path: '/api/kpis', method: 'GET', expectsAuth: true }
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Portfolio-KPI-Copilot-Test'
        }
      })

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      let responseData = null
      try {
        responseData = await response.text()
        if (isJson) {
          responseData = JSON.parse(responseData)
        }
      } catch (e) {
        responseData = 'Failed to parse response'
      }

      testResults.tests.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        contentType,
        isJson,
        expectsAuth: endpoint.expectsAuth,
        success: endpoint.expectsAuth ? 
          (response.status === 401 || response.status === 200) : 
          (response.status === 200),
        responseSize: responseData?.toString().length || 0,
        responsePreview: typeof responseData === 'string' ? 
          responseData.substring(0, 200) : 
          JSON.stringify(responseData).substring(0, 200)
      })
    } catch (error) {
      testResults.tests.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      })
    }
  }

  // Summary
  const summary = {
    total: testResults.tests.length,
    successful: testResults.tests.filter(t => t.success).length,
    failed: testResults.tests.filter(t => !t.success).length,
    jsonResponses: testResults.tests.filter(t => t.isJson).length,
    htmlResponses: testResults.tests.filter(t => !t.isJson && t.contentType?.includes('text/html')).length
  }

  return NextResponse.json({
    success: true,
    summary,
    results: testResults,
    recommendations: generateRecommendations(testResults.tests)
  })
}

function generateRecommendations(tests: any[]) {
  const recommendations = []

  const htmlResponses = tests.filter(t => !t.isJson && t.contentType?.includes('text/html'))
  if (htmlResponses.length > 0) {
    recommendations.push({
      type: 'CRITICAL',
      issue: 'API routes returning HTML instead of JSON',
      affected: htmlResponses.map(t => t.endpoint),
      solution: 'Check middleware configuration and ensure API routes are properly configured'
    })
  }

  const errorResponses = tests.filter(t => t.status === 'ERROR')
  if (errorResponses.length > 0) {
    recommendations.push({
      type: 'ERROR',
      issue: 'API routes failing to respond',
      affected: errorResponses.map(t => t.endpoint),
      solution: 'Check server logs and ensure all dependencies are properly configured'
    })
  }

  const authIssues = tests.filter(t => t.expectsAuth && t.status !== 401 && t.status !== 200)
  if (authIssues.length > 0) {
    recommendations.push({
      type: 'WARNING',
      issue: 'Authentication-protected routes not behaving as expected',
      affected: authIssues.map(t => t.endpoint),
      solution: 'Verify NextAuth configuration and middleware setup'
    })
  }

  return recommendations
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, method = 'GET', headers = {} } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://portfolio-kpi-copilot.vercel.app'
    const testUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`

    const response = await fetch(testUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Portfolio-KPI-Copilot-Test',
        ...headers
      }
    })

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    
    let responseData = null
    try {
      responseData = await response.text()
      if (isJson) {
        responseData = JSON.parse(responseData)
      }
    } catch (e) {
      responseData = 'Failed to parse response'
    }

    return NextResponse.json({
      success: true,
      test: {
        endpoint,
        method,
        status: response.status,
        contentType,
        isJson,
        headers: Object.fromEntries(response.headers.entries()),
        responseData: typeof responseData === 'string' ? 
          responseData.substring(0, 1000) : 
          responseData
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
