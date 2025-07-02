'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Code, 
  Play, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Book,
  Zap,
  Shield,
  Activity,
  Globe,
  Database,
  Brain,
  Users,
  Settings,
  Webhook,
  BarChart3
} from 'lucide-react'

interface APIEndpoint {
  method: string
  path: string
  description: string
  category: string
  requiresAuth: boolean
  permissions?: string[]
  parameters?: any[]
  requestBody?: any
  responses: any
}

const apiEndpoints: APIEndpoint[] = [
  // Portfolio endpoints
  {
    method: 'GET',
    path: '/api/v2/portfolios',
    description: 'List portfolios with advanced filtering and pagination',
    category: 'Portfolios',
    requiresAuth: true,
    permissions: ['VIEW_PORTFOLIO'],
    parameters: [
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Items per page (default: 20, max: 100)' },
      { name: 'search', type: 'string', description: 'Search in name and description' },
      { name: 'sector', type: 'string', description: 'Filter by sector' },
      { name: 'status', type: 'enum', description: 'Filter by status (active, monitoring, exited)' },
      { name: 'includeKPIs', type: 'boolean', description: 'Include latest KPIs' },
      { name: 'includeAnalytics', type: 'boolean', description: 'Include analytics data' }
    ],
    responses: {
      200: 'Success with portfolio list and metadata',
      400: 'Invalid query parameters',
      401: 'Authentication required',
      403: 'Insufficient permissions'
    }
  },
  {
    method: 'POST',
    path: '/api/v2/portfolios',
    description: 'Create a new portfolio',
    category: 'Portfolios',
    requiresAuth: true,
    permissions: ['CREATE_PORTFOLIO'],
    requestBody: {
      name: 'string (required)',
      description: 'string (optional)',
      sector: 'string (required)',
      geography: 'string (required)',
      stage: 'enum (seed, series-a, series-b, series-c, growth, mature)',
      investment: 'number (required)',
      ownership: 'number (0-100)',
      organizationId: 'string (required)'
    },
    responses: {
      201: 'Portfolio created successfully',
      400: 'Validation error',
      401: 'Authentication required',
      403: 'Insufficient permissions'
    }
  },
  // AI endpoints
  {
    method: 'POST',
    path: '/api/v2/ai/copilot',
    description: 'AI Portfolio Copilot for intelligent analysis and recommendations',
    category: 'AI Services',
    requiresAuth: true,
    permissions: ['VIEW_KPI'],
    requestBody: {
      query: 'string (required, max 2000 chars)',
      type: 'enum (chat, analysis, prediction, explanation, summary)',
      portfolioId: 'string (optional)',
      conversationId: 'string (optional)',
      preferences: {
        aiProvider: 'enum (auto, openrouter, openai, ollama)',
        priority: 'enum (speed, quality, cost)',
        temperature: 'number (0-2)',
        maxTokens: 'number (1-4000)'
      }
    },
    responses: {
      200: 'AI analysis completed successfully',
      400: 'Invalid request parameters',
      401: 'Authentication required',
      503: 'AI service unavailable'
    }
  },
  // System endpoints
  {
    method: 'GET',
    path: '/api/v2/system/health',
    description: 'Comprehensive system health check',
    category: 'System',
    requiresAuth: false,
    parameters: [
      { name: 'includeDetails', type: 'boolean', description: 'Include detailed system information' },
      { name: 'services', type: 'string', description: 'Comma-separated list of services to check' }
    ],
    responses: {
      200: 'Health status retrieved',
      503: 'System unhealthy'
    }
  }
]

const categories = [
  { name: 'Portfolios', icon: BarChart3, color: 'bg-blue-500' },
  { name: 'KPIs', icon: Activity, color: 'bg-green-500' },
  { name: 'AI Services', icon: Brain, color: 'bg-purple-500' },
  { name: 'Organizations', icon: Users, color: 'bg-orange-500' },
  { name: 'System', icon: Settings, color: 'bg-gray-500' },
  { name: 'Webhooks', icon: Webhook, color: 'bg-pink-500' }
]

