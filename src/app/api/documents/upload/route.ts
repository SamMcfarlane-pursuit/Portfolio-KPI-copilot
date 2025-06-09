import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// File processing utilities
import { DocumentProcessor } from '@/lib/document-processor'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string || 'other'
    const userId = session.user.id

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

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'documents')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Process document using the enhanced document processor
    const processedDocument = await DocumentProcessor.processDocument(buffer, file.type, file.name)

    // Save document record to database
    const document = await prisma.document.create({
      data: {
        title: file.name,
        filename: fileName,
        fileType: file.type,
        fileSize: file.size,
        filePath: `/uploads/documents/${fileName}`,
        uploadedBy: userId,
        organizationId: '', // Will be set based on user's organization
        status: 'COMPLETED',
        extractedText: processedDocument.extractedText.slice(0, 10000), // Limit to 10k chars
        metadata: JSON.stringify({
          category,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          processingMetadata: processedDocument.metadata,
          structuredData: processedDocument.structuredData
        })
      }
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        fileType: document.fileType,
        fileSize: document.fileSize,
        uploadedAt: document.createdAt,
        status: document.status
      },
      extractedData: {
        ...processedDocument.metadata,
        textPreview: processedDocument.extractedText.slice(0, 500),
        kpiSuggestions: processedDocument.kpiSuggestions,
        structuredData: processedDocument.structuredData
      },
      message: 'File uploaded and processed successfully'
    })

  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}



export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')

    const whereClause: any = {
      uploadedBy: session.user.id
    }

    if (category && category !== 'all') {
      whereClause.metadata = {
        contains: `"category":"${category}"`
      }
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        fileType: true,
        fileSize: true,
        status: true,
        createdAt: true,
        metadata: true
      }
    })

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        ...doc,
        metadata: doc.metadata ? JSON.parse(doc.metadata as string) : {}
      }))
    })

  } catch (error) {
    console.error('Documents fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
