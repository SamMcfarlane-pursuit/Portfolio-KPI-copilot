"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react'

interface AICopilotWidgetProps {
  portfolioId?: string
  portfolioName?: string
  className?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'analysis' | 'recommendation' | 'query'
}

interface AIResponse {
  success: boolean
  response: string
  analysis: {
    insights: string[]
    recommendations: string[]
    riskFactors: string[]
    opportunities: string[]
    predictions: any[]
    benchmarks: any[]
  }
  suggestions: string[]
  metadata: {
    processingTime: number
    provider: string
    model: string
  }
  nextActions: string[]
  relatedQueries: string[]
}

export function AICopilotWidget({ portfolioId, portfolioName, className }: AICopilotWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI Portfolio Copilot. I can help you analyze ${portfolioName || 'your portfolio'} performance, identify trends, and provide strategic recommendations. Ask me anything about your portfolio!`,
      timestamp: new Date(),
      type: 'query'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const quickQuestions = [
    "Analyze portfolio performance trends",
    "What are the key risk factors?",
    "Generate optimization recommendations",
    "Compare with industry benchmarks",
    "Show revenue growth analysis",
    "Identify growth opportunities"
  ]

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      type: 'query'
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const startTime = Date.now()

    try {
      const response = await fetch('/api/public/ai-copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          type: 'analysis',
          portfolioId,
          preferences: {
            aiProvider: 'ollama',
            temperature: 0.7,
            maxTokens: 2000
          }
        }),
      })

      const data: AIResponse = await response.json()
      const endTime = Date.now()
      const responseTimeMs = endTime - startTime
      setResponseTime(responseTimeMs)

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          type: 'analysis'
        }

        setMessages(prev => [...prev, aiMessage])

        // Add suggestions as follow-up if available
        if (data.suggestions && data.suggestions.length > 0) {
          setTimeout(() => {
            const suggestionMessage: Message = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: `💡 **You might also ask:**\n${data.suggestions.map((s: string) => `• ${s}`).join('\n')}`,
              timestamp: new Date(),
              type: 'query'
            }
            setMessages(prev => [...prev, suggestionMessage])
          }, 1000)
        }
      } else {
        throw new Error(data.response || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        timestamp: new Date(),
        type: 'query'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/•/g, '•')
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">AI Portfolio Copilot</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            Powered by Llama 3.2
          </Badge>
        </div>
        <CardDescription>
          Intelligent analysis and recommendations for {portfolioName || 'your portfolio'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Questions */}
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleSendMessage(question)}
              disabled={loading}
              className="text-xs"
            >
              {question}
            </Button>
          ))}
        </div>

        {/* Chat Messages */}
        <ScrollArea className="h-64 w-full rounded-md border p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Response Time */}
        {responseTime && (
          <div className="text-xs text-gray-500 text-center">
            Response time: {responseTime}ms
          </div>
        )}

        {/* Input */}
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about portfolio performance, trends, or recommendations..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>AI Online</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>Real-time Analysis</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Lightbulb className="h-3 w-3" />
            <span>Powered by Ollama</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 