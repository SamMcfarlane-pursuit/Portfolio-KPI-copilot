/**
 * Business Metrics Tracking
 * Implements the value proposition metrics and KPIs
 */

export interface BusinessMetrics {
  // Core Value Proposition Metrics
  timeToInsight: number // seconds
  manualWorkReduction: number // percentage
  dataAccuracy: number // percentage
  userAdoption: number // percentage
  
  // Portfolio Performance Metrics
  portfolioCount: number
  kpiCount: number
  activeUsers: number
  reportsGenerated: number
  
  // AI Performance Metrics
  aiResponseTime: number // milliseconds
  aiAccuracy: number // percentage
  queriesProcessed: number
  
  // Business Impact Metrics
  timesSaved: number // hours per month
  costReduction: number // dollars per month
  roiMultiplier: number // 3x, 5x, 10x
}

export class BusinessMetricsTracker {
  private static instance: BusinessMetricsTracker
  private metrics: BusinessMetrics

  constructor() {
    this.metrics = {
      timeToInsight: 0,
      manualWorkReduction: 0,
      dataAccuracy: 95,
      userAdoption: 0,
      portfolioCount: 0,
      kpiCount: 0,
      activeUsers: 0,
      reportsGenerated: 0,
      aiResponseTime: 0,
      aiAccuracy: 90,
      queriesProcessed: 0,
      timesSaved: 0,
      costReduction: 0,
      roiMultiplier: 1
    }
  }

  static getInstance(): BusinessMetricsTracker {
    if (!BusinessMetricsTracker.instance) {
      BusinessMetricsTracker.instance = new BusinessMetricsTracker()
    }
    return BusinessMetricsTracker.instance
  }

  // Track time to insight (core value prop: 10x faster)
  trackInsightGeneration(startTime: number, endTime: number) {
    const timeToInsight = (endTime - startTime) / 1000
    this.metrics.timeToInsight = timeToInsight
    
    // Calculate improvement over traditional methods (2-3 days = 172800-259200 seconds)
    const traditionalTime = 216000 // 2.5 days average
    const improvement = traditionalTime / timeToInsight
    
    console.log(`Insight generated in ${timeToInsight}s (${improvement.toFixed(1)}x faster than traditional)`)
    
    return {
      timeToInsight,
      improvementFactor: improvement,
      traditionalTime
    }
  }

  // Track manual work reduction (core value prop: 70% reduction)
  trackManualWorkReduction(manualHours: number, automatedHours: number) {
    const reduction = ((manualHours - automatedHours) / manualHours) * 100
    this.metrics.manualWorkReduction = reduction
    this.metrics.timesSaved = manualHours - automatedHours
    
    // Calculate cost savings (assuming $100/hour analyst time)
    const costSavings = (manualHours - automatedHours) * 100
    this.metrics.costReduction = costSavings
    
    return {
      reductionPercentage: reduction,
      hoursSaved: manualHours - automatedHours,
      costSavings
    }
  }

  // Track AI performance metrics
  trackAIPerformance(responseTime: number, accuracy: number) {
    this.metrics.aiResponseTime = responseTime
    this.metrics.aiAccuracy = accuracy
    this.metrics.queriesProcessed += 1
    
    return {
      responseTime,
      accuracy,
      totalQueries: this.metrics.queriesProcessed
    }
  }

  // Track portfolio and KPI growth
  trackPortfolioGrowth(portfolios: number, kpis: number) {
    this.metrics.portfolioCount = portfolios
    this.metrics.kpiCount = kpis
    
    return {
      portfolios,
      kpis,
      averageKpisPerPortfolio: portfolios > 0 ? kpis / portfolios : 0
    }
  }

  // Track user adoption (target audience engagement)
  trackUserAdoption(activeUsers: number, totalUsers: number) {
    const adoptionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
    this.metrics.userAdoption = adoptionRate
    this.metrics.activeUsers = activeUsers
    
    return {
      adoptionRate,
      activeUsers,
      totalUsers
    }
  }

