import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Validation schema
const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = signUpSchema.parse(body)
    const { name, email, password } = validatedData

    // Check if database is available
    let databaseAvailable = false
    try {
      await prisma.user.count()
      databaseAvailable = true
    } catch (dbError) {
      console.warn('Database not available, suggesting OAuth instead:', dbError)
      return NextResponse.json({
        error: 'Database temporarily unavailable. Please use Google Sign-In instead.',
        suggestion: 'oauth',
        oauthUrl: '/api/auth/signin/google'
      }, { status: 503 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ANALYST', // Default role
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })

    // Log the registration event (optional - graceful failure)
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTRATION',
          resourceType: 'AUTH',
          resourceId: user.id,
          metadata: JSON.stringify({
            method: 'email_password',
            email: user.email,
          }),
        },
      })
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError)
      // Continue without failing the registration
    }

    return NextResponse.json(
      { 
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Sign up error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }

      if (error.message.includes('no such table')) {
        return NextResponse.json(
          { error: 'Database not initialized. Please contact support.' },
          { status: 503 }
        )
      }

      // Log the actual error for debugging
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}
