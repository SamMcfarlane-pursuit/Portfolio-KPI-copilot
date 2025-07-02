'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Brain,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle,
  Target,
  PieChart,
  Activity,
  Loader2,
  RefreshCw,
  Settings,
  Download,
  Share2,
  BookOpen,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Building2
} from 'lucide-react'
import { AICopilotWidget } from '@/components/ai/AICopilotWidget'
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
  analysis?: AIAnalysis
  confidence?: number
  processingTime?: number
}

interface AIAnalysis {
  insights: string[]
  recommendations: string[]
  riskFactors: string[]
  opportunities: string[]
  predictions?: Prediction[]
  benchmarks?: Benchmark[]
}

interface Prediction {
  metric: string
  current: number
  predicted: number
  timeframe: string
  confidence: number
}

interface Benchmark {
  metric: string
  value: number
  industry: number
  percentile: number
}

interface Insight {
  id: string
  title: string
  description: string
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation' | 'prediction'
  confidence: number
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  priority: number
  category: string
}

interface AIFeature {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  status: 'active' | 'beta' | 'coming-soon'
  capabilities: string[]
}

const sampleInsights: Insight[] = [
  {
    id: '1',
    title: 'Revenue Growth Acceleration',
    description: 'TechCorp shows 45% QoQ revenue growth, significantly outpacing industry average of 12%.',
    type: 'opportunity',
    confidence: 92,
    impact: 'high',
    actionable: true,
    priority: 1,
    category: 'Performance'
  },
  {
    id: '2',
    title: 'Burn Rate Alert',
    description: 'HealthStart\'s current burn rate suggests 8-month runway. Consider bridge funding.',
    type: 'risk',
    confidence: 87,
    impact: 'high',
    actionable: true,
    priority: 1,
    category: 'Financial'
  },
  {
    id: '3',
    title: 'Market Expansion Opportunity',
    description: 'AI analysis suggests European market entry could increase TAM by 40% for FinanceFlow.',
    type: 'recommendation',
    confidence: 78,
    impact: 'medium',
    actionable: true,
    priority: 2,
    category: 'Strategy'
  },
  {
    id: '4',
    title: 'Customer Acquisition Cost Optimization',
    description: 'AI predicts 25% CAC reduction possible through channel optimization.',
    type: 'prediction',
    confidence: 84,
    impact: 'high',
    actionable: true,
    priority: 1,
    category: 'Marketing'
  },
  {
    id: '5',
    title: 'Churn Rate Trend Analysis',
    description: 'Monthly churn trending upward (+15% over 3 months). Immediate intervention recommended.',
    type: 'trend',
    confidence: 91,
    impact: 'high',
    actionable: true,
    priority: 1,
    category: 'Customer Success'
  }
]

const quickPrompts = [
  "Analyze portfolio performance this quarter",
  "What are the top risks in my portfolio?",
  "Suggest optimization strategies for underperforming companies",
  "Compare sector performance trends",
  "Generate investment recommendations",
  "Predict next quarter's revenue growth",
  "Identify cost reduction opportunities",
  "Benchmark against industry leaders",
  "Analyze customer acquisition trends",
  "Forecast cash flow requirements"
]

const intelligentPrompts = {
  performance: [
    "How is my portfolio performing compared to last quarter?",
    "Which companies are driving the most value?",
    "What are the key performance indicators I should focus on?"
  ],
  risks: [
    "What are the biggest risks facing my portfolio?",
    "Which companies need immediate attention?",
    "How can I mitigate identified risks?"
  ],
  opportunities: [
    "Where are the best growth opportunities?",
    "Which markets should I consider expanding into?",
    "What strategic initiatives should I prioritize?"
  ],
  predictions: [
    "What will my portfolio look like in 12 months?",
    "Which companies are likely to outperform?",
    "What market trends should I prepare for?"
  ]
}

