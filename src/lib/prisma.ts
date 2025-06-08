import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper function to handle database errors
export function handlePrismaError(error: any) {
  if (error.code === 'P2002') {
    return new Error('A record with this information already exists.')
  }
  if (error.code === 'P2025') {
    return new Error('Record not found.')
  }
  if (error.code === 'P2003') {
    return new Error('Foreign key constraint failed.')
  }
  return new Error('Database operation failed.')
}

// Connection health check
export async function checkDatabaseConnection() {
  try {
    // Skip database check during build time if no DATABASE_URL
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL && !process.env.DATABASE_URL) {
      return {
        status: 'not_configured',
        message: 'Build environment - skipping database check',
        timestamp: new Date().toISOString()
      }
    }

    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Database connection failed:', error)
    return { status: 'unhealthy', error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() }
  }
}
