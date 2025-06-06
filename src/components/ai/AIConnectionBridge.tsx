"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Brain, 
  Activity, 
  ArrowRight, 
  Zap, 
  MessageSquare,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface AIConnectionBridgeProps {
  currentPage?: 'assistant' | 'dashboard' | 'other'
}

interface ConnectionTest {
  name: string
  status: 'pending' | 'success' | 'error'
  message: string
  duration?: number
}

export function AIConnectionBridge({ currentPage = 'other' }: AIConnectionBridgeProps) {
  const [testing, setTesting] = useState(false)
  const [tests, setTests] = useState<ConnectionTest[]>([
    { name: 'Llama AI Engine', status: 'pending', message: 'Checking connection...' },
    { name: 'Portfolio Database', status: 'pending', message: 'Verifying data access...' },
    { name: 'KPI Analysis', status: 'pending', message: 'Testing analysis capabilities...' },
    { name: 'AI Dashboard Sync', status: 'pending', message: 'Validating dashboard integration...' }
  ])
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'partial' | 'error'>('error')

  useEffect(() => {
    runConnectionTests()
  }, [])

  const runConnectionTests = async () => {
    setTesting(true)
    const updatedTests: ConnectionTest[] = []

    // Test 1: Llama AI Engine
    try {
      const startTime = Date.now()
      const response = await fetch('/api/demo/llama-chat')
      const data = await response.json()
      const duration = Date.now() - startTime
      
      updatedTests.push({
        name: 'Llama AI Engine',
        status: data.llamaAvailable ? 'success' : 'error',
        message: data.llamaAvailable 
          ? `Connected successfully (${duration}ms)` 
          : 'Llama AI not available - running in demo mode',
        duration
      })
    } catch (error) {
      updatedTests.push({
        name: 'Llama AI Engine',
        status: 'error',
        message: 'Connection failed'
      })
    }

    // Test 2: Portfolio Database
    try {
      const startTime = Date.now()
      const response = await fetch('/api/portfolios')
      const data = await response.json()
      const duration = Date.now() - startTime
      
      updatedTests.push({
        name: 'Portfolio Database',
        status: data.success ? 'success' : 'error',
        message: data.success 
          ? `Database connected (${data.data?.length || 0} portfolios, ${duration}ms)` 
          : 'Database connection failed',
        duration
      })
    } catch (error) {
      updatedTests.push({
        name: 'Portfolio Database',
        status: 'error',
        message: 'Database unreachable'
      })
    }

    // Test 3: KPI Analysis
    try {
      const startTime = Date.now()
      const response = await fetch('/api/demo/kpis')
      const data = await response.json()
      const duration = Date.now() - startTime
      
      updatedTests.push({
        name: 'KPI Analysis',
        status: data.success ? 'success' : 'error',
        message: data.success 
          ? `KPI system operational (${data.data?.length || 0} KPIs, ${duration}ms)` 
          : 'KPI analysis unavailable',
        duration
      })
    } catch (error) {
      updatedTests.push({
        name: 'KPI Analysis',
        status: 'error',
        message: 'KPI system error'
      })
    }

    // Test 4: AI Dashboard Integration
    try {
      const startTime = Date.now()
      const response = await fetch('/api/demo/llama-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'Test dashboard integration',
          context: 'integration_test'
        })
      })
      const data = await response.json()
      const duration = Date.now() - startTime
      
      updatedTests.push({
        name: 'AI Dashboard Sync',
        status: data.success ? 'success' : 'error',
        message: data.success 
          ? `Dashboard integration working (${duration}ms)` 
          : 'Dashboard sync failed',
        duration
      })
    } catch (error) {
      updatedTests.push({
        name: 'AI Dashboard Sync',
        status: 'error',
        message: 'Integration test failed'
      })
    }

    setTests(updatedTests)
    
    // Calculate overall health
    const successCount = updatedTests.filter(t => t.status === 'success').length
    if (successCount === updatedTests.length) {
      setOverallHealth('healthy')
    } else if (successCount >= 2) {
      setOverallHealth('partial')
    } else {
      setOverallHealth('error')
    }
    
    setTesting(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
    }
  }

  const getHealthBadge = () => {
    switch (overallHealth) {
      case 'healthy':
        return <Badge className="bg-green-600">All Systems Operational</Badge>
      case 'partial':
        return <Badge variant="secondary" className="bg-orange-600 text-white">Partial Functionality</Badge>
      default:
        return <Badge variant="destructive">System Issues</Badge>
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <CardTitle>AI System Integration</CardTitle>
          </div>
          {getHealthBadge()}
        </div>
        <CardDescription>
          Real-time connection status between AI Assistant and AI Dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Connection Tests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">System Health Checks</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={runConnectionTests}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {testing ? 'Testing...' : 'Retest'}
              </Button>
            </div>
            
            <div className="space-y-2">
              {tests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <div className="font-medium text-sm">{test.name}</div>
                      <div className="text-xs text-muted-foreground">{test.message}</div>
                    </div>
                  </div>
                  {test.duration && (
                    <div className="text-xs text-muted-foreground">
                      {test.duration}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Integration Flow */}
          <div className="space-y-3">
            <h4 className="font-medium">Integration Flow</h4>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span className="font-medium">AI Assistant</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Llama AI</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span className="font-medium">AI Dashboard</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="font-medium">Quick Navigation</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant={currentPage === 'assistant' ? 'default' : 'outline'} 
                className="justify-start h-auto p-4"
                asChild
              >
                <a href="/ai-assistant">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">AI Assistant</div>
                      <div className="text-xs opacity-70">Chat & Analysis</div>
                    </div>
                  </div>
                </a>
              </Button>
              
              <Button 
                variant={currentPage === 'dashboard' ? 'default' : 'outline'} 
                className="justify-start h-auto p-4"
                asChild
              >
                <a href="/ai-dashboard">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">AI Dashboard</div>
                      <div className="text-xs opacity-70">Analytics & Insights</div>
                    </div>
                  </div>
                </a>
              </Button>
            </div>
          </div>

          {/* Status Alert */}
          {overallHealth === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Integration Issues Detected</AlertTitle>
              <AlertDescription>
                Some AI systems are not functioning properly. Please check your configuration or contact support.
              </AlertDescription>
            </Alert>
          )}
          
          {overallHealth === 'partial' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Partial Functionality</AlertTitle>
              <AlertDescription>
                Core systems are working but some AI features may be limited. Consider checking Llama AI configuration.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
