"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Brain, 
  Loader2, 
  MessageSquare,
  Sparkles,
  TrendingUp,
  Building2,
  DollarSign
} from 'lucide-react'
import { systemCoordinator, AIResponse } from '@/lib/system/SystemCoordinator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  provider?: string
  processingTime?: number
}

interface UnifiedAIInterfaceProps {
  portfolioContext?: any
  className?: string
}

export function UnifiedAIInterface({ portfolioContext, className }: UnifiedAIInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Portfolio AI Assistant. I can help you analyze portfolio performance, assess risks, provide investment recommendations, and answer questions about your data. What would you like to explore?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiCapable, setAiCapable] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check AI capabilities
    const checkCapabilities = () => {
      const capabilities = systemCoordinator.getCapabilities()
      setAiCapable(capabilities.aiChat)
    }
    
    checkCapabilities()
    const interval = setInterval(checkCapabilities, 10000) // Check every 10 seconds
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response: AIResponse = await systemCoordinator.sendAIQuery(
        userMessage.content,
        portfolioContext
      )

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        provider: response.provider,
        processingTime: response.processingTime
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to get AI response:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        provider: 'error'
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickActions = [
    {
      icon: TrendingUp,
      label: "Portfolio Performance",
      prompt: "Analyze the overall performance of our portfolio companies"
    },
    {
      icon: Building2,
      label: "Company Analysis",
      prompt: "Show me insights about our top performing companies"
    },
    {
      icon: DollarSign,
      label: "Investment Opportunities",
      prompt: "What investment opportunities do you see in our current portfolio?"
    },
    {
      icon: Sparkles,
      label: "Market Insights",
      prompt: "Provide market insights and trends affecting our portfolio"
    }
  ]

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="w-5 h-5" />
          <span>AI Assistant</span>
          <Badge variant={aiCapable ? 'default' : 'secondary'}>
            {aiCapable ? 'Ready' : 'Limited'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Ask questions about your portfolio, get insights, and receive AI-powered recommendations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.prompt)}
                className="justify-start text-left h-auto p-3"
                disabled={isLoading}
              >
                <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs">{action.label}</span>
              </Button>
            )
          })}
        </div>

        {/* Chat Messages */}
        <ScrollArea className="h-96 w-full border rounded-lg p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.provider && message.role === 'assistant' && (
                      <span className="flex items-center space-x-1">
                        <span>{message.provider}</span>
                        {message.processingTime && (
                          <span>• {message.processingTime}ms</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={aiCapable ? "Ask me anything about your portfolio..." : "AI features limited - basic responses only"}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {!aiCapable && (
          <div className="text-xs text-muted-foreground text-center">
            Advanced AI features require system configuration. Basic responses available.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
