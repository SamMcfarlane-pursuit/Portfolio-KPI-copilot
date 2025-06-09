import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Pinecone is deprecated in favor of Supabase vector search
    return NextResponse.json({
      success: true,
      pinecone: {
        configured: false,
        available: false,
        deprecated: true
      },
      message: 'Pinecone has been replaced with Supabase vector search',
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
