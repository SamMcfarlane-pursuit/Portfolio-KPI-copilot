'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Building2,
  Activity,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Plus,
  Zap
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalPortfolioValue: number
  totalCompanies: number
  avgGrowthRate: number
  activeAlerts: number
  recentActivity: number
}

interface RecentActivity {
  id: string
  type: 'kpi_update' | 'new_company' | 'alert' | 'report'
  title: string
  description: string
  timestamp: Date
  status: 'success' | 'warning' | 'info'
}

export function DashboardOverview() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalPortfolioValue: 47200000,
    totalCompanies: 23,
    avgGrowthRate: 24.5,
    activeAlerts: 3,
    recentActivity: 12
  })
  const [activities, setActivities] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'kpi_update',
      title: 'TechCorp Q3 Results',
      description: 'Revenue increased by 45% QoQ',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'success'
    },
    {
      id: '2',
      type: 'alert',
      title: 'HealthStart Burn Rate Alert',
      description: 'Current runway: 8 months',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'warning'
    },
    {
      id: '3',
      type: 'new_company',
      title: 'New Portfolio Addition',
      description: 'FinanceFlow added to portfolio',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'info'
    }
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'kpi_update':
        return <TrendingUp className="w-4 h-4" />
      case 'new_company':
        return <Building2 className="w-4 h-4" />
      case 'alert':
        return <AlertTriangle className="w-4 h-4" />
      case 'report':
        return <BarChart3 className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'info':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your portfolio today
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/ai-assistant">
              <Brain className="w-4 h-4 mr-2" />
              Ask AI
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/portfolio">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPortfolioValue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">+3</span> new this quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgGrowthRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> from last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87</div>
            <p className="text-xs text-muted-foreground">
              New recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/reports">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Report
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/data">
                <Activity className="w-4 h-4 mr-2" />
                Update KPIs
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/system">
                <CheckCircle className="w-4 h-4 mr-2" />
                System Health
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates and changes in your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-500" />
            AI Insights
            <Badge variant="outline" className="ml-2">
              <Zap className="w-3 h-3 mr-1" />
              Powered by AI
            </Badge>
          </CardTitle>
          <CardDescription>
            Latest AI-generated insights and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h4 className="font-medium text-sm">Growth Opportunity</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                TechCorp shows 45% QoQ growth, consider increasing allocation
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <h4 className="font-medium text-sm">Risk Alert</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                HealthStart burn rate suggests 8-month runway
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <h4 className="font-medium text-sm">Market Trend</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Healthcare sector showing 15% above-average growth
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button asChild>
              <Link href="/ai-assistant">
                <Brain className="w-4 h-4 mr-2" />
                Explore AI Assistant
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
