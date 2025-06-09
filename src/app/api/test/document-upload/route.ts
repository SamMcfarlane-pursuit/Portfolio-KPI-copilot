import { NextRequest, NextResponse } from 'next/server'
import { DocumentProcessor } from '@/lib/document-processor'

/**
 * Public Test Endpoint for Document Upload Testing
 * Tests document processing capabilities without authentication
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string || 'test'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/json'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not supported' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Process document
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const processedDocument = await DocumentProcessor.processDocument(buffer, file.type, file.name)

    // Return processing results
    return NextResponse.json({
      success: true,
      message: 'Document processed successfully',
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        category
      },
      processing: {
        extractedText: processedDocument.extractedText.slice(0, 1000), // First 1000 chars
        metadata: processedDocument.metadata,
        kpiSuggestions: processedDocument.kpiSuggestions,
        structuredData: processedDocument.structuredData
      },
      analysis: {
        totalKPIs: processedDocument.kpiSuggestions.length,
        categories: Array.from(new Set(processedDocument.kpiSuggestions.map(kpi => kpi.category))),
        highConfidenceKPIs: processedDocument.kpiSuggestions.filter(kpi => kpi.confidence > 0.8).length,
        textLength: processedDocument.extractedText.length,
        wordCount: processedDocument.metadata.wordCount
      }
    })

  } catch (error) {
    console.error('Document processing test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Document upload test endpoint',
    supportedTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/json'
    ],
    maxSize: '10MB',
    features: [
      'Text extraction',
      'KPI suggestion',
      'Structured data analysis',
      'Metadata extraction'
    ]
  })
}
