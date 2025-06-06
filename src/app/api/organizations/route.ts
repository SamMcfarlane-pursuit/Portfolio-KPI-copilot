import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { seedRealMarketData } from '@/lib/data/real-market-data'

// GET - Fetch all organizations with basic information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    const isActive = searchParams.get('isActive')

    const where: any = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    // Get basic organizations first
    const organizations = await prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Enhanced organizations with basic stats
    const enhancedOrganizations = await Promise.all(
      organizations.map(async (org) => {
        const settings = org.settings ? JSON.parse(org.settings) : {}

        // Get basic counts if stats are requested
        let statistics = undefined
        if (includeStats) {
          try {
            const fundCount = await prisma.fund.count({ where: { organizationId: org.id } })
            const portfolioCount = await prisma.portfolio.count({
              where: { fund: { organizationId: org.id } }
            })
            const kpiCount = await prisma.kPI.count({
              where: { organizationId: org.id }
            })

            statistics = {
              totalFunds: fundCount,
              totalPortfolios: portfolioCount,
              totalKPIs: kpiCount,
              lastActivity: org.updatedAt
            }
          } catch (e) {
            console.warn('Failed to get stats for org:', org.id, e)
            statistics = {
              totalFunds: 0,
              totalPortfolios: 0,
              totalKPIs: 0,
              lastActivity: org.updatedAt
            }
          }
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          isActive: org.isActive,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
          settings,
          statistics
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enhancedOrganizations,
      count: enhancedOrganizations.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch organizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create new organization with optional data seeding
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      slug, 
      description, 
      settings = {}, 
      seedRealData = false,
      currency = 'USD',
      fiscalYearEnd = '12-31'
    } = body

    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this slug already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        description,
        settings: JSON.stringify({
          currency,
          fiscalYearEnd,
          reportingFrequency: 'quarterly',
          aiEnabled: true,
          realMarketData: seedRealData,
          ...settings,
          createdAt: new Date().toISOString()
        })
      }
    })

    let seedingResult = null

    // Seed real market data if requested
    if (seedRealData) {
      try {
        console.log(`🌱 Seeding real market data for ${name}...`)
        seedingResult = await seedRealMarketData({
          name,
          slug,
          description,
          currency,
          fiscalYearEnd
        })
        console.log(`✅ Successfully seeded data for ${name}`)
      } catch (seedError) {
        console.error(`❌ Error seeding data for ${name}:`, seedError)
        // Don't fail the organization creation if seeding fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization,
        seedingResult
      },
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update organization
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, settings, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive
    if (settings !== undefined) {
      // Merge with existing settings
      const existingOrg = await prisma.organization.findUnique({
        where: { id }
      })
      
      if (existingOrg) {
        const existingSettings = existingOrg.settings ? JSON.parse(existingOrg.settings) : {}
        updateData.settings = JSON.stringify({
          ...existingSettings,
          ...settings,
          lastUpdated: new Date().toISOString()
        })
      }
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: updateData,
      include: {
        funds: {
          include: {
            portfolios: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      data: updatedOrganization,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Deactivate organization (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const hardDelete = searchParams.get('hardDelete') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    if (hardDelete) {
      // Hard delete (use with caution)
      await prisma.organization.delete({
        where: { id }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Organization permanently deleted',
        timestamp: new Date().toISOString()
      })
    } else {
      // Soft delete (deactivate)
      const deactivatedOrganization = await prisma.organization.update({
        where: { id },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Organization deactivated',
        data: deactivatedOrganization,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
