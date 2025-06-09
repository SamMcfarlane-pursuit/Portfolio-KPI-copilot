'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity,
  DollarSign,
  Target,
  Zap,
  Download,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'

const performanceData = [
  { month: 'Jan', revenue: 4000, growth: 2400, valuation: 8000 },
  { month: 'Feb', revenue: 3000, growth: 1398, valuation: 8500 },
  { month: 'Mar', revenue: 2000, growth: 9800, valuation: 9200 },
  { month: 'Apr', revenue: 2780, growth: 3908, valuation: 9800 },
  { month: 'May', revenue: 1890, growth: 4800, valuation: 10500 },
  { month: 'Jun', revenue: 2390, growth: 3800, valuation: 11200 },
]

const sectorData = [
  { name: 'Technology', value: 35, color: '#3b82f6' },
  { name: 'Healthcare', value: 25, color: '#10b981' },
  { name: 'Finance', value: 20, color: '#f59e0b' },
  { name: 'Consumer', value: 15, color: '#ef4444' },
  { name: 'Other', value: 5, color: '#8b5cf6' },
]

const kpiData = [
  { name: 'Revenue Growth', current: 24.5, target: 30, unit: '%' },
  { name: 'EBITDA Margin', current: 18.2, target: 20, unit: '%' },
  { name: 'Customer Acquisition', current: 1250, target: 1500, unit: 'customers' },
  { name: 'Burn Rate', current: 85000, target: 75000, unit: 'USD' },
]

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const refreshData = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getKPIStatus = (current: number, target: number, unit: string) => {
    const percentage = (current / target) * 100
    if (unit === 'USD' && current > target) {
      // For burn rate, lower is better
      return percentage > 110 ? 'danger' : percentage > 100 ? 'warning' : 'success'
    }
    return percentage >= 90 ? 'success' : percentage >= 70 ? 'warning' : 'danger'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'danger':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Advanced insights and performance analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$47.2M</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.5%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> from last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">+3</span> new this quarter
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
              Actionable recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sectors">Sector Analysis</TabsTrigger>
          <TabsTrigger value="kpis">KPI Tracking</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance Trends</CardTitle>
                <CardDescription>
                  Revenue, growth, and valuation over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="growth" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="valuation" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Growth Comparison</CardTitle>
                <CardDescription>
                  Month-over-month growth analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="growth" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sector Distribution</CardTitle>
                <CardDescription>
                  Portfolio allocation by sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sector Performance</CardTitle>
                <CardDescription>
                  Performance metrics by sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectorData.map((sector) => (
                    <div key={sector.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: sector.color }}
                        />
                        <span className="font-medium">{sector.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{sector.value}%</p>
                        <p className="text-sm text-muted-foreground">
                          +{Math.floor(Math.random() * 10)}% growth
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {kpiData.map((kpi) => {
              const status = getKPIStatus(kpi.current, kpi.target, kpi.unit)
              const percentage = (kpi.current / kpi.target) * 100
              
              return (
                <Card key={kpi.name}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                    <Badge className={getStatusColor(status)}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {kpi.unit === 'USD' ? formatCurrency(kpi.current) : 
                       kpi.unit === '%' ? `${kpi.current}%` : 
                       kpi.current.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Target: {kpi.unit === 'USD' ? formatCurrency(kpi.target) : 
                                kpi.unit === '%' ? `${kpi.target}%` : 
                                kpi.target.toLocaleString()}
                      </span>
                      <span>{percentage.toFixed(1)}% of target</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          status === 'success' ? 'bg-green-500' :
                          status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Predictions</CardTitle>
              <CardDescription>
                Machine learning insights and forecasts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold">Revenue Forecast</h3>
                    <Badge variant="outline">High Confidence</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Based on current trends, portfolio revenue is projected to grow by 28% in Q4, 
                    driven primarily by technology sector companies.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold">Investment Opportunity</h3>
                    <Badge variant="outline">Medium Confidence</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    AI analysis suggests increasing allocation to healthcare sector companies, 
                    which show 15% higher growth potential than current portfolio average.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold">Risk Alert</h3>
                    <Badge variant="outline">Medium Confidence</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Three portfolio companies show elevated burn rates. Consider implementing 
                    cost optimization strategies to extend runway by 6-8 months.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
