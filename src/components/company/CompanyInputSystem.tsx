"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { systemCoordinator } from '@/lib/system/SystemCoordinator'
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  Users, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Database,
  Plus
} from 'lucide-react'

interface CompanyData {
  name: string
  sector: string
  geography: string
  description: string
  investment: string
  ownership: string
  valuation: string
  employees: string
  founded: string
  stage: string
  website: string
  ceo: string
}

interface KPIData {
  name: string
  category: string
  value: string
  unit: string
  period: string
  notes: string
}

interface CompanyInputSystemProps {
  onCompanyAdded?: (company: any) => void
  className?: string
}

const sectors = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Goods',
  'Industrial', 'Energy', 'Real Estate', 'Media & Entertainment',
  'Education', 'Transportation', 'Retail', 'Telecommunications'
]

const geographies = [
  'North America', 'Europe', 'Asia Pacific', 'Latin America',
  'Middle East & Africa', 'Global'
]

const stages = [
  'Seed', 'Series A', 'Series B', 'Series C', 'Series D+',
  'Growth', 'Late Stage', 'Pre-IPO'
]

const kpiCategories = [
  'revenue', 'profitability', 'growth', 'customers', 'operations',
  'financial', 'market', 'team', 'product'
]

export function CompanyInputSystem({ onCompanyAdded, className }: CompanyInputSystemProps) {
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    sector: '',
    geography: 'North America',
    description: '',
    investment: '',
    ownership: '',
    valuation: '',
    employees: '',
    founded: '',
    stage: '',
    website: '',
    ceo: ''
  })

  const [kpiData, setKpiData] = useState<KPIData>({
    name: '',
    category: 'revenue',
    value: '',
    unit: 'USD',
    period: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      // Simple fetch from API
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        const orgs = data.organizations || []
        setOrganizations(orgs)
        if (orgs.length > 0) {
          setSelectedOrg(orgs[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    }
  }

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg) {
      setMessage({ type: 'error', text: 'Please select an organization' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Call the companies API
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...companyData,
          investment: parseFloat(companyData.investment) * 1000000, // Convert to actual value
          ownership: parseFloat(companyData.ownership) / 100, // Convert to decimal
          valuation: companyData.valuation ? parseFloat(companyData.valuation) * 1000000 : null,
          employees: companyData.employees ? parseInt(companyData.employees) : null,
          founded: companyData.founded ? parseInt(companyData.founded) : null,
          organizationId: selectedOrg,
          status: 'ACTIVE'
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: `Company "${companyData.name}" added successfully!` })
        
        // Reset form
        setCompanyData({
          name: '', sector: '', geography: 'North America', description: '',
          investment: '', ownership: '', valuation: '', employees: '',
          founded: '', stage: '', website: '', ceo: ''
        })

        // Notify parent component
        if (onCompanyAdded) {
          onCompanyAdded(result.data)
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add company' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while adding the company' })
    } finally {
      setLoading(false)
    }
  }

  const handleKPISubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg) {
      setMessage({ type: 'error', text: 'Please select an organization' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Call the KPIs API
      const response = await fetch('/api/kpis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...kpiData,
          value: parseFloat(kpiData.value),
          period: new Date(kpiData.period),
          periodType: 'quarterly',
          source: 'Manual Entry',
          confidence: 1.0,
          organizationId: selectedOrg
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: `KPI "${kpiData.name}" added successfully!` })
        
        // Reset form
        setKpiData({
          name: '', category: 'revenue', value: '', unit: 'USD',
          period: new Date().toISOString().split('T')[0], notes: ''
        })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add KPI' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while adding the KPI' })
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = () => {
    const mockCompanies = [
      {
        name: 'TechFlow AI',
        sector: 'Technology',
        description: 'AI-powered workflow automation platform',
        investment: '25',
        ownership: '15',
        valuation: '200',
        employees: '150',
        founded: '2020',
        stage: 'Series B',
        website: 'techflow.ai',
        ceo: 'Sarah Chen'
      },
      {
        name: 'GreenEnergy Solutions',
        sector: 'Energy',
        description: 'Renewable energy infrastructure and storage',
        investment: '50',
        ownership: '20',
        valuation: '400',
        employees: '300',
        founded: '2018',
        stage: 'Series C',
        website: 'greenenergy.com',
        ceo: 'Michael Rodriguez'
      }
    ]

    const randomCompany = mockCompanies[Math.floor(Math.random() * mockCompanies.length)]
    setCompanyData({ ...companyData, ...randomCompany })
    setMessage({ type: 'success', text: 'Mock data generated! Review and submit.' })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="w-5 h-5" />
          <span>Company Input System</span>
          <Badge variant="outline">Integrated</Badge>
        </CardTitle>
        <CardDescription>
          Add new portfolio companies and KPIs with real data validation and mock data support
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Organization Selection */}
        <div>
          <label className="text-sm font-medium">Active Organization</label>
          <select
            className="w-full mt-1 p-2 border rounded-md"
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            title="Select Organization"
          >
            <option value="">Select Organization</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        {/* Status Message */}
        {message && (
          <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {message.type === 'success' ? 
              <CheckCircle className="h-4 w-4 text-green-600" /> : 
              <AlertTriangle className="h-4 w-4 text-red-600" />
            }
            <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Add Company</span>
            </TabsTrigger>
            <TabsTrigger value="kpi" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Add KPI</span>
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Company Information</h3>
              <Button variant="outline" onClick={generateMockData} disabled={loading}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Mock Data
              </Button>
            </div>

            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name *</label>
                  <Input
                    placeholder="e.g., TechCorp Inc."
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Sector *</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={companyData.sector}
                    onChange={(e) => setCompanyData({ ...companyData, sector: e.target.value })}
                    title="Select company sector"
                    required
                  >
                    <option value="">Select Sector</option>
                    {sectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Geography</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={companyData.geography}
                    onChange={(e) => setCompanyData({ ...companyData, geography: e.target.value })}
                    title="Select company geography"
                  >
                    {geographies.map(geo => (
                      <option key={geo} value={geo}>{geo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Investment Stage</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={companyData.stage}
                    onChange={(e) => setCompanyData({ ...companyData, stage: e.target.value })}
                    title="Select investment stage"
                  >
                    <option value="">Select Stage</option>
                    {stages.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Investment Amount ($ millions) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="25.0"
                    value={companyData.investment}
                    onChange={(e) => setCompanyData({ ...companyData, investment: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Ownership (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="15.0"
                    value={companyData.ownership}
                    onChange={(e) => setCompanyData({ ...companyData, ownership: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Valuation ($ millions)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="200.0"
                    value={companyData.valuation}
                    onChange={(e) => setCompanyData({ ...companyData, valuation: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Employees</label>
                  <Input
                    type="number"
                    placeholder="150"
                    value={companyData.employees}
                    onChange={(e) => setCompanyData({ ...companyData, employees: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Founded Year</label>
                  <Input
                    type="number"
                    placeholder="2020"
                    value={companyData.founded}
                    onChange={(e) => setCompanyData({ ...companyData, founded: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Website</label>
                  <Input
                    placeholder="company.com"
                    value={companyData.website}
                    onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">CEO</label>
                  <Input
                    placeholder="John Smith"
                    value={companyData.ceo}
                    onChange={(e) => setCompanyData({ ...companyData, ceo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Brief description of the company and its business model..."
                  value={companyData.description}
                  onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={loading || !selectedOrg} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Company to Portfolio
              </Button>
            </form>
          </TabsContent>

          {/* KPI Tab */}
          <TabsContent value="kpi" className="space-y-4">
            <h3 className="text-lg font-medium">KPI Information</h3>

            <form onSubmit={handleKPISubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">KPI Name *</label>
                  <Input
                    placeholder="e.g., Monthly Recurring Revenue"
                    value={kpiData.name}
                    onChange={(e) => setKpiData({ ...kpiData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={kpiData.category}
                    onChange={(e) => setKpiData({ ...kpiData, category: e.target.value })}
                    title="Select KPI category"
                    required
                  >
                    {kpiCategories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Value *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1000000"
                    value={kpiData.value}
                    onChange={(e) => setKpiData({ ...kpiData, value: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <Input
                    placeholder="USD, %, count, etc."
                    value={kpiData.unit}
                    onChange={(e) => setKpiData({ ...kpiData, unit: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Period *</label>
                  <Input
                    type="date"
                    value={kpiData.period}
                    onChange={(e) => setKpiData({ ...kpiData, period: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Additional context or methodology for this KPI..."
                  value={kpiData.notes}
                  onChange={(e) => setKpiData({ ...kpiData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <Button type="submit" disabled={loading || !selectedOrg} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                Add KPI
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
