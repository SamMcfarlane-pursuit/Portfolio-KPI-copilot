"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CompanyInputSystem } from './CompanyInputSystem'
import { 
  CheckCircle, 
  Building2, 
  Sparkles,
  ArrowRight
} from 'lucide-react'

export function CompanyInputDemo() {
  const [demoStep, setDemoStep] = useState(0)
  const [addedCompanies, setAddedCompanies] = useState<any[]>([])

  const demoSteps = [
    {
      title: "Welcome to the Company Input System",
      description: "This integrated system handles both real and mock data seamlessly",
      action: "Start Demo"
    },
    {
      title: "Add Your First Company",
      description: "Try adding a real company or use the mock data generator",
      action: "Continue"
    },
    {
      title: "Smart Data Processing",
      description: "Watch how the system validates, enriches, and integrates your data",
      action: "See Results"
    }
  ]

  const handleCompanyAdded = (company: any) => {
    setAddedCompanies(prev => [...prev, company])
    setDemoStep(2)
  }

  const generateDemoData = () => {
    // Simulate adding a demo company
    const demoCompany = {
      id: 'demo-' + Date.now(),
      name: 'TechFlow AI',
      sector: 'Technology',
      investment: 25000000,
      status: 'ACTIVE'
    }
    handleCompanyAdded(demoCompany)
  }

  return (
    <div className="space-y-6">
      {/* Demo Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Interactive Demo</span>
            <Badge variant="outline">Step {demoStep + 1} of {demoSteps.length}</Badge>
          </CardTitle>
          <CardDescription>
            {demoSteps[demoStep]?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{demoSteps[demoStep]?.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {demoStep === 0 && "Experience the seamless integration of real and mock data"}
                {demoStep === 1 && "Use the form below or click 'Generate Mock Data' for a quick demo"}
                {demoStep === 2 && "Your data has been processed and integrated into the system"}
              </p>
            </div>
            <div className="flex space-x-2">
              {demoStep < 2 && (
                <Button 
                  variant="outline" 
                  onClick={generateDemoData}
                  disabled={demoStep === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Quick Demo
                </Button>
              )}
              <Button 
                onClick={() => setDemoStep(Math.min(demoStep + 1, demoSteps.length - 1))}
                disabled={demoStep === demoSteps.length - 1}
              >
                {demoSteps[demoStep]?.action}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {addedCompanies.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <strong>Success!</strong> {addedCompanies.length} company(ies) added to your portfolio.
            The system has automatically:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Validated all input data</li>
              <li>Created initial KPIs</li>
              <li>Enriched with industry benchmarks</li>
              <li>Integrated with AI analysis</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Company Input System */}
      {demoStep >= 1 && (
        <CompanyInputSystem 
          onCompanyAdded={handleCompanyAdded}
          className="border-2 border-dashed border-blue-200"
        />
      )}

      {/* Added Companies Display */}
      {addedCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Recently Added Companies</span>
            </CardTitle>
            <CardDescription>
              Companies successfully integrated into your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {addedCompanies.map((company, index) => (
                <div key={company.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{company.name}</h4>
                      <p className="text-sm text-muted-foreground">{company.sector}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${(company.investment / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-xs text-muted-foreground">Investment</p>
                    </div>
                    <Badge variant="default">
                      {company.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Features */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 System Features Demonstrated</CardTitle>
          <CardDescription>
            Key capabilities of the integrated company input system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">✅ Smart Data Validation</h4>
              <p className="text-sm text-muted-foreground">
                Real-time validation with helpful error messages and suggestions
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🎭 Mock Data Integration</h4>
              <p className="text-sm text-muted-foreground">
                Intelligent mock data generation for testing and demos
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">📊 Automatic KPI Creation</h4>
              <p className="text-sm text-muted-foreground">
                Initial KPIs generated based on investment data
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🔗 System Integration</h4>
              <p className="text-sm text-muted-foreground">
                Seamless integration with AI analysis and dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
