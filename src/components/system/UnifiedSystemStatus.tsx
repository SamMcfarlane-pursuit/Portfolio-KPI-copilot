"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Brain,
  Database,
  Zap,
  Activity
} from 'lucide-react'


interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  database: { status: string; message?: string }
  ai: { status: string; message?: string }
  system: { status: string; message?: string }
  timestamp: string
}

interface UnifiedSystemStatusProps {
  variant?: 'full' | 'compact'
  showRefresh?: boolean
}

export function UnifiedSystemStatus({ 
  variant = 'compact', 
  showRefresh = true 
}: UnifiedSystemStatusProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const checkSystemHealth = async () => {
    setLoading(true)
    try {
      // Call the health API
      const response = await fetch('/api/health')
      if (response.ok) {
        const data = await response.json()
        setStatus(data.services || {})
      }
    } catch (error) {
      console.error('Failed to check system health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSystemHealth()
    
    // Set up periodic checks
    const interval = setInterval(checkSystemHealth, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    if (!status) return <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />

    // Check if all services are healthy
    const services = Object.values(status)
    const allHealthy = services.every((service: any) => service.status === 'healthy')
    const anyUnhealthy = services.some((service: any) => service.status === 'unhealthy')

    if (allHealthy) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    } else if (anyUnhealthy) {
      return <XCircle className="w-5 h-5 text-red-600" />
    } else {
      return <AlertTriangle className="w-5 h-5 text-orange-600" />
    }
  }

  const getStatusText = () => {
    if (!status) return 'Checking system status...'

    // Check if all services are healthy
    const services = Object.values(status)
    const allHealthy = services.every((service: any) => service.status === 'healthy')
    const anyUnhealthy = services.some((service: any) => service.status === 'unhealthy')

    if (allHealthy) {
      return 'All Systems Operational'
    } else if (anyUnhealthy) {
      return 'System Issues Detected'
    } else {
      return 'Partial Functionality'
    }
  }

  const getStatusColor = () => {
    if (!status) return 'border-l-gray-400'

    // Check if all services are healthy
    const services = Object.values(status)
    const allHealthy = services.every((service: any) => service.status === 'healthy')
    const anyUnhealthy = services.some((service: any) => service.status === 'unhealthy')

    if (allHealthy) {
      return 'border-l-green-500'
    } else if (anyUnhealthy) {
      return 'border-l-red-500'
    } else {
      return 'border-l-orange-500'
    }
  }

  const getCapabilityStatus = (serviceName: string) => {
    if (!status || !status[serviceName as keyof typeof status]) return '✗'
    const service = status[serviceName as keyof typeof status] as any
    return service.status === 'healthy' ? '✓' : '✗'
  }

  if (variant === 'compact') {
    return (
      <Card className={`border-l-4 ${getStatusColor()}`}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <div className="font-medium">{getStatusText()}</div>
              <div className="text-sm text-muted-foreground flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Database className="w-3 h-3" />
                  <span>Data {getCapabilityStatus('database')}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Brain className="w-3 h-3" />
                  <span>AI {getCapabilityStatus('ai')}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>Auth {getCapabilityStatus('auth')}</span>
                </span>
              </div>
            </div>
          </div>
          {showRefresh && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={checkSystemHealth}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-l-4 ${getStatusColor()}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold">{getStatusText()}</h3>
              <p className="text-sm text-muted-foreground">
                Last checked: {status ? new Date().toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>
          {showRefresh && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={checkSystemHealth}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {/* Services Status */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 border rounded-lg">
            <Database className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="font-medium">Database</div>
            <Badge variant={getCapabilityStatus('database') === '✓' ? 'default' : 'destructive'}>
              {getCapabilityStatus('database') === '✓' ? 'Connected' : 'Offline'}
            </Badge>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <Brain className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="font-medium">AI Engine</div>
            <Badge variant={getCapabilityStatus('ai') === '✓' ? 'default' : 'secondary'}>
              {getCapabilityStatus('ai') === '✓' ? 'Active' : 'Unavailable'}
            </Badge>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <Zap className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="font-medium">API</div>
            <Badge variant={getCapabilityStatus('auth') === '✓' ? 'default' : 'destructive'}>
              {getCapabilityStatus('auth') === '✓' ? 'Healthy' : 'Error'}
            </Badge>
          </div>
        </div>

        {/* Capabilities */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Available Features</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <span>{getCapabilityStatus('aiChat')}</span>
              <span>AI Chat</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>{getCapabilityStatus('dataEntry')}</span>
              <span>Data Entry</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>{getCapabilityStatus('analytics')}</span>
              <span>Analytics</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
