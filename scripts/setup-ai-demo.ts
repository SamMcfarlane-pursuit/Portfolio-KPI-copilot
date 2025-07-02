/**
 * AI Demo Setup Script
 * Creates sample data for AI copilot testing
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupAIDemo() {
  console.log('🚀 Setting up AI Demo Data...')

  try {
    // Create demo organization
    const organization = await prisma.organization.upsert({
      where: { slug: 'demo-ai-org' },
      update: {},
      create: {
        name: 'AI Demo Organization',
        slug: 'demo-ai-org',
        description: 'Demo organization for AI copilot testing'
      }
    })

    console.log('✅ Organization created:', organization.name)

    // Create demo fund
    let fund = await prisma.fund.findFirst({ where: { name: 'AI Demo Fund', organizationId: organization.id } })
    if (!fund) {
      fund = await prisma.fund.create({
        data: {
          name: 'AI Demo Fund',
          fundNumber: 'AI-2024-001',
          vintage: 2024,
          strategy: 'Growth Equity',
          totalSize: 100000000,
          currency: 'USD',
          organizationId: organization.id
        }
      })
      console.log('✅ Fund created:', fund.name)
    } else {
      console.log('ℹ️ Fund already exists:', fund.name)
    }

    // Create demo portfolio
    let portfolio = await prisma.portfolio.findFirst({ where: { name: 'TechCorp Portfolio', fundId: fund.id } })
    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          name: 'TechCorp Portfolio',
          description: 'Technology portfolio company for AI analysis',
          sector: 'Technology',
          geography: 'North America',
          investment: 25000000,
          ownership: 0.25,
          totalValue: 35000000,
          currency: 'USD',
          fundId: fund.id
        }
      })
      console.log('✅ Portfolio created:', portfolio.name)
    } else {
      console.log('ℹ️ Portfolio already exists:', portfolio.name)
    }

    // Create sample KPIs
    const kpis = [
      {
        name: 'Revenue Growth Rate',
        category: 'financial',
        value: 25.0,
        unit: 'percentage',
        period: new Date('2024-12-01'),
        targetValue: 20.0,
        description: 'Annual revenue growth rate'
      },
      {
        name: 'Profit Margin',
        category: 'financial',
        value: 18.0,
        unit: 'percentage',
        period: new Date('2024-12-01'),
        targetValue: 15.0,
        description: 'Net profit margin'
      },
      {
        name: 'Customer Acquisition Cost',
        category: 'operational',
        value: 150.0,
        unit: 'USD',
        period: new Date('2024-12-01'),
        targetValue: 120.0,
        description: 'Cost to acquire new customer'
      },
      {
        name: 'Customer Lifetime Value',
        category: 'operational',
        value: 2500.0,
        unit: 'USD',
        period: new Date('2024-12-01'),
        targetValue: 2000.0,
        description: 'Average customer lifetime value'
      },
      {
        name: 'Monthly Recurring Revenue',
        category: 'financial',
        value: 2500000.0,
        unit: 'USD',
        period: new Date('2024-12-01'),
        targetValue: 2000000.0,
        description: 'Monthly recurring revenue'
      },
      {
        name: 'Employee Satisfaction',
        category: 'operational',
        value: 85.0,
        unit: 'score',
        period: new Date('2024-12-01'),
        targetValue: 80.0,
        description: 'Employee satisfaction score'
      }
    ]

    for (const kpiData of kpis) {
      await prisma.kPI.create({
        data: {
          ...kpiData,
          portfolioId: portfolio.id,
          organizationId: organization.id,
          confidence: 90
        }
      })
    }

    console.log('✅ KPIs created:', kpis.length, 'metrics')

    // Create demo user
    const user = await prisma.user.upsert({
      where: { email: 'demo@ai-copilot.com' },
      update: {},
      create: {
        name: 'AI Demo User',
        email: 'demo@ai-copilot.com',
        role: 'ANALYST',
        department: 'Portfolio Operations',
        title: 'Senior Analyst'
      }
    })

    console.log('✅ Demo user created:', user.name)

    // Link user to organization
    await prisma.organizationUser.upsert({
      where: {
        id: `${user.id}_${organization.id}`
      },
      update: {},
      create: {
        userId: user.id,
        organizationId: organization.id,
        role: 'ANALYST'
      }
    })

    console.log('✅ User linked to organization')

    console.log('\n🎉 AI Demo Setup Complete!')
    console.log('\n📊 Sample Data Created:')
    console.log(`   Organization: ${organization.name}`)
    console.log(`   Fund: ${fund.name} ($${(fund.totalSize || 0) / 1000000}M)`)
    console.log(`   Portfolio: ${portfolio.name} ($${(portfolio.totalValue || 0) / 1000000}M)`)
    console.log(`   KPIs: ${kpis.length} metrics`)
    console.log(`   User: ${user.name} (${user.email})`)
    
    console.log('\n🔗 Test URLs:')
    console.log(`   AI Copilot: http://localhost:3000/api/public/ai-copilot`)
    console.log(`   Dashboard: http://localhost:3000/dashboard`)
    console.log(`   Portfolio: http://localhost:3000/portfolio`)

  } catch (error) {
    console.error('❌ Setup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run setup with top-level await for ESM compatibility
await setupAIDemo() 