const aiFeatures: AIFeature[] = [
  {
    id: 'portfolio-analysis',
    title: 'Portfolio Analysis',
    description: 'Intelligent analysis of portfolio performance, trends, and risk factors',
    icon: BarChart3,
    status: 'active',
    capabilities: [
      'Real-time KPI monitoring',
      'Performance trend analysis',
      'Risk assessment and alerts',
      'Benchmark comparisons',
      'Sector-specific insights'
    ]
  },
  {
    id: 'predictive-insights',
    title: 'Predictive Insights',
    description: 'AI-powered forecasting and trend prediction for strategic planning',
    icon: TrendingUp,
    status: 'active',
    capabilities: [
      'Revenue growth forecasting',
      'Market trend predictions',
      'Risk factor modeling',
      'Scenario analysis',
      'Performance projections'
    ]
  },
  {
    id: 'optimization-recommendations',
    title: 'Optimization Recommendations',
    description: 'Actionable recommendations for portfolio optimization and growth',
    icon: Target,
    status: 'active',
    capabilities: [
      'Cost optimization strategies',
      'Revenue enhancement opportunities',
      'Operational efficiency improvements',
      'Strategic investment guidance',
      'Performance optimization plans'
    ]
  },
  {
    id: 'natural-language-queries',
    title: 'Natural Language Queries',
    description: 'Ask questions in plain English and get intelligent responses',
    icon: Brain,
    status: 'active',
    capabilities: [
      'Conversational AI interface',
      'Context-aware responses',
      'Multi-language support',
      'Complex query understanding',
      'Intelligent follow-up suggestions'
    ]
  },
  {
    id: 'real-time-monitoring',
    title: 'Real-time Monitoring',
    description: 'Continuous monitoring and alerting for portfolio changes',
    icon: Activity,
    status: 'beta',
    capabilities: [
      'Live data streaming',
      'Automated alerts',
      'Threshold monitoring',
      'Anomaly detection',
      'Performance tracking'
    ]
  },
  {
    id: 'collaborative-insights',
    title: 'Collaborative Insights',
    description: 'Team-based analysis and shared insights platform',
    icon: Users,
    status: 'coming-soon',
    capabilities: [
      'Team collaboration tools',
      'Shared dashboards',
      'Comment and annotation',
      'Workflow integration',
      'Knowledge sharing'
    ]
  }
]

