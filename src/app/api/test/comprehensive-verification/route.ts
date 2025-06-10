import { NextRequest, NextResponse } from 'next/server'

/**
 * Comprehensive System Verification Endpoint
 * Tests all critical functionality and connections
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const results: any = {
    timestamp: new Date().toISOString(),
    status: 'testing',
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  }

  try {
    // Test 1: Authentication System
    console.log('Testing authentication system...')
    try {
      const authResponse = await fetch(`${request.nextUrl.origin}/api/auth/providers`)
      const authData = await authResponse.json()
      
      results.tests.authentication = {
        status: authResponse.ok ? 'PASS' : 'FAIL',
        providers: Object.keys(authData).length,
        details: {
          google: !!authData.google,
          github: !!authData.github,
          credentials: !!authData.credentials,
          azure: !!authData['azure-ad'],
          okta: !!authData.okta
        }
      }
      
      if (authResponse.ok) results.summary.passed++
      else results.summary.failed++
    } catch (error) {
      results.tests.authentication = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.summary.failed++
    }
    results.summary.total++

    // Test 2: OAuth Configuration
    console.log('Testing OAuth configuration...')
    try {
      const oauthResponse = await fetch(`${request.nextUrl.origin}/api/auth/test-oauth`)
      const oauthData = await oauthResponse.json()
      
      results.tests.oauth = {
        status: oauthData.overall_status === 'READY_FOR_TESTING' ? 'PASS' : 'WARN',
        configured: oauthData.environment?.GOOGLE_CLIENT_ID ? true : false,
        ready: oauthData.overall_status === 'READY_FOR_TESTING',
        details: oauthData.validation
      }
      
      if (oauthData.overall_status === 'READY_FOR_TESTING') results.summary.passed++
      else results.summary.warnings++
    } catch (error) {
      results.tests.oauth = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.summary.failed++
    }
    results.summary.total++

    // Test 3: Database Connectivity
    console.log('Testing database connectivity...')
    try {
      const dbResponse = await fetch(`${request.nextUrl.origin}/api/auth/init-db`)
      const dbData = await dbResponse.json()
      
      results.tests.database = {
        status: dbData.success ? 'PASS' : 'FAIL',
        connected: dbData.success,
        tables: dbData.tables || {},
        details: dbData
      }
      
      if (dbData.success) results.summary.passed++
      else results.summary.failed++
    } catch (error) {
      results.tests.database = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.summary.failed++
    }
    results.summary.total++

    // Test 4: Document Upload System
    console.log('Testing document upload system...')
    try {
      const uploadResponse = await fetch(`${request.nextUrl.origin}/api/test/document-upload`)
      const uploadData = await uploadResponse.json()
      
      results.tests.documentUpload = {
        status: uploadData.success ? 'PASS' : 'FAIL',
        supportedTypes: uploadData.supportedTypes?.length || 0,
        features: uploadData.features?.length || 0,
        maxSize: uploadData.maxSize,
        details: uploadData
      }
      
      if (uploadData.success) results.summary.passed++
      else results.summary.failed++
    } catch (error) {
      results.tests.documentUpload = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.summary.failed++
    }
    results.summary.total++

    // Test 5: Data Management System
    console.log('Testing data management system...')
    try {
      const dataResponse = await fetch(`${request.nextUrl.origin}/api/test/data-management`)
      const dataData = await dataResponse.json()
      
      results.tests.dataManagement = {
        status: dataData.success ? 'PASS' : 'FAIL',
        overall: dataData.results?.overall,
        capabilities: dataData.capabilities,
        coherence: dataData.coherenceCheck,
        details: dataData.results
      }
      
      if (dataData.success) results.summary.passed++
      else results.summary.failed++
    } catch (error) {
      results.tests.dataManagement = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.summary.failed++
    }
    results.summary.total++

    // Test 6: System Health
    console.log('Testing system health...')
    try {
      const healthResponse = await fetch(`${request.nextUrl.origin}/api/system/comprehensive-status`)
      const healthData = await healthResponse.json()
      
      results.tests.systemHealth = {
        status: healthData.success ? 'PASS' : 'FAIL',
        overall: healthData.status,
        services: healthData.services,
        capabilities: healthData.capabilities,
        environment: healthData.environment
      }
      
      if (healthData.success) results.summary.passed++
      else results.summary.failed++
    } catch (error) {
      results.tests.systemHealth = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      results.summary.failed++
    }
    results.summary.total++

    // Test 7: API Endpoints Accessibility
    console.log('Testing API endpoints...')
    const endpoints = [
      '/api/health',
      '/api/companies',
      '/api/kpis',
      '/api/portfolios',
      '/api/organizations'
    ]
    
    let accessibleEndpoints = 0
    const endpointResults: any = {}
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${request.nextUrl.origin}${endpoint}`)
        const accessible = response.status !== 404
        endpointResults[endpoint] = {
          accessible,
          status: response.status,
          statusText: response.statusText
        }
        if (accessible) accessibleEndpoints++
      } catch (error) {
        endpointResults[endpoint] = {
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    results.tests.apiEndpoints = {
      status: accessibleEndpoints >= endpoints.length * 0.8 ? 'PASS' : 'WARN',
      accessible: accessibleEndpoints,
      total: endpoints.length,
      details: endpointResults
    }
    
    if (accessibleEndpoints >= endpoints.length * 0.8) results.summary.passed++
    else results.summary.warnings++
    results.summary.total++

    // Calculate overall status
    const passRate = results.summary.passed / results.summary.total
    if (passRate >= 0.9) {
      results.status = 'EXCELLENT'
    } else if (passRate >= 0.7) {
      results.status = 'GOOD'
    } else if (passRate >= 0.5) {
      results.status = 'DEGRADED'
    } else {
      results.status = 'CRITICAL'
    }

    // Add recommendations
    results.recommendations = []
    
    if (results.tests.oauth?.status === 'WARN') {
      results.recommendations.push('🔐 OAuth: Publish Google OAuth app or add test users for full authentication')
    }
    
    if (results.tests.database?.status === 'FAIL') {
      results.recommendations.push('💾 Database: Consider setting up Supabase for production database')
    }
    
    if (results.tests.systemHealth?.capabilities?.aiAnalysis === false) {
      results.recommendations.push('🤖 AI: Configure OpenRouter or OpenAI for AI-powered analysis')
    }
    
    if (results.summary.failed > 0) {
      results.recommendations.push('⚠️ Critical: Address failed tests for full functionality')
    }
    
    if (results.status === 'EXCELLENT') {
      results.recommendations.push('🎉 Excellent: All systems operational and ready for production!')
    }

    // Performance metrics
    results.performance = {
      responseTime: `${Date.now() - startTime}ms`,
      testsCompleted: results.summary.total,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Comprehensive verification failed:', error)
    
    return NextResponse.json({
      success: false,
      status: 'CRITICAL',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      performance: {
        responseTime: `${Date.now() - startTime}ms`,
        failed: true
      }
    }, { status: 500 })
  }
}
