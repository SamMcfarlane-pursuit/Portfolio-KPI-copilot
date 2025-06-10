/**
 * Comprehensive CRUD Service for Production-Level Data Management
 * Handles Create, Read, Update, Delete operations with validation, audit logging, and error handling
 */

import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Initialize Prisma client
const prisma = new PrismaClient()

// Validation schemas
export const portfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required').max(100, 'Portfolio name too long'),
  description: z.string().optional(),
  totalValue: z.number().min(0, 'Total value must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  isActive: z.boolean().default(true)
})

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol too long'),
  sector: z.string().optional(),
  industry: z.string().optional(),
  marketCap: z.number().min(0, 'Market cap must be positive').optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

export const kpiSchema = z.object({
  name: z.string().min(1, 'KPI name is required').max(100, 'KPI name too long'),
  value: z.number(),
  unit: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  targetValue: z.number().optional(),
  isActive: z.boolean().default(true),
  portfolioId: z.string().optional(),
  companyId: z.string().optional()
})

// Audit log interface
interface AuditLog {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ'
  entityType: string
  entityId: string
  userId: string
  userEmail: string
  changes?: any
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

// CRUD Service Class
export class CRUDService {
  private static instance: CRUDService
  
  private constructor() {}
  
  static getInstance(): CRUDService {
    if (!CRUDService.instance) {
      CRUDService.instance = new CRUDService()
    }
    return CRUDService.instance
  }

  // Audit logging
  private async logAudit(log: AuditLog): Promise<void> {
    try {
      // Store audit log in database
      await prisma.auditLog.create({
        data: {
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          userId: log.userId,
          userEmail: log.userEmail,
          changes: log.changes ? JSON.stringify(log.changes) : null,
          timestamp: log.timestamp,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent
        }
      }).catch(() => {
        // Fallback to console logging if database fails
        console.log('Audit Log:', log)
      })
    } catch (error) {
      console.error('Failed to log audit:', error)
    }
  }

