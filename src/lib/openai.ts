/**
 * OpenAI Client Configuration
 * Simple wrapper for OpenAI API integration
 */

import OpenAI from 'openai'

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function createChatCompletion(messages: any[], options: any = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const completion = await openai.chat.completions.create({
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: options.maxTokens || parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
      temperature: options.temperature || parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      ...options
    })

    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

export const SYSTEM_PROMPTS = {
  portfolio_analysis: `You are a senior financial advisor specializing in private equity and portfolio management.
  Provide clear, actionable insights about portfolio performance, KPIs, and investment strategies.`,

  kpi_explanation: `You are a financial expert. Explain KPIs in clear, practical terms with industry context and benchmarks.`,

  general: `You are a helpful AI assistant specializing in portfolio management and financial analysis.`
}

export async function checkOpenAIHealth() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { status: 'not_configured', message: 'API key not set' }
    }

    // Simple test request
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    })

    return { status: 'healthy', message: 'OpenAI API operational' }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
