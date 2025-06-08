'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  Zap, 
  Database, 
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'

interface UsageData {
  apiCalls: number
  bandwidth: number
  limits: {
    API_CALLS: number
    BANDWIDTH_MB: number
  }
  percentUsed: {
    apiCalls: number
    bandwidth: number
  }
  lastReset: string
}

export function UsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageData()
    // Refresh every 5 minutes
    const interval = setInterval(fetchUsageData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchUsageData = async () => {
    try {
      const response = await fetch('/api/admin/usage')
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Monitor</CardTitle>
          <CardDescription>Loading usage statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Monitor</CardTitle>
          <CardDescription>Unable to load usage data</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusColor = (percent: number) => {
    if (percent < 50) return 'text-green-600'
    if (percent < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (percent: number) => {
    if (percent < 80) return <CheckCircle className="w-4 h-4 text-green-600" />
    return <AlertTriangle className="w-4 h-4 text-red-600" />
  }

  const isNearLimit = usage.percentUsed.apiCalls > 80 || usage.percentUsed.bandwidth > 80

  return (
    <div className="space-y-6">
      {/* Alert if near limits */}
      {isNearLimit && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ You're approaching your daily limits. Consider optimizing usage or upgrading to Vercel Pro.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {usage.apiCalls.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(usage.percentUsed.apiCalls)}
                <span className={`text-sm ${getStatusColor(usage.percentUsed.apiCalls)}`}>
                  {usage.percentUsed.apiCalls.toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress value={usage.percentUsed.apiCalls} className="mb-2" />
            <p className="text-xs text-muted-foreground">
              {usage.apiCalls} / {usage.limits.API_CALLS} daily limit
            </p>
          </CardContent>
        </Card>

        {/* Bandwidth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {usage.bandwidth.toFixed(1)} MB
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(usage.percentUsed.bandwidth)}
                <span className={`text-sm ${getStatusColor(usage.percentUsed.bandwidth)}`}>
                  {usage.percentUsed.bandwidth.toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress value={usage.percentUsed.bandwidth} className="mb-2" />
            <p className="text-xs text-muted-foreground">
              {usage.bandwidth.toFixed(1)} / {usage.limits.BANDWIDTH_MB} MB daily limit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Optimization Tips</CardTitle>
          <CardDescription>
            Stay within Vercel's free tier limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <Zap className="w-4 h-4 mt-1 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Cache API Responses</p>
              <p className="text-xs text-muted-foreground">
                Reduce API calls by caching frequently requested data
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Database className="w-4 h-4 mt-1 text-green-500" />
            <div>
              <p className="text-sm font-medium">Optimize Images</p>
              <p className="text-xs text-muted-foreground">
                Use WebP format and appropriate sizes to reduce bandwidth
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Activity className="w-4 h-4 mt-1 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Limit Response Size</p>
              <p className="text-xs text-muted-foreground">
                Paginate large datasets and remove unnecessary fields
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <Badge variant={usage.percentUsed.apiCalls < 80 ? 'default' : 'destructive'}>
                API Calls: {usage.percentUsed.apiCalls < 80 ? 'Safe' : 'Warning'}
              </Badge>
            </div>
            <div>
              <Badge variant={usage.percentUsed.bandwidth < 80 ? 'default' : 'destructive'}>
                Bandwidth: {usage.percentUsed.bandwidth < 80 ? 'Safe' : 'Warning'}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Resets daily at midnight UTC
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
