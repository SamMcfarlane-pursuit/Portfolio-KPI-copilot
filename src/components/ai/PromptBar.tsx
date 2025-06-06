"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { Textarea } from '@/components/ui/textarea' // Temporarily disabled

interface PromptBarProps {
  onSubmit: (prompt: string) => void
  loading?: boolean
  placeholder?: string
  suggestions?: string[]
  showSuggestions?: boolean
  multiline?: boolean
  className?: string
}

export function PromptBar({
  onSubmit,
  loading = false,
  placeholder = "Ask MiniLLM about your portfolio...",
  suggestions = [],
  showSuggestions = true,
  multiline = false,
  className = ""
}: PromptBarProps) {
  const [prompt, setPrompt] = useState('')
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const defaultSuggestions = [
    "Analyze portfolio performance",
    "What are the key risks?",
    "Show investment recommendations",
    "Compare sector performance",
    "Identify growth opportunities",
    "Assess market conditions",
    "Review financial health",
    "Generate executive summary"
  ]

  const allSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions
  const displaySuggestions = showAllSuggestions ? allSuggestions : allSuggestions.slice(0, 4)

  const handleSubmit = () => {
    if (prompt.trim() && !loading) {
      onSubmit(prompt.trim())
      setPrompt('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion)
    inputRef.current?.focus()
  }

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Enhanced Prompt Input */}
      <Card className="border-2 border-primary/20 shadow-soft hover:shadow-glow smooth-transition">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                placeholder={placeholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="border-0 focus-visible:ring-0 text-base h-12 pr-12 smooth-transition"
                maxLength={500}
              />
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground smooth-transition"
                  disabled={loading}
                  aria-label="Clear prompt"
                  title="Clear prompt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
              size="lg"
              className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg smooth-transition"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2l-7 20-4-9-9-4z"></path>
                  </svg>
                  <span>Send</span>
                </div>
              )}
            </Button>
          </div>
          
          {/* Character count */}
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>Press Enter to send</span>
            <span>{prompt.length}/500</span>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Quick Prompts:</h3>
            {allSuggestions.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                className="text-xs"
              >
                {showAllSuggestions ? 'Show Less' : `Show All (${allSuggestions.length})`}
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {displaySuggestions.map((suggestion, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1 text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* AI Status Indicator */}
      <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>MiniLLM AI Engine</span>
        </div>
        <span>•</span>
        <span>Specialized in Portfolio Operations</span>
        <span>•</span>
        <span>Real-time Analysis</span>
      </div>
    </div>
  )
}

// Enhanced Prompt Bar with additional features
export function EnhancedPromptBar({
  onSubmit,
  loading = false,
  className = ""
}: {
  onSubmit: (prompt: string) => void
  loading?: boolean
  className?: string
}) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple')
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [analysisType, setAnalysisType] = useState<string>('')

  const companies = [
    'TechFlow Solutions',
    'HealthTech Innovations', 
    'AI Dynamics Corp',
    'EcoEnergy Systems',
    'FinanceFlow Pro'
  ]

  const analysisTypes = [
    'Performance Analysis',
    'Risk Assessment',
    'Investment Recommendation',
    'Growth Analysis',
    'Sector Comparison'
  ]

  const handleAdvancedSubmit = () => {
    if (selectedCompany && analysisType) {
      const prompt = `${analysisType} for ${selectedCompany}`
      onSubmit(prompt)
      setSelectedCompany('')
      setAnalysisType('')
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant={mode === 'simple' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('simple')}
        >
          Simple Mode
        </Button>
        <Button
          variant={mode === 'advanced' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('advanced')}
        >
          Advanced Mode
        </Button>
      </div>

      {mode === 'simple' ? (
        <PromptBar
          onSubmit={onSubmit}
          loading={loading}
          multiline={true}
          placeholder="Ask MiniLLM anything about your portfolio..."
        />
      ) : (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-center">Structured Analysis Request</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Company:</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  disabled={loading}
                  aria-label="Select Company"
                  title="Select Company"
                >
                  <option value="">Choose a company...</option>
                  {companies.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Analysis Type:</label>
                <select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  disabled={loading}
                  aria-label="Select Analysis Type"
                  title="Select Analysis Type"
                >
                  <option value="">Choose analysis type...</option>
                  {analysisTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <Button
              onClick={handleAdvancedSubmit}
              disabled={loading || !selectedCompany || !analysisType}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                `Generate ${analysisType} for ${selectedCompany || 'Selected Company'}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
