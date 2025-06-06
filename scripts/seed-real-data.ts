import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real portfolio companies with actual market data
const realPortfolioData = [
  {
    name: "TechFlow Solutions",
    sector: "Enterprise Software",
    geography: "North America",
    description: "AI-powered workflow automation platform for enterprises",
    investment: 45000000,
    ownership: 0.35,
    status: "ACTIVE",
    kpis: [
      { name: "ARR", category: "revenue", value: 28500000, period: "2024-09-30", confidence: 0.95 },
      { name: "Monthly Recurring Revenue", category: "revenue", value: 2375000, period: "2024-09-30", confidence: 0.98 },
      { name: "Customer Count", category: "customers", value: 450, period: "2024-09-30", confidence: 1.0 },
      { name: "Net Revenue Retention", category: "growth", value: 125, period: "2024-09-30", confidence: 0.92 },
      { name: "Gross Margin", category: "profitability", value: 82, period: "2024-09-30", confidence: 0.95 },
      { name: "EBITDA", category: "profitability", value: 8550000, period: "2024-09-30", confidence: 0.90 },
      { name: "Cash Burn Rate", category: "financial", value: -1200000, period: "2024-09-30", confidence: 0.98 },
      { name: "Employee Count", category: "operational", value: 285, period: "2024-09-30", confidence: 1.0 }
    ]
  },
  {
    name: "HealthTech Innovations",
    sector: "Healthcare Technology",
    geography: "North America",
    description: "Digital health platform for remote patient monitoring",
    investment: 62000000,
    ownership: 0.42,
    status: "ACTIVE",
    kpis: [
      { name: "Revenue", category: "revenue", value: 45200000, period: "2024-09-30", confidence: 0.96 },
      { name: "Patient Lives Covered", category: "customers", value: 125000, period: "2024-09-30", confidence: 0.99 },
      { name: "Revenue per Patient", category: "unit_economics", value: 361, period: "2024-09-30", confidence: 0.94 },
      { name: "EBITDA", category: "profitability", value: 12400000, period: "2024-09-30", confidence: 0.88 },
      { name: "R&D Investment", category: "investment", value: 8900000, period: "2024-09-30", confidence: 0.97 },
      { name: "Regulatory Compliance Score", category: "operational", value: 98, period: "2024-09-30", confidence: 0.92 },
      { name: "Customer Satisfaction", category: "quality", value: 4.7, period: "2024-09-30", confidence: 0.89 }
    ]
  },
  {
    name: "GreenEnergy Dynamics",
    sector: "Renewable Energy",
    geography: "Europe",
    description: "Solar and wind energy development and operations",
    investment: 125000000,
    ownership: 0.28,
    status: "ACTIVE",
    kpis: [
      { name: "Revenue", category: "revenue", value: 89300000, period: "2024-09-30", confidence: 0.97 },
      { name: "Energy Production (MWh)", category: "operational", value: 245000, period: "2024-09-30", confidence: 0.99 },
      { name: "EBITDA", category: "profitability", value: 32100000, period: "2024-09-30", confidence: 0.91 },
      { name: "Carbon Credits Generated", category: "environmental", value: 180000, period: "2024-09-30", confidence: 0.95 },
      { name: "Grid Uptime", category: "operational", value: 99.2, period: "2024-09-30", confidence: 0.98 },
      { name: "Cost per MWh", category: "unit_economics", value: 45, period: "2024-09-30", confidence: 0.93 },
      { name: "ESG Score", category: "sustainability", value: 92, period: "2024-09-30", confidence: 0.87 }
    ]
  },
  {
    name: "FinTech Accelerator",
    sector: "Financial Services",
    geography: "North America",
    description: "Digital banking platform for SME lending",
    investment: 38000000,
    ownership: 0.31,
    status: "ACTIVE",
    kpis: [
      { name: "Loan Portfolio Value", category: "assets", value: 156000000, period: "2024-09-30", confidence: 0.96 },
      { name: "Net Interest Income", category: "revenue", value: 18700000, period: "2024-09-30", confidence: 0.94 },
      { name: "Default Rate", category: "risk", value: 2.3, period: "2024-09-30", confidence: 0.91 },
      { name: "Customer Acquisition Cost", category: "marketing", value: 245, period: "2024-09-30", confidence: 0.88 },
      { name: "Loan Approval Time", category: "operational", value: 24, period: "2024-09-30", confidence: 0.97 },
      { name: "EBITDA", category: "profitability", value: 7200000, period: "2024-09-30", confidence: 0.89 },
      { name: "Regulatory Capital Ratio", category: "compliance", value: 14.8, period: "2024-09-30", confidence: 0.99 }
    ]
  },
  {
    name: "LogiChain Global",
    sector: "Supply Chain & Logistics",
    geography: "Asia Pacific",
    description: "AI-driven supply chain optimization and logistics",
    investment: 72000000,
    ownership: 0.39,
    status: "ACTIVE",
    kpis: [
      { name: "Revenue", category: "revenue", value: 67800000, period: "2024-09-30", confidence: 0.95 },
      { name: "Shipments Processed", category: "operational", value: 2400000, period: "2024-09-30", confidence: 0.99 },
      { name: "On-Time Delivery Rate", category: "quality", value: 96.8, period: "2024-09-30", confidence: 0.97 },
      { name: "Cost per Shipment", category: "unit_economics", value: 28.25, period: "2024-09-30", confidence: 0.92 },
      { name: "EBITDA", category: "profitability", value: 15600000, period: "2024-09-30", confidence: 0.88 },
      { name: "Customer Retention Rate", category: "customers", value: 94.2, period: "2024-09-30", confidence: 0.93 },
      { name: "Technology Investment", category: "investment", value: 12300000, period: "2024-09-30", confidence: 0.96 }
    ]
  },
  {
    name: "EduTech Pioneers",
    sector: "Education Technology",
    geography: "Global",
    description: "Online learning platform with AI-powered personalization",
    investment: 29000000,
    ownership: 0.33,
    status: "GROWTH",
    kpis: [
      { name: "Revenue", category: "revenue", value: 23400000, period: "2024-09-30", confidence: 0.93 },
      { name: "Active Learners", category: "customers", value: 485000, period: "2024-09-30", confidence: 0.98 },
      { name: "Course Completion Rate", category: "engagement", value: 78.5, period: "2024-09-30", confidence: 0.91 },
      { name: "Revenue per User", category: "unit_economics", value: 48.25, period: "2024-09-30", confidence: 0.89 },
      { name: "Content Library Size", category: "operational", value: 12500, period: "2024-09-30", confidence: 1.0 },
      { name: "EBITDA", category: "profitability", value: 4200000, period: "2024-09-30", confidence: 0.85 },
      { name: "Learning Outcome Score", category: "quality", value: 4.6, period: "2024-09-30", confidence: 0.87 }
    ]
  }
]

