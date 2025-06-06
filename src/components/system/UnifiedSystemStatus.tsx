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
import { systemCoordinator, SystemStatus } from '@/lib/system/SystemCoordinator'

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
      const newStatus = await systemCoordinator.checkSystemHealth()
      setStatus(newStatus)
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
    
    switch (status.overall) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default:
        return <XCircle className="w-5 h-5 text-red-600" />
    }
  }

  const getStatusText = () => {
    if (!status) return 'Checking system status...'
    
    switch (status.overall) {
      case 'healthy':
        return 'All Systems Operational'
      case 'partial':
        return 'Partial Functionality'
      default:
        return 'System Issues Detected'
    }
  }

  const getStatusColor = () => {
    if (!status) return 'border-l-gray-400'
    
    switch (status.overall) {
      case 'healthy':
        return 'border-l-green-500'
      case 'partial':
        return 'border-l-orange-500'
      default:
        return 'border-l-red-500'
    }
  }

  const getCapabilityStatus = (capability: keyof SystemStatus['capabilities']) => {
    return status?.capabilities[capability] ? '✓' : '✗'
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
                  <span>Data {status?.services.database ? '✓' : '✗'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Brain className="w-3 h-3" />
                  <span>AI {status?.services.ai ? '✓' : '✗'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>API {status?.services.api ? '✓' : '✗'}</span>
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
                Last checked: {status ? new Date(status.lastCheck).toLocaleTimeString() : 'Never'}
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
            <Badge variant={status?.services.database ? 'default' : 'destructive'}>
              {status?.services.database ? 'Connected' : 'Offline'}
            </Badge>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <Brain className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="font-medium">AI Engine</div>
            <Badge variant={status?.services.ai ? 'default' : 'secondary'}>
              {status?.services.ai ? 'Active' : 'Unavailable'}
            </Badge>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <Zap className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="font-medium">API</div>
            <Badge variant={status?.services.api ? 'default' : 'destructive'}>
              {status?.services.api ? 'Healthy' : 'Error'}
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
