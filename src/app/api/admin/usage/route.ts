import { NextRequest, NextResponse } from 'next/server'
import { UsageMonitor } from '@/lib/usage-monitor'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Simple API key check instead of session for build compatibility
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin API key required' },
        { status: 401 }
      )
    }

    // Get current usage statistics
    const usageStats = UsageMonitor.getUsageStats()

    return NextResponse.json({
      success: true,
      ...usageStats,
      recommendations: generateRecommendations(usageStats)
    })

  } catch (error) {
    console.error('Usage API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}

function generateRecommendations(stats: any) {
  const recommendations = []

  if (stats.percentUsed.apiCalls > 70) {
    recommendations.push({
      type: 'api_calls',
      severity: 'warning',
      message: 'Consider implementing caching to reduce API calls',
      action: 'Add Redis or in-memory caching for frequently accessed data'
    })
  }

  if (stats.percentUsed.bandwidth > 70) {
    recommendations.push({
      type: 'bandwidth',
      severity: 'warning', 
      message: 'Optimize response sizes to reduce bandwidth usage',
      action: 'Implement pagination and remove unnecessary data fields'
    })
  }

  if (stats.percentUsed.apiCalls > 90 || stats.percentUsed.bandwidth > 90) {
    recommendations.push({
      type: 'upgrade',
      severity: 'critical',
      message: 'Consider upgrading to Vercel Pro for higher limits',
      action: 'Upgrade to Pro plan for 1TB bandwidth and 1M function executions'
    })
  }

  return recommendations
}
