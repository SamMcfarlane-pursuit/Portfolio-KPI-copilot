import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with portfolio data...')

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'blackstone-demo' },
    update: {},
    create: {
      name: 'Blackstone Demo',
      slug: 'blackstone-demo',
      description: 'Demo organization for Portfolio Ops Copilot',
      isActive: true,
    },
  })

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@blackstone.com' },
    update: {},
    create: {
      email: 'demo@blackstone.com',
      name: 'Demo User',
      role: 'ADMIN',
      isActive: true,
    },
  })

  // Link user to organization
  await prisma.organizationUser.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'ADMIN',
    },
  })

  // Create funds
  const funds = []

  const fundData = [
    {
      name: 'Blackstone Capital Partners VIII',
      fundNumber: 'BCP VIII',
      vintage: 2022,
      strategy: 'Buyout',
      status: 'ACTIVE',
      totalSize: 30000000000, // $30B
      currency: 'USD',
    },
    {
      name: 'Blackstone Real Estate Partners X',
      fundNumber: 'BREP X',
      vintage: 2021,
      strategy: 'Real Estate',
      status: 'ACTIVE',
      totalSize: 18500000000, // $18.5B
      currency: 'USD',
    },
    {
      name: 'Blackstone Growth Equity IV',
      fundNumber: 'BGE IV',
      vintage: 2023,
      strategy: 'Growth',
      status: 'ACTIVE',
      totalSize: 4200000000, // $4.2B
      currency: 'USD',
    },
  ]

  for (const fund of fundData) {
    const existingFund = await prisma.fund.findFirst({
      where: { name: fund.name, organizationId: org.id },
    })

    if (!existingFund) {
      const newFund = await prisma.fund.create({
        data: {
          ...fund,
          organizationId: org.id,
        },
      })
      funds.push(newFund)
    } else {
      funds.push(existingFund)
    }
  }

  // Create portfolio companies
  const portfolios = []

  const portfolioData = [
    // BCP VIII Portfolio Companies
    {
      name: 'TechCorp Solutions',
      sector: 'Technology',
      geography: 'North America',
      status: 'ACTIVE',
      investment: 850000000, // $850M
      ownership: 0.65, // 65%
      fundId: funds[0].id,
    },
    {
      name: 'HealthVentures Inc',
      sector: 'Healthcare',
      geography: 'North America',
      status: 'ACTIVE',
      investment: 1200000000, // $1.2B
      ownership: 0.72, // 72%
      fundId: funds[0].id,
    },
    {
      name: 'Global Manufacturing Co',
      sector: 'Industrials',
      geography: 'Europe',
      status: 'ACTIVE',
      investment: 950000000, // $950M
      ownership: 0.58, // 58%
      fundId: funds[0].id,
    },
    // BREP X Portfolio Companies
    {
      name: 'Prime Office REIT',
      sector: 'Real Estate',
      geography: 'North America',
      status: 'ACTIVE',
      investment: 2100000000, // $2.1B
      ownership: 0.85, // 85%
      fundId: funds[1].id,
    },
    {
      name: 'European Logistics Portfolio',
      sector: 'Real Estate',
      geography: 'Europe',
      status: 'ACTIVE',
      investment: 1800000000, // $1.8B
      ownership: 0.78, // 78%
      fundId: funds[1].id,
    },
    // BGE IV Portfolio Companies
    {
      name: 'DataDriven Analytics',
      sector: 'Technology',
      geography: 'North America',
      status: 'ACTIVE',
      investment: 320000000, // $320M
      ownership: 0.45, // 45%
      fundId: funds[2].id,
    },
  ]

  for (const portfolio of portfolioData) {
    const existingPortfolio = await prisma.portfolio.findFirst({
      where: { name: portfolio.name, fundId: portfolio.fundId },
    })

    if (!existingPortfolio) {
      const newPortfolio = await prisma.portfolio.create({
        data: portfolio,
      })
      portfolios.push(newPortfolio)
    } else {
      portfolios.push(existingPortfolio)
    }
  }

  console.log('📊 Creating KPI data...')

  // Generate KPI data for the last 8 quarters
  const quarters = [
    { period: '2022-03-31', label: 'Q1 2022' },
    { period: '2022-06-30', label: 'Q2 2022' },
    { period: '2022-09-30', label: 'Q3 2022' },
    { period: '2022-12-31', label: 'Q4 2022' },
    { period: '2023-03-31', label: 'Q1 2023' },
    { period: '2023-06-30', label: 'Q2 2023' },
    { period: '2023-09-30', label: 'Q3 2023' },
    { period: '2023-12-31', label: 'Q4 2023' },
  ]

  // KPI templates with realistic growth patterns
  const kpiTemplates = [
    {
      name: 'IRR',
      category: 'Returns',
      unit: '%',
      baseValue: 15.2,
      growth: 0.3, // 0.3% per quarter
    },
    {
      name: 'MOIC',
      category: 'Returns',
      unit: 'x',
      baseValue: 1.8,
      growth: 0.05, // 0.05x per quarter
    },
    {
      name: 'EBITDA',
      category: 'Financial',
      unit: 'M',
      currency: 'USD',
      baseValue: 45.2,
      growth: 2.1, // $2.1M per quarter
    },
    {
      name: 'Revenue',
      category: 'Financial',
      unit: 'M',
      currency: 'USD',
      baseValue: 156.8,
      growth: 8.3, // $8.3M per quarter
    },
    {
      name: 'EBITDA Margin',
      category: 'Financial',
      unit: '%',
      baseValue: 28.8,
      growth: 0.2, // 0.2% per quarter
    },
  ]

  // Create KPIs for each fund and portfolio
  for (const fund of funds) {
    for (let quarterIndex = 0; quarterIndex < quarters.length; quarterIndex++) {
      const quarter = quarters[quarterIndex]
      for (const template of kpiTemplates) {
        // Fund-level KPIs
        const fundValue = template.baseValue + (template.growth * quarterIndex) + (Math.random() - 0.5) * 2
        
        await prisma.kPI.create({
          data: {
            name: template.name,
            category: template.category,
            value: Math.max(0, fundValue),
            unit: template.unit,
            period: new Date(quarter.period),
            periodType: 'quarterly',
            currency: template.currency,
            source: 'Portfolio Management System',
            confidence: 0.95,
            fundId: fund.id,
            organizationId: org.id,
          },
        })
      }
    }
  }

  // Create portfolio-level KPIs
  for (const portfolio of portfolios) {
    for (let quarterIndex = 0; quarterIndex < quarters.length; quarterIndex++) {
      const quarter = quarters[quarterIndex]
      // Portfolio-specific KPIs
      const portfolioKPIs = [
        {
          name: 'Revenue Growth',
          category: 'Growth',
          unit: '%',
          baseValue: 12.5,
          growth: 0.8,
        },
        {
          name: 'Employee Count',
          category: 'Operations',
          unit: 'count',
          baseValue: 1250,
          growth: 45,
        },
        {
          name: 'Customer Satisfaction',
          category: 'Operations',
          unit: 'score',
          baseValue: 8.2,
          growth: 0.1,
        },
      ]

      for (const template of portfolioKPIs) {
        const portfolioValue = template.baseValue + (template.growth * quarterIndex) + (Math.random() - 0.5) * 1
        
        await prisma.kPI.create({
          data: {
            name: template.name,
            category: template.category,
            value: Math.max(0, portfolioValue),
            unit: template.unit,
            period: new Date(quarter.period),
            periodType: 'quarterly',
            currency: (template as any).currency,
            source: 'Portfolio Company Reporting',
            confidence: 0.88,
            portfolioId: portfolio.id,
            organizationId: org.id,
          },
        })
      }
    }
  }

  console.log('✅ Database seeded successfully!')
  console.log(`📈 Created ${funds.length} funds`)
  console.log(`🏢 Created ${portfolios.length} portfolio companies`)
  console.log(`📊 Created KPIs for ${quarters.length} quarters`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