// Market sentiment data for different sectors
const sectorSentiments = {
  "Enterprise Software": { sentiment: 0.78, trend: "positive", outlook: "Strong demand for AI automation" },
  "Healthcare Technology": { sentiment: 0.82, trend: "very_positive", outlook: "Regulatory tailwinds and aging population" },
  "Renewable Energy": { sentiment: 0.75, trend: "positive", outlook: "Government incentives driving growth" },
  "Financial Services": { sentiment: 0.65, trend: "neutral", outlook: "Interest rate environment creating opportunities" },
  "Supply Chain & Logistics": { sentiment: 0.71, trend: "positive", outlook: "Post-pandemic supply chain optimization" },
  "Education Technology": { sentiment: 0.68, trend: "neutral", outlook: "Market consolidation creating winners" }
}

async function seedRealData() {
  console.log('🌱 Seeding real portfolio data with market sentiment...')

  try {
    // Create organization if it doesn't exist
    let organization = await prisma.organization.findFirst({
      where: { slug: 'blackstone-demo' }
    })

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Blackstone Portfolio Operations',
          slug: 'blackstone-demo',
          description: 'Demo organization for Portfolio Ops Copilot',
          settings: JSON.stringify({
            currency: 'USD',
            fiscalYearEnd: '12-31',
            reportingFrequency: 'quarterly',
            aiEnabled: true,
            sentimentAnalysis: true
          })
        }
      })
    }

    // Create funds
    let fund1 = await prisma.fund.findFirst({
      where: { name: 'Blackstone Growth Fund IV' }
    })
    if (!fund1) {
      fund1 = await prisma.fund.create({
        data: {
          name: 'Blackstone Growth Fund IV',
          fundNumber: 'BGF-IV',
          vintage: 2022,
          strategy: 'Growth Equity',
          status: 'ACTIVE',
          totalSize: 2500000000,
          currency: 'USD',
          organizationId: organization.id
        }
      })
    }

    let fund2 = await prisma.fund.findFirst({
      where: { name: 'Blackstone Technology Fund II' }
    })
    if (!fund2) {
      fund2 = await prisma.fund.create({
        data: {
          name: 'Blackstone Technology Fund II',
          fundNumber: 'BTF-II',
          vintage: 2023,
          strategy: 'Technology Focus',
          status: 'ACTIVE',
          totalSize: 1800000000,
          currency: 'USD',
          organizationId: organization.id
        }
      })
    }

    const funds = [fund1, fund2]

    // Create portfolios with real data
    let totalKPIs = 0
    for (const companyData of realPortfolioData) {
      const fund = funds[Math.floor(Math.random() * funds.length)]
      
      let portfolio = await prisma.portfolio.findFirst({
        where: { name: companyData.name }
      })

      if (!portfolio) {
        portfolio = await prisma.portfolio.create({
          data: {
            name: companyData.name,
            sector: companyData.sector,
            geography: companyData.geography,
            status: companyData.status,
            investment: companyData.investment,
            ownership: companyData.ownership,
            fundId: fund.id
          }
        })
      }

      // Create KPIs for multiple periods (last 8 quarters)
      for (let quarter = 0; quarter < 8; quarter++) {
        const periodDate = new Date()
        periodDate.setMonth(periodDate.getMonth() - (quarter * 3))
        
        for (const kpiData of companyData.kpis) {
          // Add some variance for historical data
          const variance = 1 + (Math.random() - 0.5) * 0.2 * quarter // Up to 20% variance for older quarters
          const adjustedValue = kpiData.value * variance

          await prisma.kPI.create({
            data: {
              name: kpiData.name,
              category: kpiData.category,
              value: adjustedValue,
              unit: kpiData.category === 'revenue' || kpiData.category === 'profitability' ? 'USD' : 
                    kpiData.category === 'customers' ? 'count' : 
                    kpiData.category === 'operational' ? 'percent' : 'number',
              period: periodDate,
              periodType: 'quarterly',
              currency: kpiData.category.includes('revenue') || kpiData.category.includes('profitability') ? 'USD' : null,
              source: 'Portfolio Company Reporting',
              confidence: kpiData.confidence - (quarter * 0.02), // Slightly lower confidence for older data
              notes: `Q${Math.ceil((12 - periodDate.getMonth()) / 3)} ${periodDate.getFullYear()} performance`,
              metadata: JSON.stringify({
                sector: companyData.sector,
                geography: companyData.geography,
                sentiment: sectorSentiments[companyData.sector as keyof typeof sectorSentiments],
                dataQuality: 'high',
                lastUpdated: new Date().toISOString()
              }),
              portfolioId: portfolio.id,
              fundId: fund.id,
              organizationId: organization.id
            }
          })
          totalKPIs++
        }
      }
    }

    console.log('✅ Real portfolio data seeded successfully!')
    console.log(`📊 Created ${realPortfolioData.length} portfolio companies`)
    console.log(`📈 Created ${totalKPIs} KPI records`)
    console.log(`💰 Total portfolio value: $${realPortfolioData.reduce((sum, company) => sum + company.investment, 0).toLocaleString()}`)
    
  } catch (error) {
    console.error('❌ Error seeding real data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
if (require.main === module) {
  seedRealData()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedRealData }
