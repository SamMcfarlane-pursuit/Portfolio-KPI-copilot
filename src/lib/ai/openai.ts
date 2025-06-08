import OpenAI from 'openai'

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  if (process.env.DISABLE_OPENAI === 'true' || !process.env.OPENAI_API_KEY) {
    return null
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openai
}

export async function generateWithOpenAI(question: string): Promise<string> {
  const client = getOpenAIClient()

  if (!client) {
    throw new Error('OpenAI API key not configured or disabled')
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a financial expert specializing in KPI analysis and portfolio management. 
          Provide clear, actionable insights about financial metrics and investment strategies.
          Keep responses concise but comprehensive, focusing on practical applications.`
        },
        {
          role: 'user',
          content: question
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    return response
  } catch (error) {
    console.error('OpenAI API error:', error)
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`)
    }
    throw new Error('OpenAI API request failed')
  }
}

export async function openaiHealthCheck() {
  try {
    // Check if OpenAI is disabled
    if (process.env.DISABLE_OPENAI === 'true') {
      return {
        status: 'disabled',
        configured: false,
        message: 'OpenAI is intentionally disabled - using Llama AI instead'
      }
    }

    // Skip health check during build time
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL) {
      return {
        status: 'not_configured',
        configured: false,
        message: 'Build environment - skipping health check'
      }
    }

    const client = getOpenAIClient()

    if (!client || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return {
        status: 'not_configured',
        configured: false,
        message: 'OpenAI API key not set'
      }
    }

    // Simple test request
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    })

    return {
      status: 'healthy',
      configured: true,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      message: 'OpenAI API connected successfully'
    }
  } catch (error) {
    console.error('OpenAI health check failed:', error)
    return {
      status: 'unhealthy',
      configured: true,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
