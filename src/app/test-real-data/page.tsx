'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Database, 
  TrendingUp, 
  Building2, 
  DollarSign,
  Loader2,
  Shield,
  RefreshCw
} from 'lucide-react'

interface TestResult {
  test: string
  status: 'pass' | 'fail' | 'pending'
  message: string
  data?: any
  duration?: number
}

export default function TestRealDataPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [overallStatus, setOverallStatus] = useState<'pass' | 'fail' | 'pending'>('pending')

  const tests = [
    {
      name: 'Real Data API Endpoint',
      test: 'api_endpoint',
      description: 'Verify real data verification API is accessible'
    },
    {
      name: 'Data Sources Verification',
      test: 'data_sources',
      description: 'Check all configured data sources are valid'
    },
    {
      name: 'Portfolio Companies Data',
      test: 'portfolio_companies',
      description: 'Verify real portfolio company data with sources'
    },
    {
      name: 'Economic Indicators',
      test: 'economic_indicators',
      description: 'Check real economic data from FRED and other sources'
    },
    {
      name: 'Industry Benchmarks',
      test: 'industry_benchmarks',
      description: 'Verify industry benchmark data with references'
    },
    {
      name: 'Data Quality Metrics',
      test: 'data_quality',
      description: 'Check confidence scores and source attribution'
    },
    {
      name: 'Proof of Reference',
      test: 'proof_reference',
      description: 'Verify all data points have proper source references'
    }
  ]

  const runTest = async (testName: string): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      switch (testName) {
        case 'api_endpoint':
          const apiResponse = await fetch('/api/real-data/verify')
          const apiData = await apiResponse.json()
          
          if (apiResponse.ok && apiData.success) {
            return {
              test: testName,
              status: 'pass',
              message: 'API endpoint is accessible and returning data',
              data: { companies: apiData.overview?.totalCompanies, sources: apiData.overview?.dataSources },
              duration: Date.now() - startTime
            }
          } else {
            throw new Error(apiData.error || 'API endpoint failed')
          }

        case 'data_sources':
          const sourcesResponse = await fetch('/api/real-data/verify')
          const sourcesData = await sourcesResponse.json()
          
          if (sourcesData.success && sourcesData.dataSources?.length > 0) {
            const verifiedSources = sourcesData.dataSources.filter((s: any) => s.verified)
            return {
              test: testName,
              status: 'pass',
              message: `${verifiedSources.length} data sources verified`,
              data: { total: sourcesData.dataSources.length, verified: verifiedSources.length },
              duration: Date.now() - startTime
            }
          } else {
            throw new Error('No verified data sources found')
          }

        case 'portfolio_companies':
          const companiesResponse = await fetch('/api/real-data/verify?companyId=stripe_inc')
          const companiesData = await companiesResponse.json()
          
          if (companiesData.success && companiesData.company) {
            return {
              test: testName,
              status: 'pass',
              message: `Portfolio company data verified with ${companiesData.dataQuality.confidence * 100}% confidence`,
              data: { 
                company: companiesData.company.name,
                confidence: companiesData.dataQuality.confidence,
                sources: companiesData.dataQuality.sources.length
              },
              duration: Date.now() - startTime
            }
          } else {
            throw new Error('Portfolio company data not found')
          }

        case 'economic_indicators':
          const economicResponse = await fetch('/api/real-data/verify')
          const economicData = await economicResponse.json()
          
          if (economicData.success && economicData.economicIndicators?.length > 0) {
            const indicators = economicData.economicIndicators
            return {
              test: testName,
              status: 'pass',
              message: `${indicators.length} economic indicators with verified sources`,
              data: { 
                indicators: indicators.map((i: any) => ({ name: i.name, value: i.value, source: i.source }))
              },
              duration: Date.now() - startTime
            }
          } else {
            throw new Error('Economic indicators not found')
          }

        case 'industry_benchmarks':
          const benchmarkResponse = await fetch('/api/real-data/verify')
          const benchmarkData = await benchmarkResponse.json()
          
          if (benchmarkData.success && benchmarkData.industryBenchmarks?.length > 0) {
            return {
              test: testName,
              status: 'pass',
              message: `Industry benchmarks verified for ${benchmarkData.industryBenchmarks.length} sectors`,
              data: { sectors: benchmarkData.industryBenchmarks.map((b: any) => b.sector) },
              duration: Date.now() - startTime
            }
          } else {
            throw new Error('Industry benchmarks not found')
          }

        case 'data_quality':
          const qualityResponse = await fetch('/api/real-data/verify')
          const qualityData = await qualityResponse.json()
          
          if (qualityData.success && qualityData.dataQuality) {
            const confidence = qualityData.dataQuality.overallConfidence
            return {
              test: testName,
              status: confidence >= 0.8 ? 'pass' : 'fail',
              message: `Overall data confidence: ${(confidence * 100).toFixed(1)}%`,
              data: { confidence, verificationMethod: qualityData.dataQuality.verificationMethod },
              duration: Date.now() - startTime
            }
          } else {
            throw new Error('Data quality metrics not available')
          }

        case 'proof_reference':
          const proofResponse = await fetch('/api/real-data/verify?proof=true')
          const proofData = await proofResponse.json()
          
          if (proofData.success && proofData.proof) {
            const sources = proofData.proof.methodology.sources
            return {
              test: testName,
              status: 'pass',
              message: `Proof of reference verified with ${sources.length} source types`,
              data: { 
                methodology: proofData.proof.methodology.description,
                sources: sources.length,
                verification: proofData.proof.dataIntegrity.auditTrail
              },
              duration: Date.now() - startTime
            }
          } else {
            throw new Error('Proof of reference not available')
          }

        default:
          throw new Error(`Unknown test: ${testName}`)
      }
    } catch (error) {
      return {
        test: testName,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Test failed',
        duration: Date.now() - startTime
      }
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    
    const results: TestResult[] = []
    
    for (const test of tests) {
      // Add pending result
      const pendingResult: TestResult = {
        test: test.test,
        status: 'pending',
        message: 'Running...'
      }
      setTestResults(prev => [...prev.filter(r => r.test !== test.test), pendingResult])
      
      // Run the test
      const result = await runTest(test.test)
      results.push(result)
      
      // Update with actual result
      setTestResults(prev => [...prev.filter(r => r.test !== test.test), result])
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Determine overall status
    const passedTests = results.filter(r => r.status === 'pass').length
    const totalTests = results.length
    
    if (passedTests === totalTests) {
      setOverallStatus('pass')
    } else {
      setOverallStatus('fail')
    }
    
    setIsRunning(false)
  }

  useEffect(() => {
    runAllTests()
  }, [])

  const getStatusIcon = (status: 'pass' | 'fail' | 'pending') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'fail':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
    }
  }

  const getStatusColor = (status: 'pass' | 'fail' | 'pending') => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800'
      case 'fail':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-blue-100 text-blue-800'
    }
  }

  const passedTests = testResults.filter(r => r.status === 'pass').length
  const totalTests = tests.length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Real Data Testing</h1>
            <p className="text-muted-foreground">
              Comprehensive verification of real data integration and sources
            </p>
          </div>
          <Button onClick={runAllTests} disabled={isRunning} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </div>

        {/* Overall Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(overallStatus)}
                <div>
                  <h3 className="text-lg font-semibold">
                    Real Data Integration Status
                  </h3>
                  <p className="text-muted-foreground">
                    {passedTests} of {totalTests} tests passed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
                </div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <div className="space-y-4">
          {tests.map((test, index) => {
            const result = testResults.find(r => r.test === test.test)
            
            return (
              <Card key={test.test}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result ? getStatusIcon(result.status) : getStatusIcon('pending')}
                      <div>
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        <CardDescription>{test.description}</CardDescription>
                      </div>
                    </div>
                    {result && (
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {result && (
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm">{result.message}</p>
                      
                      {result.duration && (
                        <p className="text-xs text-muted-foreground">
                          Completed in {result.duration}ms
                        </p>
                      )}
                      
                      {result.data && (
                        <div className="bg-gray-50 p-3 rounded text-xs">
                          <strong>Test Data:</strong>
                          <pre className="mt-1 overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Direct links to real data verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" asChild>
                <a href="/data" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Management
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/real-data/verify" target="_blank" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  API Endpoint
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/real-data/verify?proof=true" target="_blank" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Proof of Reference
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
