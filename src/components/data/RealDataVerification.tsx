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
  Loader2
} from 'lucide-react'

interface DataSource {
  id: string
  name: string
  url: string
  description: string
  reliability: string
  verified: boolean
  lastChecked: string
}

interface Company {
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
    reference: string
  }
  valuation: {
    amount: number
    date: string
    source: string
    reference: string
  }
  investment: {
    amount: number
    date: string
    round: string
    leadInvestor: string
    source: string
  }
}

interface EconomicIndicator {
  id: string
  name: string
  value: number
  period: string
  source: string
  reference: string
  url: string
  lastUpdated: string
}

export default function RealDataVerification() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('')

  useEffect(() => {
    fetchVerificationData()
  }, [])

  const fetchVerificationData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/real-data/verify?proof=true')
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch verification data')
      }
    } catch (err) {
      setError('Network error while fetching data')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const response = await fetch(`/api/real-data/verify?companyId=${companyId}`)
      const result = await response.json()
      
      if (result.success) {
        setSelectedCompany(companyId)
        // Update data with detailed company info
        setData(prev => ({ ...prev, selectedCompanyDetails: result }))
      }
    } catch (err) {
      console.error('Failed to fetch company details:', err)
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading real data verification...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Real Data Verification</h2>
          <p className="text-muted-foreground">
            Proof of real financial data integration with verified sources
          </p>
        </div>
        <Button onClick={fetchVerificationData} variant="outline">
          <Database className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Companies</p>
                <p className="text-2xl font-bold">{data?.overview?.totalCompanies}</p>
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
                <p className="text-2xl font-bold">{data?.overview?.dataSources}</p>
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
                <p className="text-2xl font-bold">{data?.overview?.economicIndicators}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">
                  {(data?.dataQuality?.overallConfidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Portfolio Companies</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="economic">Economic Data</TabsTrigger>
          <TabsTrigger value="proof">Proof of Reference</TabsTrigger>
        </TabsList>

        {/* Portfolio Companies */}
        <TabsContent value="companies" className="space-y-4">
          <div className="grid gap-4">
            {data?.sampleCompanies?.map((company: Company) => (
              <Card key={company.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => fetchCompanyDetails(company.id)}>
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
                    <a href={company.website} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:text-blue-800">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Revenue */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Latest Revenue</p>
                      <p className="text-lg font-bold">{formatCurrency(company.latestRevenue.value)}</p>
                      <p className="text-xs text-muted-foreground">{company.latestRevenue.period}</p>
                      <p className={`text-xs ${getConfidenceColor(company.latestRevenue.confidence)}`}>
                        {(company.latestRevenue.confidence * 100).toFixed(0)}% confidence
                      </p>
                      <p className="text-xs text-blue-600">{company.latestRevenue.source}</p>
                    </div>

                    {/* Valuation */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Valuation</p>
                      <p className="text-lg font-bold">{formatCurrency(company.valuation.amount)}</p>
                      <p className="text-xs text-muted-foreground">{company.valuation.date}</p>
                      <p className="text-xs text-blue-600">{company.valuation.source}</p>
                    </div>

                    {/* Investment */}
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

        {/* Data Sources */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid gap-4">
            {data?.dataSources?.map((source: DataSource) => (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {source.name}
                        {source.verified && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </CardTitle>
                      <CardDescription>{source.description}</CardDescription>
                    </div>
                    <Badge variant={source.reliability === 'official' ? 'default' : 'secondary'}>
                      {source.reliability}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Update Frequency: {source.updateFrequency}</p>
                      <p className="text-xs text-muted-foreground">Last Checked: {new Date(source.lastChecked).toLocaleString()}</p>
                    </div>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Source
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Economic Indicators */}
        <TabsContent value="economic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.economicIndicators?.map((indicator: EconomicIndicator) => (
              <Card key={indicator.id}>
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
                    <p className="text-xs text-muted-foreground">{indicator.reference}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(indicator.lastUpdated).toLocaleDateString()}
                      </p>
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

        {/* Proof of Reference */}
        <TabsContent value="proof" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Verification Methodology</CardTitle>
              <CardDescription>
                How we ensure data accuracy and provide proof of reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Data Sources</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {data?.proof?.methodology?.sources?.map((source: string, index: number) => (
                    <li key={index}>{source}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Verification Process</h4>
                <p className="text-sm text-muted-foreground">
                  {data?.proof?.methodology?.description}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Integrity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Update Frequency:</strong> {data?.proof?.dataIntegrity?.updateFrequency}</p>
                    <p><strong>Quality Checks:</strong> {data?.proof?.dataIntegrity?.qualityChecks}</p>
                  </div>
                  <div>
                    <p><strong>Error Handling:</strong> {data?.proof?.dataIntegrity?.errorHandling}</p>
                    <p><strong>Audit Trail:</strong> {data?.proof?.dataIntegrity?.auditTrail}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
