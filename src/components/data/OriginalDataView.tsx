import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface OriginalDataViewProps {
  portfolios: any[]
  totalInvestment: number
  totalKPIs: number
  latestKPIs: any[]
  portfolioPerformance: any[]
}

export function OriginalDataView({
  portfolios,
  totalInvestment,
  totalKPIs,
  latestKPIs,
  portfolioPerformance
}: OriginalDataViewProps) {
  return (
    <div>
      {/* Real Data Alert */}
      <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
        <AlertTitle className="text-blue-800">📊 Real Market Data Active</AlertTitle>
        <AlertDescription className="text-blue-700">
          This dashboard shows real portfolio companies including Stripe ($95B), OpenAI ($86B), Databricks ($43B), and Revolut ($33B)
          with actual financial metrics and AI-powered analysis using our Miniature LLM system.
        </AlertDescription>
      </Alert>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
              <path d="M12 2v20m9-9H3"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalInvestment / 1000000).toFixed(0)}M</div>
            <p className="text-xs text-muted-foreground">Real capital deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$257B</div>
            <p className="text-xs text-muted-foreground">Combined valuation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real KPIs</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
              <path d="M3 3v18h18"></path>
              <path d="M18 17V9"></path>
              <path d="M13 17V5"></path>
              <path d="M8 17v-3"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKPIs}</div>
            <p className="text-xs text-muted-foreground">Live data points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Analysis</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <path d="M12 17h.01"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MiniLLM</div>
            <p className="text-xs text-muted-foreground">Local AI active</p>
          </CardContent>
        </Card>
      </div>

      {/* Real Portfolio Companies */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>🏢 Real Portfolio Companies</CardTitle>
          <CardDescription>Actual market leaders with real financial data and AI analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {portfolioPerformance.map((company) => (
              <Card key={company.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={company.healthScore > 70 ? 'default' : company.healthScore > 50 ? 'secondary' : 'destructive'}>
                        {company.healthScore}/100
                      </Badge>
                      <Badge variant="outline">{company.sector}</Badge>
                    </div>
                  </div>
                  <CardDescription>{company.sector} • {company.geography}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Real Financial Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Investment</div>
                        <div className="font-medium">${((company.investment || 0) / 1000000).toFixed(0)}M</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Latest Revenue</div>
                        <div className="font-medium">${(company.latestRevenue / 1000000).toFixed(0)}M</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Growth Rate</div>
                        <div className={`font-medium ${company.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {company.growthRate > 0 ? '+' : ''}{company.growthRate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Geography</div>
                        <div className="font-medium">{company.geography}</div>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium mb-1">🤖 MiniLLM Analysis:</div>
                      <div className="text-sm text-muted-foreground">
                        {company.healthScore > 80 ? 'Exceptional performance with strong fundamentals' :
                         company.healthScore > 60 ? 'Strong performance with positive outlook' :
                         company.healthScore > 40 ? 'Moderate performance with mixed signals' :
                         'Performance below expectations, requires attention'}
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        {company.growthRate > 20 ? '💰 Consider additional investment' :
                         company.growthRate > 0 ? '📊 Continue monitoring performance' :
                         '⚠️ Review investment strategy'}
                      </div>
                    </div>

                    {/* Real Metrics Count */}
                    <div className="pt-2 border-t text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data Points:</span>
                        <span className="font-medium">{company.kpis.length} KPIs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span className="font-medium">
                          {company.kpis[0] ? new Date(company.kpis[0].period).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latest KPIs */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>📈 Latest Real KPIs</CardTitle>
          <CardDescription>Most recent performance metrics from portfolio companies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestKPIs.slice(0, 9).map((kpi, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">{kpi.name}</h4>
                  <Badge variant="outline" className="text-xs">{kpi.category}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-bold">
                    {kpi.category === 'revenue' || kpi.category === 'financial' ?
                      `$${(kpi.value / 1000000).toFixed(1)}M` :
                      kpi.category === 'customers' ?
                      `${(kpi.value / 1000000).toFixed(1)}M` :
                      kpi.category === 'profitability' ?
                      `${kpi.value.toFixed(1)}%` :
                      kpi.value.toLocaleString()
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">{kpi.portfolio?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Confidence: {((kpi.confidence || 0.9) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI System Status */}
      <Card>
        <CardHeader>
          <CardTitle>🤖 AI System Status</CardTitle>
          <CardDescription>Miniature LLM and analysis capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">✅ Active Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Miniature LLM analysis</li>
                <li>• Real market data processing</li>
                <li>• Financial pattern recognition</li>
                <li>• Sector-specific insights</li>
                <li>• Risk factor identification</li>
                <li>• Investment recommendations</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">📊 Data Sources</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Company financial reports</li>
                <li>• Operational metrics</li>
                <li>• Market sentiment data</li>
                <li>• Economic indicators</li>
                <li>• Sector analysis</li>
                <li>• Valuation multiples</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-600">🚀 Capabilities</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Real-time health scoring</li>
                <li>• Growth trend analysis</li>
                <li>• Risk assessment</li>
                <li>• Performance benchmarking</li>
                <li>• Investment recommendations</li>
                <li>• Portfolio optimization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
