import { NextResponse } from 'next/server'
import { pinecone } from '@/lib/pinecone'

export async function GET() {
  try {
    const status = pinecone.getStatus()
    
    return NextResponse.json({
      success: true,
      pinecone: status,
      message: status.configured ? 'Pinecone is ready for AI-powered search!' : 'Pinecone not configured',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Pinecone status error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get Pinecone status',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
