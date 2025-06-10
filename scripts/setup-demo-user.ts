#!/usr/bin/env tsx

/**
 * Setup Demo User for Portfolio KPI Copilot
 * Creates a demo user for immediate access to the application
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function setupDemoUser() {
  try {
    console.log('🚀 Setting up demo user for Portfolio KPI Copilot...')

    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'demo@portfolio-kpi.com' }
    })

    if (existingUser) {
      console.log('✅ Demo user already exists')
      return
    }

    // Hash the demo password
    const hashedPassword = await bcrypt.hash('demo123', 12)

    // Create demo user
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo@portfolio-kpi.com',
        name: 'Demo Portfolio Manager',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      }
    })

    console.log('✅ Demo user created successfully:', {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role
    })

    // Create a demo organization
    const demoOrg = await prisma.organization.create({
      data: {
        name: 'Demo Investment Firm',
        slug: 'demo-investment-firm',
        description: 'Demo organization for Portfolio KPI Copilot evaluation',
        settings: JSON.stringify({
          currency: 'USD',
          fiscalYearEnd: '12-31',
          reportingFrequency: 'quarterly',
          aiEnabled: true,
          demoMode: true
        })
      }
    })

    console.log('✅ Demo organization created:', {
      id: demoOrg.id,
      name: demoOrg.name,
      slug: demoOrg.slug
    })

    // Create demo fund first
    const demoFund = await prisma.fund.create({
      data: {
        name: 'Demo Tech Fund I',
        fundNumber: 'DTF-I',
        vintage: 2024,
        strategy: 'Technology Growth',
        status: 'ACTIVE',
        totalSize: 100000000, // $100M fund
        currency: 'USD',
        organizationId: demoOrg.id
      }
    })

    console.log('✅ Demo fund created:', {
      id: demoFund.id,
      name: demoFund.name,
      totalSize: demoFund.totalSize
    })

    // Create demo portfolio
    const demoPortfolio = await prisma.portfolio.create({
      data: {
        name: 'Demo Tech Portfolio',
        sector: 'Technology',
        geography: 'North America',
        status: 'ACTIVE',
        investment: 5000000, // $5M investment
        ownership: 15.0, // 15% ownership
        fundId: demoFund.id
      }
    })

    console.log('✅ Demo portfolio created:', {
      id: demoPortfolio.id,
      name: demoPortfolio.name
    })

    // Create sample KPIs for the portfolio
    const sampleKPIs = [
      {
        name: 'Revenue Growth Rate',
        category: 'financial',
        subcategory: 'growth',
        value: 25.5,
        unit: 'percentage',
        period: new Date('2024-09-30'),
        periodType: 'quarterly',
        currency: 'USD',
        source: 'Portfolio Company Reports',
        confidence: 0.95,
        notes: 'Year-over-year revenue growth',
        organizationId: demoOrg.id,
        fundId: demoFund.id,
        portfolioId: demoPortfolio.id
      },
      {
        name: 'Total Portfolio Value',
        category: 'financial',
        subcategory: 'valuation',
        value: 95000000,
        unit: 'USD',
        period: new Date('2024-09-30'),
        periodType: 'quarterly',
        currency: 'USD',
        source: 'Market Valuation',
        confidence: 0.90,
        notes: 'Current portfolio valuation',
        organizationId: demoOrg.id,
        fundId: demoFund.id,
        portfolioId: demoPortfolio.id
      }
    ]

    for (const kpi of sampleKPIs) {
      const createdKPI = await prisma.kPI.create({ data: kpi })
      console.log(`✅ Demo KPI created: ${createdKPI.name}`)
    }

    console.log('\n🎉 Demo setup completed successfully!')
    console.log('\n📋 Demo Access Credentials:')
    console.log('Email: demo@portfolio-kpi.com')
    console.log('Password: demo123')
    console.log('\n🚀 You can now sign in to the Portfolio KPI Copilot!')

  } catch (error) {
    console.error('❌ Error setting up demo user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the setup
setupDemoUser()
  .then(() => {
    console.log('✅ Demo setup script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Demo setup script failed:', error)
    process.exit(1)
  })
