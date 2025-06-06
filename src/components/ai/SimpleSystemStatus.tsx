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
  Zap
} from 'lucide-react'

interface SystemHealth {
  overall: 'healthy' | 'partial' | 'error'
  database: boolean
  ai: boolean
  api: boolean
  lastCheck: string
}

export function SimpleSystemStatus() {
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'error',
    database: false,
    ai: false,
    api: false,
    lastCheck: new Date().toISOString()
  })
  const [loading, setLoading] = useState(false)

  const checkSystemHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      
      const dbHealthy = data.services?.database?.status === 'healthy'
      const aiHealthy = data.services?.llama?.status === 'healthy'
      const apiHealthy = data.success && response.ok
      
      let overall: 'healthy' | 'partial' | 'error' = 'error'
      if (dbHealthy && aiHealthy && apiHealthy) {
        overall = 'healthy'
      } else if (dbHealthy && apiHealthy) {
        overall = 'partial'
      }
      
      setHealth({
        overall,
        database: dbHealthy,
        ai: aiHealthy,
        api: apiHealthy,
        lastCheck: new Date().toISOString()
      })
    } catch (error) {
      setHealth(prev => ({
        ...prev,
        overall: 'error',
        database: false,
        ai: false,
        api: false,
        lastCheck: new Date().toISOString()
      }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSystemHealth()
  }, [])

  const getStatusIcon = () => {
    switch (health.overall) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default:
        return <XCircle className="w-5 h-5 text-red-600" />
    }
  }

  const getStatusText = () => {
    switch (health.overall) {
      case 'healthy':
        return 'All Systems Operational'
      case 'partial':
        return 'Partial Functionality'
      default:
        return 'System Issues Detected'
    }
  }

  const getStatusColor = () => {
    switch (health.overall) {
      case 'healthy':
        return 'border-l-green-500'
      case 'partial':
        return 'border-l-orange-500'
      default:
        return 'border-l-red-500'
    }
  }

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
                <span>Database {health.database ? '✓' : '✗'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Brain className="w-3 h-3" />
                <span>AI {health.ai ? '✓' : '✗'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>API {health.api ? '✓' : '✗'}</span>
              </span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={checkSystemHealth}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardContent>
    </Card>
  )
}
