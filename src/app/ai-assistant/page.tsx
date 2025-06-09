'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  CheckCircle
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
}

interface Insight {
  id: string
  title: string
  description: string
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation'
  confidence: number
  impact: 'high' | 'medium' | 'low'
}

const sampleInsights: Insight[] = [
  {
    id: '1',
    title: 'Revenue Growth Acceleration',
    description: 'TechCorp shows 45% QoQ revenue growth, significantly outpacing industry average of 12%.',
    type: 'opportunity',
    confidence: 92,
    impact: 'high'
  },
  {
    id: '2',
    title: 'Burn Rate Alert',
    description: 'HealthStart\'s current burn rate suggests 8-month runway. Consider bridge funding.',
    type: 'risk',
    confidence: 87,
    impact: 'high'
  },
  {
    id: '3',
    title: 'Market Expansion Opportunity',
    description: 'AI analysis suggests European market entry could increase TAM by 40% for FinanceFlow.',
    type: 'recommendation',
    confidence: 78,
    impact: 'medium'
  }
]

const quickPrompts = [
  "Analyze portfolio performance this quarter",
  "What are the top risks in my portfolio?",
  "Suggest optimization strategies for underperforming companies",
  "Compare sector performance trends",
  "Generate investment recommendations"
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI Portfolio Assistant. I can help you analyze performance, identify opportunities, assess risks, and provide strategic recommendations. What would you like to explore today?',
      timestamp: new Date(),
      suggestions: quickPrompts.slice(0, 3)
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateAIResponse(content),
        timestamp: new Date(),
        suggestions: generateSuggestions(content)
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const generateAIResponse = (prompt: string): string => {
    const responses = {
      'portfolio performance': 'Based on my analysis of your portfolio, overall performance is strong with a 24.5% average growth rate. TechCorp and HealthStart are your top performers, while RetailCo needs attention due to declining margins.',
      'risks': 'I\'ve identified 3 key risks: 1) HealthStart\'s high burn rate, 2) RetailCo\'s market share decline, and 3) Concentration risk in the technology sector (35% of portfolio).',
      'optimization': 'For optimization, I recommend: 1) Implement cost controls at HealthStart, 2) Explore strategic partnerships for RetailCo, 3) Diversify into healthcare and fintech sectors.',
      'default': 'I\'ve analyzed your request and here are my insights based on current portfolio data and market trends. Would you like me to dive deeper into any specific area?'
    }

    const lowerPrompt = prompt.toLowerCase()
    for (const [key, response] of Object.entries(responses)) {
      if (lowerPrompt.includes(key)) {
        return response
      }
    }
    return responses.default
  }

  const generateSuggestions = (prompt: string): string[] => {
    return [
      "Show me detailed metrics for this analysis",
      "What actions should I take next?",
      "Compare this to industry benchmarks"
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
      default:
        return <Sparkles className="w-5 h-5 text-purple-500" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="w-8 h-8 mr-3 text-blue-500" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Get intelligent insights and recommendations for your portfolio
          </p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>AI Powered</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                AI Chat
              </CardTitle>
              <CardDescription>
                Ask questions about your portfolio, get insights, and receive recommendations
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      
                      {message.suggestions && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium">Suggested follow-ups:</p>
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 mr-1 mb-1"
                              onClick={() => handleSendMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Ask about your portfolio..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  disabled={isLoading}
                />
                <Button 
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Prompts */}
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Quick prompts:</p>
                <div className="flex flex-wrap gap-1">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => handleSendMessage(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Live Insights
              </CardTitle>
              <CardDescription>
                Real-time AI analysis of your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleInsights.map((insight) => (
                  <div key={insight.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getInsightIcon(insight.type)}
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                      </div>
                      <Badge className={getImpactColor(insight.impact)}>
                        {insight.impact}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {insight.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Confidence: {insight.confidence}%
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Explore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Portfolio Health Check</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Risk Assessment</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Market Analysis</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