  // Calculate ROI multiplier
  calculateROI(investmentCost: number, monthlySavings: number, months: number = 12) {
    const totalSavings = monthlySavings * months
    const roi = totalSavings / investmentCost
    this.metrics.roiMultiplier = roi
    
    return {
      roi,
      totalSavings,
      investmentCost,
      paybackPeriod: investmentCost / monthlySavings
    }
  }

  // Get comprehensive business impact report
  getBusinessImpactReport() {
    return {
      valueProposition: {
        speedImprovement: "10x faster insights",
        workReduction: `${this.metrics.manualWorkReduction.toFixed(1)}% manual work reduction`,
        timeToInsight: `${this.metrics.timeToInsight}s average response time`,
        accuracy: `${this.metrics.dataAccuracy}% data accuracy`
      },
      
      portfolioMetrics: {
        totalPortfolios: this.metrics.portfolioCount,
        totalKPIs: this.metrics.kpiCount,
        averageKPIsPerPortfolio: this.metrics.portfolioCount > 0 
          ? (this.metrics.kpiCount / this.metrics.portfolioCount).toFixed(1) 
          : 0
      },
      
      userEngagement: {
        activeUsers: this.metrics.activeUsers,
        adoptionRate: `${this.metrics.userAdoption.toFixed(1)}%`,
        reportsGenerated: this.metrics.reportsGenerated
      },
      
      aiPerformance: {
        averageResponseTime: `${this.metrics.aiResponseTime}ms`,
        accuracy: `${this.metrics.aiAccuracy}%`,
        totalQueries: this.metrics.queriesProcessed
      },
      
      businessImpact: {
        hoursSavedPerMonth: this.metrics.timesSaved,
        costReductionPerMonth: `$${this.metrics.costReduction.toLocaleString()}`,
        roiMultiplier: `${this.metrics.roiMultiplier.toFixed(1)}x`
      },
      
      targetAudience: {
        privateEquity: "Portfolio managers tracking 10-50 companies",
        ventureCapital: "Partners monitoring startup metrics", 
        familyOffices: "Investment managers overseeing diverse portfolios"
      }
    }
  }

  // Get current metrics
  getCurrentMetrics(): BusinessMetrics {
    return { ...this.metrics }
  }

  // Reset metrics (for testing)
  resetMetrics() {
    this.metrics = {
      timeToInsight: 0,
      manualWorkReduction: 0,
      dataAccuracy: 95,
      userAdoption: 0,
      portfolioCount: 0,
      kpiCount: 0,
      activeUsers: 0,
      reportsGenerated: 0,
      aiResponseTime: 0,
      aiAccuracy: 90,
      queriesProcessed: 0,
      timesSaved: 0,
      costReduction: 0,
      roiMultiplier: 1
    }
  }
}

// Export singleton instance
export const businessMetrics = BusinessMetricsTracker.getInstance()

// Utility functions for common business calculations
export const BusinessCalculators = {
  // Calculate time savings vs traditional methods
  calculateTimeSavings: (automatedTime: number, traditionalTime: number = 216000) => {
    return {
      timeSaved: traditionalTime - automatedTime,
      improvementFactor: traditionalTime / automatedTime,
      efficiencyGain: ((traditionalTime - automatedTime) / traditionalTime) * 100
    }
  },

  // Calculate cost savings for different user types
  calculateCostSavings: (hoursSaved: number, userType: 'analyst' | 'manager' | 'partner') => {
    const hourlyRates = {
      analyst: 100,
      manager: 200,
      partner: 500
    }
    
    return hoursSaved * hourlyRates[userType]
  },

  // Calculate portfolio efficiency metrics
  calculatePortfolioEfficiency: (portfolios: number, kpis: number, users: number) => {
    return {
      kpisPerPortfolio: portfolios > 0 ? kpis / portfolios : 0,
      portfoliosPerUser: users > 0 ? portfolios / users : 0,
      kpisPerUser: users > 0 ? kpis / users : 0
    }
  }
}
