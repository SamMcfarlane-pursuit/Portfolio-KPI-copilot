"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  Calendar
} from 'lucide-react'

interface Portfolio {
  id: string
  name: string
  sector: string
  investment: number
  status: string
  geography?: string
}

interface KPI {
  id: string
  name: string
  value: number
  unit: string
  category: string
  period: string
}

interface PerformanceData {
  portfolioId: string
  portfolioName: string
  currentValue: number
  growth: number
  irr: number
}

interface OriginalDataViewProps {
  portfolios: Portfolio[]
  totalInvestment: number
  totalKPIs: number
  latestKPIs: KPI[]
  portfolioPerformance: PerformanceData[]
}

export function OriginalDataView({
  portfolios,
  totalInvestment,
  totalKPIs,
  latestKPIs,
  portfolioPerformance
}: OriginalDataViewProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolios.length}</div>
            <p className="text-xs text-muted-foreground">
              Active investments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalInvestment / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              Deployed capital
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKPIs}</div>
            <p className="text-xs text-muted-foreground">
              Tracked metrics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioPerformance.length > 0 
                ? `${(portfolioPerformance.reduce((sum, p) => sum + p.irr, 0) / portfolioPerformance.length).toFixed(1)}%`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average IRR
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolios List */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Companies</CardTitle>
          <CardDescription>
            Overview of all portfolio investments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolios.map((portfolio) => (
              <div key={portfolio.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{portfolio.name}</h3>
                    <p className="text-sm text-muted-foreground">{portfolio.sector}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium">${(portfolio.investment / 1000000).toFixed(1)}M</p>
                    <p className="text-sm text-muted-foreground">{portfolio.geography || 'Global'}</p>
                  </div>
                  <Badge variant={portfolio.status === 'Active' ? 'default' : 'secondary'}>
                    {portfolio.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latest KPIs */}
      {latestKPIs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest KPIs</CardTitle>
            <CardDescription>
              Most recent performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestKPIs.slice(0, 6).map((kpi) => (
                <div key={kpi.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{kpi.name}</h4>
                    <Badge variant="outline">{kpi.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {kpi.value.toLocaleString()} {kpi.unit}
                    </span>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(kpi.period).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
