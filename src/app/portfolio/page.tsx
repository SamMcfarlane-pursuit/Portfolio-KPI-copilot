'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PortfolioCompany {
  id: string
  name: string
  sector: string
  geography: string
  investment: number
  ownership: number
  valuation?: number
  status: string
  lastUpdate: string
  performance: 'up' | 'down' | 'stable'
  performanceValue: number
}

export default function PortfolioPage() {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<PortfolioCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPortfolioData()
  }, [])

  const fetchPortfolioData = async () => {
    try {
      const response = await fetch('/api/portfolios')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.portfolios || [])
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.sector.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalInvestment = companies.reduce((sum, company) => sum + company.investment, 0)
  const totalValuation = companies.reduce((sum, company) => sum + (company.valuation || 0), 0)
  const averageOwnership = companies.length > 0 
    ? companies.reduce((sum, company) => sum + company.ownership, 0) / companies.length 
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const getPerformanceIcon = (performance: string) => {
    switch (performance) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'exited':
        return 'bg-gray-100 text-gray-800'
      case 'under review':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Portfolio</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">
            Manage and monitor your portfolio companies
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">
              Active portfolio companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestment)}</div>
            <p className="text-xs text-muted-foreground">
              Deployed capital
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Valuation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValuation)}</div>
            <p className="text-xs text-muted-foreground">
              Current portfolio value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Ownership</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(averageOwnership)}</div>
            <p className="text-xs text-muted-foreground">
              Average stake
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Companies List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{company.sector}</span>
                      <span>•</span>
                      <span>{company.geography}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Investment</p>
                    <p className="font-semibold">{formatCurrency(company.investment)}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Ownership</p>
                    <p className="font-semibold">{formatPercentage(company.ownership)}</p>
                  </div>

                  {company.valuation && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Valuation</p>
                      <div className="flex items-center space-x-1">
                        <p className="font-semibold">{formatCurrency(company.valuation)}</p>
                        {getPerformanceIcon(company.performance)}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(company.status)}>
                      {company.status}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Company</DropdownMenuItem>
                        <DropdownMenuItem>View KPIs</DropdownMenuItem>
                        <DropdownMenuItem>Generate Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No companies found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first portfolio company'}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
