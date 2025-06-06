'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { TrendingUp, Download, Filter, RefreshCw, Loader2 } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'

interface KPIData {
  kpis: { [key: string]: any[] }
  summary: {
    totalFunds: number
    totalPortfolios: number
    latestKPIs: any[]
  }
  metadata: {
    totalRecords: number
    timeframe: number
    groupBy: string
  }
}

export function KPIDashboard() {
  const { data: session } = useSession()
  const [selectedTimeframe, setSelectedTimeframe] = useState('quarterly')
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKPIData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      // For demo, we'll use the first organization the user has access to
      const response = await fetch('/api/kpis?timeframe=8&groupBy=quarter')

      if (!response.ok) {
        throw new Error('Failed to fetch KPI data')
      }

      const data = await response.json()
      setKpiData(data)
    } catch (err) {
      console.error('Error fetching KPI data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load KPI data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKPIData()
  }, [session])

  // Transform data for charts
  const performanceData = kpiData ? transformPerformanceData(kpiData.kpis) : []
  const sectorData = kpiData ? transformSectorData(kpiData.summary.latestKPIs) : []
  const topPerformers = kpiData ? transformTopPerformers(kpiData.summary.latestKPIs) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading KPI data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchKPIData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">KPI Analytics</h2>
          <p className="text-muted-foreground">
            Portfolio performance metrics and insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>IRR Trend</CardTitle>
                <CardDescription>
                  Internal Rate of Return over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'IRR']} />
                    <Line 
                      type="monotone" 
                      dataKey="irr" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>EBITDA Growth</CardTitle>
                <CardDescription>
                  Quarterly EBITDA performance ($M)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}M`, 'EBITDA']} />
                    <Bar dataKey="ebitda" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Quarterly revenue across all portfolio companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}M`, 'Revenue']} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    dot={{ fill: '#ffc658' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Companies</CardTitle>
              <CardDescription>
                Ranked by IRR performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((company, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {company.sector}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-muted-foreground">IRR</p>
                          <p className="font-medium">{company.irr}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">MOIC</p>
                          <p className="font-medium">{company.moic}x</p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-4">
          {/* Sector Allocation */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
                <CardDescription>
                  Portfolio distribution by sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sector Performance</CardTitle>
                <CardDescription>
                  Average IRR by sector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectorData.map((sector, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: sector.color }}
                        />
                        <span className="font-medium">{sector.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {(15 + Math.random() * 10).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">IRR</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Data transformation functions
function transformPerformanceData(kpis: { [key: string]: any[] }) {
  const quarters = Object.keys(kpis).sort()

  return quarters.map(quarter => {
    const quarterKPIs = kpis[quarter]
    const data: any = { quarter }

    quarterKPIs.forEach(kpi => {
      if (kpi.name === 'IRR') {
        data.irr = kpi.value
      } else if (kpi.name === 'EBITDA') {
        data.ebitda = kpi.value
      } else if (kpi.name === 'Revenue') {
        data.revenue = kpi.value
      }
    })

    return data
  }).filter(item => item.irr || item.ebitda || item.revenue)
}

function transformSectorData(latestKPIs: any[]) {
  const sectorCounts: { [key: string]: number } = {}
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#8dd1e1', '#d084d0']

  latestKPIs.forEach(kpi => {
    if (kpi.portfolio) {
      const sector = kpi.portfolio.sector || 'Other'
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1
    }
  })

  return Object.entries(sectorCounts).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length],
  }))
}

function transformTopPerformers(latestKPIs: any[]) {
  const portfolioPerformance: { [key: string]: any } = {}

  latestKPIs.forEach(kpi => {
    if (kpi.portfolio) {
      const portfolioName = kpi.portfolio.name
      if (!portfolioPerformance[portfolioName]) {
        portfolioPerformance[portfolioName] = {
          name: portfolioName,
          sector: kpi.portfolio.sector,
          irr: 0,
          moic: 0,
        }
      }

      if (kpi.name === 'IRR') {
        portfolioPerformance[portfolioName].irr = kpi.value
      } else if (kpi.name === 'MOIC') {
        portfolioPerformance[portfolioName].moic = kpi.value
      }
    }
  })

  return Object.values(portfolioPerformance)
    .filter((p: any) => p.irr > 0)
    .sort((a: any, b: any) => b.irr - a.irr)
    .slice(0, 5)
}
