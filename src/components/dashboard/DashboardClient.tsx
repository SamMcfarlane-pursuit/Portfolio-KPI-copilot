"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UnifiedSystemStatus } from '@/components/system/UnifiedSystemStatus'
import { UnifiedAIInterface } from '@/components/ai/UnifiedAIInterface'
import { CompanyInputSystem } from '@/components/company/CompanyInputSystem'
import {
  Activity,
  TrendingUp,
  DollarSign,
  Building2,
  Brain,
  Plus
} from 'lucide-react'

interface DashboardData {
  totalCompanies: number
  totalInvestment: number
  averageHealth: number
  topPerformers: any[]
  portfolios: any[]
}

interface DashboardClientProps {
  initialData: DashboardData
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  
  const {
    totalCompanies,
    totalInvestment,
    averageHealth,
    topPerformers,
    portfolios
  } = initialData

  const handleCompanyAdded = (company: any) => {
    // Trigger a refresh by updating the key
    setRefreshKey(prev => prev + 1)
    
    // Show success message
    console.log('Company added successfully:', company)
    
    // Optionally refresh the page after a short delay
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }

  const scrollToCompanyInput = () => {
    const element = document.getElementById('company-input-system')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-8">
      {/* System Status */}
      <UnifiedSystemStatus />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Active investments</p>
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
            <p className="text-xs text-muted-foreground">Deployed capital</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageHealth.toFixed(1)}/10</div>
            <p className="text-xs text-muted-foreground">Average score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPerformers.length}</div>
            <p className="text-xs text-muted-foreground">Above target</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Companies - Simplified */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>Portfolio Performance</span>
              </CardTitle>
              <CardDescription>AI-powered insights and key metrics</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={scrollToCompanyInput}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {portfolios.slice(0, 5).map((portfolio) => (
              <div key={portfolio.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{portfolio.name}</h4>
                    <p className="text-sm text-muted-foreground">{portfolio.sector}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ${(portfolio.investment / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-muted-foreground">Investment</p>
                  </div>
                  
                  <Badge variant={portfolio.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {portfolio.status}
                  </Badge>
                </div>
              </div>
            ))}
            
            {portfolios.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No portfolio companies yet</p>
                <p className="text-sm">Add your first company to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Input System */}
        <div id="company-input-system">
          <CompanyInputSystem 
            key={refreshKey} // Force re-render when refreshKey changes
            onCompanyAdded={handleCompanyAdded}
          />
        </div>

        {/* AI Assistant */}
        <UnifiedAIInterface 
          portfolioContext={{
            totalCompanies,
            totalInvestment,
            averageHealth,
            topPerformers: topPerformers.slice(0, 3)
          }}
        />
      </div>
    </div>
  )
}
