"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Brain, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  Database,
  MessageSquare
} from 'lucide-react'

interface AIStatus {
  llamaAvailable: boolean
  databaseConnected: boolean
  apiHealthy: boolean
  lastCheck: string
  processingTime?: number
  error?: string
}

interface AIIntegrationStatusProps {
  showActions?: boolean
  compact?: boolean
}

export function AIIntegrationStatus({ showActions = true, compact = false }: AIIntegrationStatusProps) {
  const [status, setStatus] = useState<AIStatus>({
    llamaAvailable: false,
    databaseConnected: false,
    apiHealthy: false,
    lastCheck: new Date().toISOString()
  })
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    checkAIStatus()

    if (autoRefresh) {
      const interval = setInterval(checkAIStatus, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }

    return undefined // Explicit return for when autoRefresh is false
  }, [autoRefresh])

  const checkAIStatus = async () => {
    setLoading(true)
    try {
      // Check Llama AI status
      const llamaResponse = await fetch('/api/demo/llama-chat')
      const llamaData = await llamaResponse.json()
      
      // Check database connection
      const dbResponse = await fetch('/api/portfolios')
      const dbData = await dbResponse.json()
      
      setStatus({
        llamaAvailable: llamaData.llamaAvailable || false,
        databaseConnected: dbData.success || false,
        apiHealthy: llamaResponse.ok && dbResponse.ok,
        lastCheck: new Date().toISOString(),
        processingTime: llamaData.metadata?.processingTime,
        error: llamaData.error || dbData.error
      })
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        llamaAvailable: false,
        databaseConnected: false,
        apiHealthy: false,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Connection failed'
      }))
    } finally {
      setLoading(false)
    }
  }

  const getOverallStatus = () => {
    if (status.llamaAvailable && status.databaseConnected && status.apiHealthy) {
      return { status: 'healthy', color: 'green', icon: CheckCircle, text: 'All Systems Operational' }
    } else if (status.databaseConnected && status.apiHealthy) {
      return { status: 'partial', color: 'orange', icon: AlertTriangle, text: 'Partial Functionality' }
    } else {
      return { status: 'error', color: 'red', icon: XCircle, text: 'System Issues Detected' }
    }
  }

  const overall = getOverallStatus()
  const OverallIcon = overall.icon

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <OverallIcon className={`w-4 h-4 ${
          overall.color === 'green' ? 'text-green-600' :
          overall.color === 'orange' ? 'text-orange-600' : 'text-red-600'
        }`} />
        <span className="text-sm font-medium">{overall.text}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkAIStatus}
          disabled={loading}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    )
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <OverallIcon className={`w-5 h-5 ${
              overall.color === 'green' ? 'text-green-600' :
              overall.color === 'orange' ? 'text-orange-600' : 'text-red-600'
            }`} />
            <CardTitle>AI Integration Status</CardTitle>
          </div>
          <Badge variant={overall.color === 'green' ? 'default' : 'destructive'}>
            {overall.text}
          </Badge>
        </div>
        <CardDescription>
          Real-time status of AI Assistant and Dashboard integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Llama AI Status */}
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Brain className={`w-5 h-5 ${status.llamaAvailable ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <div className="font-medium text-sm">Llama AI</div>
                <div className={`text-xs ${status.llamaAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {status.llamaAvailable ? 'Connected' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Database Status */}
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Database className={`w-5 h-5 ${status.databaseConnected ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <div className="font-medium text-sm">Database</div>
                <div className={`text-xs ${status.databaseConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {status.databaseConnected ? 'Connected' : 'Offline'}
                </div>
              </div>
            </div>

            {/* API Status */}
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Zap className={`w-5 h-5 ${status.apiHealthy ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <div className="font-medium text-sm">API Health</div>
                <div className={`text-xs ${status.apiHealthy ? 'text-green-600' : 'text-red-600'}`}>
                  {status.apiHealthy ? 'Healthy' : 'Issues'}
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {status.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>System Error</AlertTitle>
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}

          {/* Performance Metrics */}
          {status.processingTime && (
            <div className="text-sm text-muted-foreground">
              Last AI response time: {status.processingTime}ms
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkAIStatus}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Auto-refresh: {autoRefresh ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Last checked: {new Date(status.lastCheck).toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/ai-assistant">
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Assistant
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/ai-dashboard">
                <Activity className="w-4 h-4 mr-2" />
                AI Dashboard
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
