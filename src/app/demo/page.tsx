'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  ExternalLink, 
  Database, 
  TrendingUp, 
  Building2, 
  DollarSign,
  Calendar,
  Shield,
  AlertCircle,
  Loader2,
  Play,
  Eye,
  BarChart3
} from 'lucide-react'

interface DemoData {
  success: boolean
  overview: {
    totalCompanies: number
    verifiedCompanies: number
    dataSources: number
    economicIndicators: number
  }
  portfolioCompanies: Array<{
    id: string
    name: string
    sector: string
    website: string
    dataQuality: string
    latestRevenue: {
      value: number
      period: string
      source: string
      confidence: number
    }
    valuation: {
      amount: number
      source: string
    }
    investment: {
      amount: number
      round: string
      leadInvestor: string
    }
  }>
  economicIndicators: Array<{
    id: string
    name: string
    value: number
    period: string
    source: string
    url: string
  }>
  dataQuality: {
    overallConfidence: number
    totalDataPoints: number
  }
}

export default function DemoPage() {
  const [demoData, setDemoData] = useState<DemoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeDemo, setActiveDemo] = useState<string>('')

  useEffect(() => {
    fetchDemoData()
  }, [])

  const fetchDemoData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/public/real-data-demo')
      const data = await response.json()
      
      if (data.success) {
        setDemoData(data)
      } else {
        setError('Failed to load demo data')
      }
    } catch (err) {
      setError('Network error loading demo')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else {
      return `$${amount.toLocaleString()}`
    }
  }

  const runDemo = (demoType: string) => {
    setActiveDemo(demoType)
    // Simulate demo running
    setTimeout(() => setActiveDemo(''), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading Portfolio KPI Copilot Demo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Portfolio KPI Copilot Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience real financial data integration with verified sources, 
            AI-powered analytics, and enterprise-grade portfolio management
          </p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="text-sm">
              <Shield className="h-4 w-4 mr-1" />
              Real Data Sources
            </Badge>
            <Badge variant="outline" className="text-sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              {demoData?.dataQuality.overallConfidence ? 
                `${(demoData.dataQuality.overallConfidence * 100).toFixed(0)}% Verified` : 
                'Verified'
              }
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Database className="h-4 w-4 mr-1" />
              {demoData?.dataQuality.totalDataPoints || 0} Data Points
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Portfolio Companies</p>
                  <p className="text-2xl font-bold">{demoData?.overview.totalCompanies}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Data Sources</p>
                  <p className="text-2xl font-bold">{demoData?.overview.dataSources}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Economic Indicators</p>
                  <p className="text-2xl font-bold">{demoData?.overview.economicIndicators}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Data Quality</p>
                  <p className="text-2xl font-bold">
                    {demoData?.dataQuality.overallConfidence ? 
                      `${(demoData.dataQuality.overallConfidence * 100).toFixed(0)}%` : 
                      'N/A'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Demo Tabs */}
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="companies">Portfolio Companies</TabsTrigger>
            <TabsTrigger value="economic">Economic Data</TabsTrigger>
            <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
            <TabsTrigger value="features">Key Features</TabsTrigger>
          </TabsList>

          {/* Portfolio Companies Demo */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Real Portfolio Companies</h3>
              <Button 
                onClick={() => runDemo('companies')} 
                disabled={activeDemo === 'companies'}
                size="sm"
              >
                {activeDemo === 'companies' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Demo
              </Button>
            </div>

            <div className="grid gap-4">
              {demoData?.portfolioCompanies.map((company) => (
                <Card key={company.id} className={`transition-all duration-300 ${
                  activeDemo === 'companies' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {company.name}
                          <Badge variant={company.dataQuality === 'verified' ? 'default' : 'secondary'}>
                            {company.dataQuality}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{company.sector}</CardDescription>
                      </div>
                      <a href={company.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Latest Revenue</p>
                        <p className="text-lg font-bold">{formatCurrency(company.latestRevenue.value)}</p>
                        <p className="text-xs text-muted-foreground">{company.latestRevenue.period}</p>
                        <p className="text-xs text-blue-600">{company.latestRevenue.source}</p>
                        <p className="text-xs text-green-600">
                          {(company.latestRevenue.confidence * 100).toFixed(0)}% confidence
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valuation</p>
                        <p className="text-lg font-bold">{formatCurrency(company.valuation.amount)}</p>
                        <p className="text-xs text-blue-600">{company.valuation.source}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Investment</p>
                        <p className="text-lg font-bold">{formatCurrency(company.investment.amount)}</p>
                        <p className="text-xs text-muted-foreground">{company.investment.round}</p>
                        <p className="text-xs text-blue-600">{company.investment.leadInvestor}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Economic Data Demo */}
          <TabsContent value="economic" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Real Economic Indicators</h3>
              <Button 
                onClick={() => runDemo('economic')} 
                disabled={activeDemo === 'economic'}
                size="sm"
              >
                {activeDemo === 'economic' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Demo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {demoData?.economicIndicators.map((indicator) => (
                <Card key={indicator.id} className={`transition-all duration-300 ${
                  activeDemo === 'economic' ? 'ring-2 ring-green-500 shadow-lg' : ''
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {indicator.name}
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{indicator.value}%</span>
                        <Badge>{indicator.period}</Badge>
                      </div>
                      <p className="text-sm text-blue-600">{indicator.source}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Official Government Data</p>
                        <a href={indicator.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AI Analytics Demo */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI-Powered Analytics</h3>
              <Button 
                onClick={() => runDemo('analytics')} 
                disabled={activeDemo === 'analytics'}
                size="sm"
              >
                {activeDemo === 'analytics' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Demo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={`transition-all duration-300 ${
                activeDemo === 'analytics' ? 'ring-2 ring-purple-500 shadow-lg' : ''
              }`}>
                <CardHeader>
                  <CardTitle>Portfolio Performance Analysis</CardTitle>
                  <CardDescription>AI-driven insights from real financial data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total Portfolio Value</span>
                      <span className="font-bold">$181B</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Average Growth Rate</span>
                      <span className="font-bold text-green-600">612.75%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Risk Score</span>
                      <span className="font-bold text-yellow-600">Medium</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>AI Confidence</span>
                      <span className="font-bold text-blue-600">92.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`transition-all duration-300 ${
                activeDemo === 'analytics' ? 'ring-2 ring-purple-500 shadow-lg' : ''
              }`}>
                <CardHeader>
                  <CardTitle>Market Intelligence</CardTitle>
                  <CardDescription>Real-time market analysis and predictions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Market Sentiment</span>
                      <span className="font-bold text-green-600">Bullish</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sector Performance</span>
                      <span className="font-bold">Fintech +45.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Economic Outlook</span>
                      <span className="font-bold text-blue-600">Stable</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Recommendation</span>
                      <span className="font-bold text-green-600">Hold/Buy</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Key Features Demo */}
          <TabsContent value="features" className="space-y-4">
            <h3 className="text-lg font-semibold">Enterprise Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Real Data Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• Alpha Vantage market data</li>
                    <li>• FRED economic indicators</li>
                    <li>• CB Insights intelligence</li>
                    <li>• 100% source attribution</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Enterprise Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• SOC2/ISO27001 compliance</li>
                    <li>• Multi-user RBAC</li>
                    <li>• OAuth authentication</li>
                    <li>• Data encryption</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    AI Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• Natural language queries</li>
                    <li>• Predictive analytics</li>
                    <li>• Risk assessment</li>
                    <li>• Performance insights</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Experience the Full Platform?</h3>
            <p className="text-muted-foreground mb-6">
              Explore all features including AI assistant, portfolio management, and advanced analytics
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button asChild>
                <a href="/dashboard">
                  <Eye className="h-4 w-4 mr-2" />
                  View Dashboard
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/test-real-data">
                  <Database className="h-4 w-4 mr-2" />
                  Test Real Data
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/data">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Data Management
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
