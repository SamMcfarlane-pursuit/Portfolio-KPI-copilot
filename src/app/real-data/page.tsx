import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { WorkshopHeader } from '@/components/navigation/WorkshopHeader'
import { UnifiedSystemStatus } from '@/components/system/UnifiedSystemStatus'
import { DataTabs } from '@/components/data/DataTabs'
import { Database } from 'lucide-react'

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic'

// Real Data Portfolio Dashboard
export default async function RealDataPage() {
  let portfolios: any[] = []
  let totalKPIs = 0
  let latestKPIs: any[] = []

  try {
    // Fetch real portfolio data
    portfolios = await prisma.portfolio.findMany({
      include: {
        fund: {
          include: {
            organization: true
          }
        },
        kpis: {
          orderBy: { period: 'desc' },
          take: 12
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate real metrics
    totalKPIs = await prisma.kPI.count()

    // Get latest KPIs by category
    latestKPIs = await prisma.kPI.findMany({
      orderBy: { period: 'desc' },
      take: 20,
      include: {
        portfolio: true
      }
    })
  } catch (error) {
    console.log('Database not initialized yet, using empty data')
  }

  const totalInvestment = portfolios.reduce((sum, p) => sum + (p.investment || 0), 0)

  // Calculate portfolio performance
  const portfolioPerformance = portfolios.map((portfolio: any) => {
    const kpis = portfolio.kpis || []
    const revenueKPIs = kpis
      .filter((kpi: any) => kpi.category === 'revenue')
      .sort((a: any, b: any) => new Date(b.period).getTime() - new Date(a.period).getTime())

    const operationalKPIs = kpis.filter((kpi: any) => kpi.category === 'operational')
    const customerKPIs = kpis.filter((kpi: any) => kpi.category === 'customers')
    const profitabilityKPIs = kpis.filter((kpi: any) => kpi.category === 'profitability')

    // Calculate growth rate
    let growthRate = 0
    if (revenueKPIs.length >= 2) {
      const latest = revenueKPIs[0].value
      const previous = revenueKPIs[1].value
      growthRate = ((latest - previous) / previous) * 100
    }

    // Calculate health score based on real metrics
    let healthScore = 50
    if (growthRate > 20) healthScore += 30
    else if (growthRate > 10) healthScore += 20
    else if (growthRate > 0) healthScore += 10
    else if (growthRate < -10) healthScore -= 20

    if (profitabilityKPIs.length > 0) {
      const avgMargin = profitabilityKPIs.reduce((sum: number, kpi: any) => sum + kpi.value, 0) / profitabilityKPIs.length
      if (avgMargin > 20) healthScore += 20
      else if (avgMargin > 10) healthScore += 10
      else if (avgMargin < 0) healthScore -= 15
    }

    healthScore = Math.max(0, Math.min(100, healthScore))

    return {
      ...portfolio,
      latestRevenue: revenueKPIs[0]?.value || 0,
      growthRate,
      healthScore,
      customerCount: customerKPIs.reduce((sum: number, kpi: any) => sum + kpi.value, 0),
      operationalMetrics: operationalKPIs.length
    }
  })

  // Get metadata from latest KPI for market context
  const marketContext = portfolios[0]?.kpis?.[0]?.metadata ?
    JSON.parse(portfolios[0].kpis[0].metadata) : {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Enhanced Workshop Header */}
      <WorkshopHeader
        title="Portfolio Data & Management"
        subtitle="Live data explorer and entry system"
        icon={<Database className="w-6 h-6 text-white" />}
        status="🔴 Live Data"
        statusColor="blue"
        showNavigation={true}
      />

      <div className="container mx-auto px-4 py-8">
        {/* System Status */}
        <div className="mb-6">
          <UnifiedSystemStatus variant="compact" />
        </div>

        {/* Data Management Tabs */}
        <DataTabs
          portfolios={portfolios}
          totalInvestment={totalInvestment}
          totalKPIs={totalKPIs}
          latestKPIs={latestKPIs}
          portfolioPerformance={portfolioPerformance}
        />
      </div>
    </div>
  )
}