export default function APIDocsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [testRequest, setTestRequest] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiInfo, setApiInfo] = useState<any>(null)

  useEffect(() => {
    // Load API information
    fetch('/api/v2')
      .then(res => res.json())
      .then(data => setApiInfo(data))
      .catch(console.error)
  }, [])

  const filteredEndpoints = selectedCategory === 'All' 
    ? apiEndpoints 
    : apiEndpoints.filter(endpoint => endpoint.category === selectedCategory)

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return
    
    setIsLoading(true)
    try {
      const response = await fetch(selectedEndpoint.path, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: selectedEndpoint.method !== 'GET' ? testRequest : undefined
      })
      
      const data = await response.json()
      setTestResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setTestResponse(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }, null, 2))
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Book className="w-8 h-8 mr-3 text-blue-500" />
            API Documentation
          </h1>
          <p className="text-muted-foreground">
            Comprehensive API reference for Portfolio KPI Copilot v2.0
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>v2.0.0</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>Enterprise Ready</span>
          </Badge>
        </div>
      </div>

      {/* API Overview */}
      {apiInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              API Overview
            </CardTitle>
            <CardDescription>
              {apiInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Object.keys(apiInfo.endpoints || {}).length}</div>
                <div className="text-sm text-muted-foreground">Endpoint Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime SLA</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">&lt;2s</div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="testing">API Testing</TabsTrigger>
        </TabsList>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Category Sidebar */}
            <div className="space-y-2">
              <h3 className="font-semibold mb-3">Categories</h3>
              <Button
                variant={selectedCategory === 'All' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedCategory('All')}
              >
                All Endpoints
              </Button>
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <Button
                    key={category.name}
                    variant={selectedCategory === category.name ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {category.name}
                  </Button>
                )
              })}
            </div>

            {/* Endpoints List */}
            <div className="lg:col-span-3 space-y-4">
              {filteredEndpoints.map((endpoint, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedEndpoint(endpoint)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={endpoint.method === 'GET' ? 'secondary' : 
                                     endpoint.method === 'POST' ? 'default' :
                                     endpoint.method === 'PUT' ? 'outline' : 'destructive'}>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                      </div>
                      <div className="flex items-center space-x-2">
                        {endpoint.requiresAuth && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Auth Required
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {endpoint.category}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {endpoint.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Authentication Tab */}
        <TabsContent value="authentication">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Authentication Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Bearer Token (Recommended)</h4>
                  <code className="block p-3 bg-muted rounded text-sm">
                    Authorization: Bearer &lt;your-token&gt;
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">API Key (Service-to-Service)</h4>
                  <code className="block p-3 bg-muted rounded text-sm">
                    X-API-Key: &lt;your-api-key&gt;
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Permissions & RBAC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">VIEW_PORTFOLIO</span>
                    <Badge variant="secondary">Read</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">MANAGE_PORTFOLIO</span>
                    <Badge variant="default">Write</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">DELETE_PORTFOLIO</span>
                    <Badge variant="destructive">Delete</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">VIEW_KPI</span>
                    <Badge variant="secondary">Read</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">MANAGE_KPI</span>
                    <Badge variant="default">Write</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Common API Usage Examples</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* JavaScript Example */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Code className="w-4 h-4 mr-2" />
                    JavaScript / TypeScript
                  </h4>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`// Get portfolios with AI insights
const response = await fetch('/api/v2/portfolios?includeAnalytics=true', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
if (data.success) {
  console.log('Portfolios:', data.data.portfolios)
}

// AI Copilot analysis
const aiResponse = await fetch('/api/v2/ai/copilot', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Analyze portfolio performance and identify optimization opportunities',
    portfolioId: 'portfolio-123',
    type: 'analysis'
  })
})

const aiData = await aiResponse.json()
console.log('AI Insights:', aiData.data.analysis)`}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard('// JavaScript example code...')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* cURL Example */}
                <div>
                  <h4 className="font-semibold mb-2">cURL</h4>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`# Get system health
curl -X GET "http://localhost:3000/api/v2/system/health?includeDetails=true"

# Create portfolio
curl -X POST "http://localhost:3000/api/v2/portfolios" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "TechCorp Portfolio",
    "sector": "Technology",
    "geography": "North America",
    "stage": "growth",
    "investment": 5000000,
    "ownership": 25,
    "organizationId": "org-123"
  }'`}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard('# cURL example...')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Testing Tab */}
        <TabsContent value="testing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="w-5 h-5 mr-2" />
                  API Testing Console
                </CardTitle>
                <CardDescription>
                  Test API endpoints directly from the documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedEndpoint ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">Endpoint</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{selectedEndpoint.method}</Badge>
                        <code className="text-sm">{selectedEndpoint.path}</code>
                      </div>
                    </div>
                    
                    {selectedEndpoint.method !== 'GET' && (
                      <div>
                        <label className="text-sm font-medium">Request Body (JSON)</label>
                        <Textarea
                          placeholder="Enter JSON request body..."
                          value={testRequest}
                          onChange={(e) => setTestRequest(e.target.value)}
                          className="mt-1 font-mono text-sm"
                          rows={8}
                        />
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleTestEndpoint}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Testing...' : 'Test Endpoint'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select an endpoint from the Endpoints tab to test it here
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResponse ? (
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded text-sm overflow-auto max-h-96">
                      {testResponse}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(testResponse)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Response will appear here after testing an endpoint
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
