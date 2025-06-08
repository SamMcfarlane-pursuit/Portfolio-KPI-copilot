import { NextRequest, NextResponse } from 'next/server'
import { businessMetrics } from '@/lib/business/metrics'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get comprehensive business impact report
    const impactReport = businessMetrics.getBusinessImpactReport()
    const currentMetrics = businessMetrics.getCurrentMetrics()

    // Calculate additional business insights
    const businessInsights = {
      // Core Value Proposition Validation
      valuePropositionMetrics: {
        speedImprovement: {
          current: `${(216000 / Math.max(currentMetrics.timeToInsight, 1)).toFixed(1)}x faster`,
          target: "10x faster",
          status: currentMetrics.timeToInsight > 0 && (216000 / currentMetrics.timeToInsight) >= 10 ? "achieved" : "in_progress"
        },
        workReduction: {
          current: `${currentMetrics.manualWorkReduction.toFixed(1)}%`,
          target: "70%",
          status: currentMetrics.manualWorkReduction >= 70 ? "achieved" : "in_progress"
        },
        accuracy: {
          current: `${currentMetrics.dataAccuracy}%`,
          target: "95%+",
          status: currentMetrics.dataAccuracy >= 95 ? "achieved" : "in_progress"
        }
      },

      // Target Audience Engagement
      targetAudienceMetrics: {
        privateEquity: {
          description: "Portfolio managers tracking 10-50 companies",
          currentPortfolios: currentMetrics.portfolioCount,
          targetRange: "10-50",
          engagement: currentMetrics.portfolioCount >= 10 ? "active" : "growing"
        },
        ventureCapital: {
          description: "Partners monitoring startup metrics",
          currentKPIs: currentMetrics.kpiCount,
          averagePerPortfolio: currentMetrics.portfolioCount > 0 
            ? (currentMetrics.kpiCount / currentMetrics.portfolioCount).toFixed(1) 
            : "0",
          engagement: currentMetrics.kpiCount >= 50 ? "active" : "growing"
        },
        familyOffices: {
          description: "Investment managers overseeing diverse portfolios",
          userAdoption: `${currentMetrics.userAdoption.toFixed(1)}%`,
          target: "80%+",
          status: currentMetrics.userAdoption >= 80 ? "achieved" : "in_progress"
        }
      },

      // Business ROI Calculations
      roiAnalysis: {
        timeValue: {
          hoursSavedPerMonth: currentMetrics.timesSaved,
          costSavingsPerMonth: currentMetrics.costReduction,
          annualSavings: currentMetrics.costReduction * 12,
          roiMultiplier: `${currentMetrics.roiMultiplier.toFixed(1)}x`
        },
        efficiency: {
          portfoliosPerUser: currentMetrics.activeUsers > 0 
            ? (currentMetrics.portfolioCount / currentMetrics.activeUsers).toFixed(1) 
            : "0",
          kpisPerUser: currentMetrics.activeUsers > 0 
            ? (currentMetrics.kpiCount / currentMetrics.activeUsers).toFixed(1) 
            : "0",
          queriesPerUser: currentMetrics.activeUsers > 0 
            ? (currentMetrics.queriesProcessed / currentMetrics.activeUsers).toFixed(1) 
            : "0"
        }
      },

      // Competitive Advantages
      competitiveAdvantages: [
        {
          advantage: "Speed",
          traditional: "2-3 days for KPI analysis",
          ourSolution: `${currentMetrics.timeToInsight}s real-time insights`,
          improvement: `${(216000 / Math.max(currentMetrics.timeToInsight, 1)).toFixed(1)}x faster`
        },
        {
          advantage: "AI-Powered Intelligence", 
          traditional: "Manual data analysis",
          ourSolution: "Automated pattern recognition",
          improvement: `${currentMetrics.aiAccuracy}% accuracy`
        },
        {
          advantage: "Cost Efficiency",
          traditional: "Multiple analytics tools + consultants",
          ourSolution: "Single integrated platform",
          improvement: `${currentMetrics.manualWorkReduction.toFixed(1)}% work reduction`
        }
      ],

      // Roadmap Progress
      roadmapProgress: {
        phase1: {
          name: "MVP Foundation",
          status: "completed",
          completionRate: "100%",
          features: ["Authentication", "Basic KPI Management", "AI Chat", "Portfolio Tracking"]
        },
        phase2: {
          name: "Enhanced Analytics", 
          status: "in_progress",
          completionRate: "60%",
          features: ["Advanced KPI Categories", "Data Visualization", "Benchmarking"]
        },
        phase3: {
          name: "Enterprise Features",
          status: "planned",
          completionRate: "0%",
          features: ["Multi-tenant Architecture", "RBAC", "Document Management"]
        }
      },

      // Success Metrics Dashboard
      successMetrics: {
        userAdoption: {
          current: currentMetrics.userAdoption,
          target: 80,
          status: currentMetrics.userAdoption >= 80 ? "achieved" : "in_progress"
        },
        timeReduction: {
          current: currentMetrics.manualWorkReduction,
          target: 70,
          status: currentMetrics.manualWorkReduction >= 70 ? "achieved" : "in_progress"
        },
        dataQuality: {
          current: currentMetrics.dataAccuracy,
          target: 95,
          status: currentMetrics.dataAccuracy >= 95 ? "achieved" : "in_progress"
        },
        roi: {
          current: currentMetrics.roiMultiplier,
          target: 3,
          status: currentMetrics.roiMultiplier >= 3 ? "achieved" : "in_progress"
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      businessImpact: impactReport,
      insights: businessInsights,
      summary: {
        valueProposition: "Transform complex investment data into actionable insights 10x faster",
        currentPerformance: {
          speed: `${(216000 / Math.max(currentMetrics.timeToInsight, 1)).toFixed(1)}x faster than traditional`,
          efficiency: `${currentMetrics.manualWorkReduction.toFixed(1)}% work reduction`,
          accuracy: `${currentMetrics.dataAccuracy}% data accuracy`,
          adoption: `${currentMetrics.userAdoption.toFixed(1)}% user adoption`
        },
        nextMilestones: [
          "Achieve 80% user adoption",
          "Complete Phase 2 analytics features", 
          "Launch enterprise multi-tenancy",
          "Integrate predictive analytics"
        ]
      }
    }, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Business impact API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate business impact report',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST endpoint to update business metrics
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { 
      portfolios, 
      kpis, 
      activeUsers, 
      totalUsers,
      manualHours,
      automatedHours 
    } = await request.json()

    // Update business metrics
    if (portfolios !== undefined && kpis !== undefined) {
      businessMetrics.trackPortfolioGrowth(portfolios, kpis)
    }

    if (activeUsers !== undefined && totalUsers !== undefined) {
      businessMetrics.trackUserAdoption(activeUsers, totalUsers)
    }

    if (manualHours !== undefined && automatedHours !== undefined) {
      businessMetrics.trackManualWorkReduction(manualHours, automatedHours)
    }

    return NextResponse.json({
      success: true,
      message: 'Business metrics updated successfully',
      currentMetrics: businessMetrics.getCurrentMetrics()
    })

  } catch (error) {
    console.error('Business metrics update error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update business metrics'
    }, { status: 500 })
  }
}
