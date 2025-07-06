/**
 * AI Test Endpoint
 * Simple test to verify AI functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { ollamaService } from '@/lib/ai/ollama'

export async function GET(request: NextRequest) {
  try {
    // Test Ollama availability
    const ollamaHealth = await ollamaService.healthCheck()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ai: {
        ollama: {
          status: ollamaHealth.status,
          models: ollamaHealth.models,
          responseTime: ollamaHealth.responseTime,
          available: ollamaService.isAvailable()
        }
      },
      message: 'AI test endpoint is working'
    })
  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query = 'Hello, how are you?' } = body

    // Test basic AI chat functionality
    const response = await ollamaService.chat([
      { role: 'user', content: query }
    ], {
      temperature: 0.7,
      maxTokens: 500
    })

    return NextResponse.json({
      success: true,
      query,
      response,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('AI test POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 