export default function AIAssistantPage() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI Portfolio Copilot. I provide intelligent analysis, predictive insights, and strategic recommendations to help you maximize portfolio performance. I can analyze KPIs, forecast trends, identify risks and opportunities, and answer complex questions about your investments. What would you like to explore?',
      timestamp: new Date(),
      suggestions: quickPrompts.slice(0, 3),
      confidence: 100
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('copilot')
  const [aiCapabilities, setAiCapabilities] = useState<any>(null)
  const [realTimeInsights, setRealTimeInsights] = useState<Insight[]>(sampleInsights)
  const [systemStatus, setSystemStatus] = useState({
    aiOnline: true,
    responseTime: 1200,
    modelsAvailable: ['llama3.2', 'llama3.1', 'mistral'],
    lastUpdate: new Date()
  })

  useEffect(() => {
    // Simulate real-time status updates
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        responseTime: Math.floor(Math.random() * 500) + 800,
        lastUpdate: new Date()
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadAICapabilities = async () => {
    try {
      const response = await fetch('/api/ai/orchestrator')
      const data = await response.json()
      if (data.success) {
        setAiCapabilities(data.capabilities)
      }
    } catch (error) {
      console.error('Failed to load AI capabilities:', error)
    }
  }

  const loadRealTimeInsights = async () => {
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId: 'demo-portfolio',
          type: 'all',
          timeframe: '30d',
          focusAreas: ['performance', 'risk', 'growth']
        }),
      })
      const data = await response.json()
      if (data.success && data.insights) {
        setRealTimeInsights(data.insights)
      }
    } catch (error) {
      console.error('Failed to load real-time insights:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    const startTime = Date.now()

    try {
      // Use AI Portfolio Copilot for intelligent responses
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          type: determineRequestType(content),
          portfolioId: 'demo-portfolio', // Would be dynamic in real app
          conversationId: `chat_${Date.now()}`,
          context: {
            source: 'ai_assistant',
            requiresData: true,
            analysisType: 'comprehensive'
          },
          preferences: {
            aiProvider: 'auto',
            priority: 'quality',
            temperature: 0.7,
            maxTokens: 2000
          }
        }),
      })

      const data = await response.json()
      const processingTime = Date.now() - startTime

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response || 'I\'ve analyzed your request. Here are my insights.',
          timestamp: new Date(),
          suggestions: data.suggestions || generateSuggestions(content),
          analysis: data.analysis || undefined,
          confidence: data.metadata?.confidence || 85,
          processingTime
        }
        setMessages(prev => [...prev, assistantMessage])

        // Update real-time insights if new ones are available
        if (data.analysis?.insights && data.analysis.insights.length > 0) {
          const newInsights = data.analysis.insights.map((insight: string, index: number) => ({
            id: `insight_${Date.now()}_${index}`,
            title: insight.split('.')[0] || 'AI Insight',
            description: insight,
            type: 'recommendation' as const,
            confidence: data.metadata?.confidence || 85,
            impact: 'medium' as const,
            actionable: true,
            priority: 2,
            category: 'AI Analysis'
          }))

          setRealTimeInsights(prev => [...newInsights, ...prev.slice(0, 4)]) // Keep latest 5 insights
        }
      } else {
        throw new Error(data.error || 'AI Copilot request failed')
      }
    } catch (error) {
      console.error('AI request failed:', error)

      // Fallback to enhanced mock response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateEnhancedAIResponse(content),
        timestamp: new Date(),
        suggestions: generateSuggestions(content),
        confidence: 75,
        processingTime: Date.now() - startTime
      }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const determineRequestType = (content: string): string => {
    const lowerContent = content.toLowerCase()

    if (lowerContent.includes('predict') || lowerContent.includes('forecast') || lowerContent.includes('future')) {
      return 'prediction'
    }
    if (lowerContent.includes('analyze') || lowerContent.includes('performance') || lowerContent.includes('trend')) {
      return 'analysis'
    }
    if (lowerContent.includes('explain') || lowerContent.includes('what is') || lowerContent.includes('how does')) {
      return 'explanation'
    }
    if (lowerContent.includes('summary') || lowerContent.includes('summarize') || lowerContent.includes('overview')) {
      return 'summary'
    }

    return 'chat'
  }

  const generateEnhancedAIResponse = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase()

    const responses = {
      'portfolio performance': `📊 **Portfolio Performance Analysis**

Based on my comprehensive analysis of your portfolio:

**Overall Performance:** Strong with 24.5% average growth rate
- **Top Performers:** TechCorp (+45% QoQ), HealthStart (+38% QoQ)
- **Attention Needed:** RetailCo (-12% QoQ) due to declining margins

**Key Metrics:**
- Revenue Growth: 24.5% (vs 12% industry avg)
- EBITDA Margin: 18.3% (vs 15% industry avg)
- Customer Acquisition Cost: $127 (trending down)

**Strategic Recommendations:**
1. Double down on TechCorp's growth trajectory
2. Implement cost optimization at RetailCo
3. Consider strategic partnerships for market expansion`,

      'risks': `⚠️ **Risk Assessment Report**

I've identified critical risks requiring immediate attention:

**High Priority Risks:**
1. **HealthStart Burn Rate:** 8-month runway remaining
2. **RetailCo Market Share:** Declining 15% YoY
3. **Sector Concentration:** 35% in technology sector

**Risk Mitigation Strategies:**
- Bridge funding evaluation for HealthStart
- Strategic pivot analysis for RetailCo
- Portfolio diversification into healthcare/fintech

**Risk Score:** 6.8/10 (Moderate-High)`,

      'optimization': `🎯 **Portfolio Optimization Strategy**

**Immediate Actions (0-30 days):**
1. Implement cost controls at HealthStart (-20% burn rate)
2. Explore strategic partnerships for RetailCo
3. Initiate due diligence on healthcare opportunities

**Medium-term Strategy (30-90 days):**
- Diversify into healthcare and fintech sectors
- Optimize capital allocation across portfolio
- Implement performance monitoring dashboard

**Expected Impact:** +15-25% portfolio value over 12 months`,

      'prediction': `🔮 **Predictive Analysis**

**12-Month Forecast:**
- Portfolio Value: +22% growth projected
- Revenue Growth: 28% average across companies
- Market Expansion: 3 new geographic markets

**Key Predictions:**
- TechCorp: IPO readiness by Q4 2024
- HealthStart: Break-even by Q2 2024
- RetailCo: Turnaround completion by Q3 2024

**Confidence Level:** 84% based on current trends`,

      'default': `🤖 **AI Analysis Complete**

I've processed your request using advanced portfolio analytics. Based on current market data, company performance metrics, and industry trends, I've generated insights tailored to your specific portfolio composition.

**Analysis Includes:**
- Real-time performance metrics
- Risk assessment and mitigation
- Growth opportunity identification
- Strategic recommendations

Would you like me to dive deeper into any specific area or provide more detailed analysis?`
    }

    for (const [key, response] of Object.entries(responses)) {
      if (lowerPrompt.includes(key)) {
        return response
      }
    }
    return responses.default
  }

  const generateSuggestions = (prompt: string): string[] => {
    const lowerPrompt = prompt.toLowerCase()

    if (lowerPrompt.includes('performance')) {
      return [
        "Show detailed KPI breakdown",
        "Compare with industry benchmarks",
        "Identify improvement opportunities"
      ]
    }

    if (lowerPrompt.includes('risk')) {
      return [
        "Develop risk mitigation plan",
        "Analyze risk correlation",
        "Monitor risk indicators"
      ]
    }

    if (lowerPrompt.includes('optimization')) {
      return [
        "Create implementation timeline",
        "Calculate ROI projections",
        "Identify resource requirements"
      ]
    }

    return [
      "Provide detailed analysis",
      "Show supporting data",
      "Generate action plan"
    ]
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'risk':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'trend':
        return <BarChart3 className="w-5 h-5 text-blue-500" />
      case 'recommendation':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />
      case 'prediction':
        return <Target className="w-5 h-5 text-purple-500" />
      default:
        return <Sparkles className="w-5 h-5 text-purple-500" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'border-l-4 border-red-500'
      case 2:
        return 'border-l-4 border-yellow-500'
      case 3:
        return 'border-l-4 border-blue-500'
      default:
        return 'border-l-4 border-gray-300'
    }
  }

  const formatConfidence = (confidence: number) => {
    if (confidence >= 90) return { text: 'Very High', color: 'text-green-600' }
    if (confidence >= 80) return { text: 'High', color: 'text-green-500' }
    if (confidence >= 70) return { text: 'Medium', color: 'text-yellow-500' }
    if (confidence >= 60) return { text: 'Low', color: 'text-orange-500' }
    return { text: 'Very Low', color: 'text-red-500' }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'beta':
        return 'bg-blue-100 text-blue-800'
      case 'coming-soon':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'beta':
        return <AlertTriangle className="h-4 w-4" />
      case 'coming-soon':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Loading AI Assistant</h2>
              <p className="text-gray-600">Initializing intelligent analysis capabilities...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">AI Portfolio Assistant</h1>
                  <p className="text-gray-600 mt-1">Powered by Llama 3.2 - Your intelligent portfolio analysis companion</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${systemStatus.aiOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">
                    {systemStatus.aiOnline ? 'AI Online' : 'AI Offline'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Response: {systemStatus.responseTime}ms
                </p>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
                <Zap className="h-3 w-3 mr-1" />
                Powered by Ollama
              </Badge>
            </div>
          </div>
        </div>

        {/* AI Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {aiFeatures.map((feature) => {
            const IconComponent = feature.icon
            return (
              <Card key={feature.id} className="group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <Badge className={`text-xs ${getStatusColor(feature.status)}`}>
                      {getStatusIcon(feature.status)}
                      <span className="ml-1 capitalize">{feature.status}</span>
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.capabilities.map((capability, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                        {capability}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main AI Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="copilot" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>AI Copilot</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4" />
              <span>AI Insights</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="copilot" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* AI Copilot Widget */}
              <div className="lg:col-span-2">
                <AICopilotWidget 
                  portfolioName="TechCorp Portfolio"
                  className="w-full"
                />
              </div>

              {/* Quick Actions Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <span>Quick Actions</span>
                    </CardTitle>
                    <CardDescription>
                      Common portfolio analysis tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        // This would trigger a specific analysis
                        console.log('Portfolio Performance Analysis')
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Performance Analysis
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        console.log('Risk Assessment')
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Risk Assessment
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        console.log('Optimization Recommendations')
                      }}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Optimization Tips
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        console.log('Benchmark Comparison')
                      }}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Benchmark Comparison
                    </Button>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-green-600" />
                      <span>System Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Models</span>
                      <Badge variant="outline" className="text-xs">
                        {systemStatus.modelsAvailable.length} Available
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Response Time</span>
                      <span className="text-sm font-medium">{systemStatus.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Update</span>
                      <span className="text-sm text-gray-500">
                        {systemStatus.lastUpdate.toLocaleTimeString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <AIInsightsPanel refreshInterval={300000} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Deep portfolio analysis and predictive modeling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics</h3>
                  <p className="text-gray-600 mb-4">
                    Comprehensive analytics dashboard with predictive modeling and trend analysis
                  </p>
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Launch Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3.2</p>
                  <p className="text-sm text-gray-600">AI Model Version</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">99.9%</p>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">&lt;2s</p>
                  <p className="text-sm text-gray-600">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="text-sm text-gray-600">AI Support</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