  // Get current user session
  private async getCurrentUser() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized: No valid session')
    }
    return session.user
  }

  // Validate user permissions
  private async validatePermissions(action: string, entityType: string, entityId?: string): Promise<boolean> {
    const user = await this.getCurrentUser()
    
    // Basic permission check - can be extended with RBAC
    if (!user.id) {
      return false
    }

    // For now, all authenticated users can perform CRUD operations
    // This can be extended with role-based permissions
    return true
  }

  // Generic create operation
  async create<T>(
    entityType: string,
    data: any,
    schema: z.ZodSchema<T>,
    request?: Request
  ): Promise<T> {
    const user = await this.getCurrentUser()
    
    // Validate permissions
    if (!(await this.validatePermissions('CREATE', entityType))) {
      throw new Error('Insufficient permissions to create ' + entityType)
    }

    // Validate data
    const validatedData = schema.parse(data)

    let result: any

    try {
      // Add user context to data
      const dataWithUser = {
        ...validatedData,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Perform create operation based on entity type
      switch (entityType.toLowerCase()) {
        case 'portfolio':
          result = await prisma.portfolio.create({ data: dataWithUser })
          break
        case 'company':
          result = await prisma.company.create({ data: dataWithUser })
          break
        case 'kpi':
          result = await prisma.kPI.create({ data: dataWithUser })
          break
        default:
          throw new Error(`Unsupported entity type: ${entityType}`)
      }

      // Log audit
      await this.logAudit({
        action: 'CREATE',
        entityType,
        entityId: result.id,
        userId: user.id!,
        userEmail: user.email!,
        changes: validatedData,
        timestamp: new Date(),
        ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request?.headers.get('user-agent') || 'unknown'
      })

      return result
    } catch (error) {
      console.error(`Failed to create ${entityType}:`, error)
      throw new Error(`Failed to create ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generic read operation
  async read(
    entityType: string,
    id?: string,
    filters?: any,
    request?: Request
  ): Promise<any> {
    const user = await this.getCurrentUser()
    
    // Validate permissions
    if (!(await this.validatePermissions('READ', entityType, id))) {
      throw new Error('Insufficient permissions to read ' + entityType)
    }

    try {
      let result: any

      // Perform read operation based on entity type
      switch (entityType.toLowerCase()) {
        case 'portfolio':
          if (id) {
            result = await prisma.portfolio.findUnique({
              where: { id },
              include: {
                kpis: true,
                companies: true
              }
            })
          } else {
            result = await prisma.portfolio.findMany({
              where: {
                ...filters,
                isActive: true
              },
              include: {
                kpis: true,
                companies: true
              },
              orderBy: { createdAt: 'desc' }
            })
          }
          break
        case 'company':
          if (id) {
            result = await prisma.company.findUnique({
              where: { id },
              include: {
                kpis: true,
                portfolios: true
              }
            })
          } else {
            result = await prisma.company.findMany({
              where: {
                ...filters,
                isActive: true
              },
              include: {
                kpis: true,
                portfolios: true
              },
              orderBy: { createdAt: 'desc' }
            })
          }
          break
        case 'kpi':
          if (id) {
            result = await prisma.kPI.findUnique({
              where: { id },
              include: {
                portfolio: true,
                company: true
              }
            })
          } else {
            result = await prisma.kPI.findMany({
              where: {
                ...filters,
                isActive: true
              },
              include: {
                portfolio: true,
                company: true
              },
              orderBy: { createdAt: 'desc' }
            })
          }
          break
        default:
          throw new Error(`Unsupported entity type: ${entityType}`)
      }

      // Log audit for single entity reads
      if (id && result) {
        await this.logAudit({
          action: 'READ',
          entityType,
          entityId: id,
          userId: user.id!,
          userEmail: user.email!,
          timestamp: new Date(),
          ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request?.headers.get('user-agent') || 'unknown'
        })
      }

      return result
    } catch (error) {
      console.error(`Failed to read ${entityType}:`, error)
      throw new Error(`Failed to read ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generic update operation
  async update<T>(
    entityType: string,
    id: string,
    data: any,
    schema: z.ZodSchema<T>,
    request?: Request
  ): Promise<T> {
    const user = await this.getCurrentUser()
    
    // Validate permissions
    if (!(await this.validatePermissions('UPDATE', entityType, id))) {
      throw new Error('Insufficient permissions to update ' + entityType)
    }

    // Validate data
    const validatedData = schema.partial().parse(data)

    try {
      // Get current data for audit trail
      const currentData = await this.read(entityType, id)
      if (!currentData) {
        throw new Error(`${entityType} with id ${id} not found`)
      }

      // Add user context to data
      const dataWithUser = {
        ...validatedData,
        updatedBy: user.id,
        updatedAt: new Date()
      }

      let result: any

      // Perform update operation based on entity type
      switch (entityType.toLowerCase()) {
        case 'portfolio':
          result = await prisma.portfolio.update({
            where: { id },
            data: dataWithUser,
            include: {
              kpis: true,
              companies: true
            }
          })
          break
        case 'company':
          result = await prisma.company.update({
            where: { id },
            data: dataWithUser,
            include: {
              kpis: true,
              portfolios: true
            }
          })
          break
        case 'kpi':
          result = await prisma.kPI.update({
            where: { id },
            data: dataWithUser,
            include: {
              portfolio: true,
              company: true
            }
          })
          break
        default:
          throw new Error(`Unsupported entity type: ${entityType}`)
      }

      // Log audit with changes
      await this.logAudit({
        action: 'UPDATE',
        entityType,
        entityId: id,
        userId: user.id!,
        userEmail: user.email!,
        changes: {
          before: currentData,
          after: validatedData
        },
        timestamp: new Date(),
        ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request?.headers.get('user-agent') || 'unknown'
      })

      return result
    } catch (error) {
      console.error(`Failed to update ${entityType}:`, error)
      throw new Error(`Failed to update ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generic delete operation (soft delete)
  async delete(
    entityType: string,
    id: string,
    hardDelete: boolean = false,
    request?: Request
  ): Promise<boolean> {
    const user = await this.getCurrentUser()
    
    // Validate permissions
    if (!(await this.validatePermissions('DELETE', entityType, id))) {
      throw new Error('Insufficient permissions to delete ' + entityType)
    }

    try {
      // Get current data for audit trail
      const currentData = await this.read(entityType, id)
      if (!currentData) {
        throw new Error(`${entityType} with id ${id} not found`)
      }

      let result: any

      if (hardDelete) {
        // Perform hard delete
        switch (entityType.toLowerCase()) {
          case 'portfolio':
            result = await prisma.portfolio.delete({ where: { id } })
            break
          case 'company':
            result = await prisma.company.delete({ where: { id } })
            break
          case 'kpi':
            result = await prisma.kPI.delete({ where: { id } })
            break
          default:
            throw new Error(`Unsupported entity type: ${entityType}`)
        }
      } else {
        // Perform soft delete
        const dataWithUser = {
          isActive: false,
          deletedBy: user.id,
          deletedAt: new Date(),
          updatedBy: user.id,
          updatedAt: new Date()
        }

        switch (entityType.toLowerCase()) {
          case 'portfolio':
            result = await prisma.portfolio.update({
              where: { id },
              data: dataWithUser
            })
            break
          case 'company':
            result = await prisma.company.update({
              where: { id },
              data: dataWithUser
            })
            break
          case 'kpi':
            result = await prisma.kPI.update({
              where: { id },
              data: dataWithUser
            })
            break
          default:
            throw new Error(`Unsupported entity type: ${entityType}`)
        }
      }

      // Log audit
      await this.logAudit({
        action: 'DELETE',
        entityType,
        entityId: id,
        userId: user.id!,
        userEmail: user.email!,
        changes: {
          deleted: currentData,
          hardDelete
        },
        timestamp: new Date(),
        ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request?.headers.get('user-agent') || 'unknown'
      })

      return true
    } catch (error) {
      console.error(`Failed to delete ${entityType}:`, error)
      throw new Error(`Failed to delete ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Bulk operations
  async bulkCreate<T>(
    entityType: string,
    dataArray: any[],
    schema: z.ZodSchema<T>,
    request?: Request
  ): Promise<T[]> {
    const results: T[] = []
    
    for (const data of dataArray) {
      try {
        const result = await this.create(entityType, data, schema, request)
        results.push(result)
      } catch (error) {
        console.error(`Failed to create ${entityType} in bulk:`, error)
        // Continue with other items
      }
    }
    
    return results
  }

  async bulkUpdate<T>(
    entityType: string,
    updates: Array<{ id: string; data: any }>,
    schema: z.ZodSchema<T>,
    request?: Request
  ): Promise<T[]> {
    const results: T[] = []
    
    for (const update of updates) {
      try {
        const result = await this.update(entityType, update.id, update.data, schema, request)
        results.push(result)
      } catch (error) {
        console.error(`Failed to update ${entityType} in bulk:`, error)
        // Continue with other items
      }
    }
    
    return results
  }

  async bulkDelete(
    entityType: string,
    ids: string[],
    hardDelete: boolean = false,
    request?: Request
  ): Promise<boolean[]> {
    const results: boolean[] = []
    
    for (const id of ids) {
      try {
        const result = await this.delete(entityType, id, hardDelete, request)
        results.push(result)
      } catch (error) {
        console.error(`Failed to delete ${entityType} in bulk:`, error)
        results.push(false)
      }
    }
    
    return results
  }

  // Data backup before deletion
  async backupBeforeDelete(entityType: string, id: string): Promise<any> {
    try {
      const data = await this.read(entityType, id)
      
      // Store backup in a separate table or file
      await prisma.dataBackup.create({
        data: {
          entityType,
          entityId: id,
          backupData: JSON.stringify(data),
          createdAt: new Date()
        }
      }).catch(() => {
        // Fallback to console logging if backup table doesn't exist
        console.log('Data Backup:', { entityType, id, data })
      })
      
      return data
    } catch (error) {
      console.error('Failed to backup data:', error)
      throw error
    }
  }

  // Restore from backup
  async restoreFromBackup(entityType: string, entityId: string): Promise<any> {
    try {
      const backup = await prisma.dataBackup.findFirst({
        where: {
          entityType,
          entityId
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!backup) {
        throw new Error('No backup found for this entity')
      }

      const backupData = JSON.parse(backup.backupData)
      
      // Restore the data (this would need to be implemented based on requirements)
      return backupData
    } catch (error) {
      console.error('Failed to restore from backup:', error)
      throw error
    }
  }
}

// Export singleton instance
export const crudService = CRUDService.getInstance()

// Export schemas for use in API routes
export { portfolioSchema, companySchema, kpiSchema }
