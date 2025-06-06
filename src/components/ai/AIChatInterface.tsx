"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'analysis' | 'recommendation' | 'query'
}

interface AIChatInterfaceProps {
  portfolioId?: string
  portfolioName?: string
}

// Function to format AI responses for clean display
const formatAIResponse = (content: string): string => {
  return content
    // Clean up markdown formatting for better display
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/•/g, '•') // Ensure bullet points are consistent
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
    .replace(/\s+$/gm, '') // Remove trailing whitespace from lines
    .trim()
}

// Function to detect if content is structured data
const isStructuredContent = (content: string): boolean => {
  return content.includes('**') ||
         content.includes('•') ||
         content.includes('📊') ||
         content.includes('🔍') ||
         content.includes('💡') ||
         content.includes('⚠️') ||
         content.includes('📈') ||
         content.includes('🛡️') ||
         content.includes('💰') ||
         content.includes('⏱️')
}

// Function to truncate long messages for better display
const truncateMessage = (content: string, maxLength: number = 2000): string => {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '\n\n... [Message truncated for display]'
}

export function AIChatInterface({ portfolioId, portfolioName }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your Portfolio Operations AI assistant powered by MiniLLM. I can help you analyze portfolio performance, identify risks, and provide investment recommendations. ${portfolioName ? `I'm ready to analyze ${portfolioName}.` : 'Ask me anything about your portfolio!'}`,
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
    "Analyze the performance of this portfolio company",
    "What are the key risk factors?", 
    "Generate investment recommendation",
    "Compare with sector benchmarks",
    "Show revenue growth trends",
    "Identify optimization opportunities"
  ]

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content) return

    // Validate input length
    if (content.length > 500) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Message too long. Please keep your questions under 500 characters for better processing.',
        timestamp: new Date(),
        type: 'query'
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }

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
      // Use Llama chat API for intelligent responses
      const response = await fetch('/api/demo/llama-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          portfolioId: portfolioId,
          conversationId: 'chat_' + Date.now()
        }),
      })

      const data = await response.json()

      if (data.success) {
        const endTime = Date.now()
        const responseTimeMs = endTime - startTime
        setResponseTime(responseTimeMs)

        const aiResponse = data.data.response
        const responseType = data.data.type === 'analysis' ? 'analysis' :
                           data.data.type === 'comparison' ? 'recommendation' : 'query'

        // Format the AI response for clean display
        const formattedResponse = formatAIResponse(aiResponse)
        const truncatedResponse = truncateMessage(formattedResponse)
        const responseWithTime = truncatedResponse + (responseTimeMs > 0 ? `\n\n⏱️ Response time: ${responseTimeMs}ms` : '')

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseWithTime,
          timestamp: new Date(),
          type: responseType
        }

        setMessages(prev => [...prev, aiMessage])

        // Add suggestions as follow-up if available
        if (data.data.suggestions && data.data.suggestions.length > 0) {
          setTimeout(() => {
            const suggestionMessage: Message = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: `💡 **You might also ask:**\n${data.data.suggestions.map((s: string) => `• ${s}`).join('\n')}`,
              timestamp: new Date(),
              type: 'query'
            }
            setMessages(prev => [...prev, suggestionMessage])
          }, 1000)
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Error getting AI response:', error)

      // Fallback to basic analysis if Llama fails
      if (content.toLowerCase().includes('analyze') || content.toLowerCase().includes('performance')) {
        // Get real AI analysis as fallback
        try {
          const response = await fetch(`/api/demo/ai-analysis${portfolioId ? `?portfolioId=${portfolioId}` : ''}`)
          const data = await response.json()

          if (data.success) {
            const aiResponse = `📊 **Portfolio Analysis Results:**

**Overall Health Score:** ${data.data.overallHealth || 'N/A'}/100

**Sentiment Analysis:** ${data.data.sentiment.sentiment.replace('_', ' ').toUpperCase()}
- Confidence: ${((data.data.sentiment.confidence || 0.8) * 100).toFixed(0)}%
- Score: ${data.data.sentiment.score?.toFixed(2) || 'N/A'}

**Key Insights:**
${data.data.sentiment.keyFactors?.map((factor: string) => `• ${factor}`).join('\n') || '• Analysis in progress'}

**Investment Recommendation:** ${data.data.sentiment.investmentRecommendation?.replace('_', ' ').toUpperCase() || 'HOLD'}

**Market Trend:** ${data.data.sentiment.marketTrend?.toUpperCase() || 'NEUTRAL'}

*Analysis powered by Llama AI - Advanced Local Intelligence*`

            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date(),
              type: 'analysis'
            }
            setMessages(prev => [...prev, aiMessage])
          }
        } catch (fallbackError) {
          console.error('Fallback analysis failed:', fallbackError)
          // Final fallback - simple error message
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '❌ Sorry, I encountered an error processing your request. Please try again or ask a different question.',
            timestamp: new Date(),
            type: 'query'
          }
          setMessages(prev => [...prev, errorMessage])
        }
      } else {
        // Final fallback for non-analysis queries
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Sorry, I encountered an error processing your request about "${content}". Please try again.`,
          timestamp: new Date(),
          type: 'query'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-[600px] flex flex-col shadow-soft hover:shadow-glow smooth-transition">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <path d="M12 17h.01"></path>
            </svg>
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
            AI Portfolio Assistant
          </span>
          <Badge variant="default" className="bg-green-600">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse mr-1"></div>
            MiniLLM
          </Badge>
        </CardTitle>
        <CardDescription className="font-medium">
          Ask questions about portfolio performance, risks, and investment opportunities
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4">
        {/* Enhanced Messages Container */}
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : message.type === 'analysis'
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 dark:from-blue-950 dark:to-blue-900 dark:border-blue-800'
                      : message.type === 'recommendation'
                      ? 'bg-gradient-to-r from-green-50 to-green-100 border border-green-200 dark:from-green-950 dark:to-green-900 dark:border-green-800'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 dark:from-gray-900 dark:to-gray-800 dark:border-gray-700'
                  }`}
                >
                  {/* Message Content with Enhanced Formatting */}
                  <div className={`text-sm leading-relaxed chat-message ${
                    message.role === 'user' ? 'text-white' : 'text-foreground'
                  }`}>
                    {/* Check if content is structured and format accordingly */}
                    {isStructuredContent(message.content) ? (
                      <div className="space-y-2 structured-content">
                        {message.content.split('\n').map((line, index) => {
                          if (line.trim() === '') return <div key={index} className="h-2" />

                          // Handle bullet points
                          if (line.includes('•')) {
                            return (
                              <div key={index} className="bullet-point">
                                <span className="bullet">•</span>
                                <span className="flex-1">{line.replace('•', '').trim()}</span>
                              </div>
                            )
                          }

                          // Handle headers (lines with emojis or special formatting)
                          if (line.includes('📊') || line.includes('🔍') || line.includes('💡') || line.includes('⚠️')) {
                            return (
                              <div key={index} className="header-line">
                                {line}
                              </div>
                            )
                          }

                          // Regular lines
                          return (
                            <div key={index} className="break-words">
                              {line}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="message-text">{message.content}</div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 dark:from-gray-900 dark:to-gray-800 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">MiniLLM is analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Enhanced Quick Questions */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-semibold mb-3 text-blue-700 dark:text-blue-300">💡 Quick Questions:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {quickQuestions.slice(0, 3).map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage(question)}
                disabled={loading}
                className="text-xs h-auto py-2 px-3 text-left justify-start hover:bg-blue-100 dark:hover:bg-blue-900 border-blue-300 dark:border-blue-700"
              >
                <span className="truncate">{question}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Enhanced Input Area */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Ask about portfolio performance, risks, or recommendations..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={loading}
                className="pr-12 h-12 text-sm border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                {input.length}/500
              </div>
            </div>
            <Button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2l-7 20-4-9-9-4z"></path>
                </svg>
              )}
            </Button>
          </div>

          {/* Input Helper Text */}
          <div className="text-xs text-muted-foreground text-center">
            Press Enter to send • Shift+Enter for new line • {responseTime && `Last response: ${responseTime}ms`}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
