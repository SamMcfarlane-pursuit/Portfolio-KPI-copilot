'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { 
  TrendingUp, 
  DollarSign, 
  Building2, 
  BarChart3, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface PortfolioSummary {
  totalPortfolios: number;
  totalValuation: number;
  sectorBreakdown: Array<{
    sector: string;
    count: number;
    avgValuation: number;
  }>;
  recentPerformance: {
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Allow demo mode - don't redirect if unauthenticated
    // This enables users to explore the dashboard without authentication
    if (status === 'unauthenticated') {
      // Load demo data instead of redirecting
      setPortfolioSummary({
        totalPortfolios: 12,
        totalValuation: 2847392,
        sectorBreakdown: [
          { sector: 'Technology', count: 5, avgValuation: 450000 },
          { sector: 'Healthcare', count: 3, avgValuation: 320000 },
          { sector: 'Finance', count: 2, avgValuation: 280000 },
          { sector: 'Energy', count: 2, avgValuation: 190000 }
        ],
        recentPerformance: {
          growth: 12.5,
          trend: 'up' as const
        }
      });
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (session) {
      fetchPortfolioSummary();
    }
  }, [session]);

  const fetchPortfolioSummary = async () => {
    try {
      const response = await fetch('/api/analyze-portfolio');
      if (response.ok) {
        const data = await response.json();
        setPortfolioSummary({
          totalPortfolios: data.data.totalPortfolios,
          totalValuation: calculateTotalValuation(data.data.sectorBreakdown),
          sectorBreakdown: data.data.sectorBreakdown.map((item: any) => ({
            sector: item.sector || 'Unknown',
            count: item._count.id,
            avgValuation: item._avg.currentValuation || 0
          })),
          recentPerformance: {
            growth: Math.random() * 20 - 10, // Simulated for demo
            trend: Math.random() > 0.5 ? 'up' : 'down'
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch portfolio summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalValuation = (sectorData: any[]) => {
    return sectorData.reduce((total, sector) => {
      return total + (sector._avg.currentValuation || 0) * sector._count.id;
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
            <p className="text-gray-600 mt-2">
              {session
                ? `Welcome back, ${session.user?.name || session.user?.email}`
                : 'Demo Mode - Exploring Sample Portfolio Data'
              }
            </p>
          </div>
          {!session && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              Demo Mode
            </Badge>
          )}
        </div>
        {!session && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Demo Mode:</strong> You're viewing sample data.
              <a href="/auth/signin" className="underline ml-1">Sign in</a> to access your real portfolio data.
            </p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioSummary?.totalPortfolios || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active investments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Valuation</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioSummary?.totalValuation || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current portfolio value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-2xl font-bold ${getTrendColor(portfolioSummary?.recentPerformance.trend || 'stable')}`}>
                {portfolioSummary?.recentPerformance.growth?.toFixed(1) || '0.0'}%
              </div>
              {getTrendIcon(portfolioSummary?.recentPerformance.trend || 'stable')}
            </div>
            <p className="text-xs text-muted-foreground">
              Quarterly growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sectors</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioSummary?.sectorBreakdown.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active sectors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Insights Panel - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <AIInsightsPanel 
            refreshInterval={300000} // 5 minutes
          />
        </div>

        {/* Sector Breakdown */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Sector Breakdown</CardTitle>
              <CardDescription>
                Portfolio distribution by sector
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {portfolioSummary?.sectorBreakdown.map((sector, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{sector.sector}</Badge>
                      <span className="text-sm text-gray-600">
                        {sector.count} companies
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(sector.avgValuation)}
                    </div>
                  </div>
                ))}
                
                {(!portfolioSummary?.sectorBreakdown || portfolioSummary.sectorBreakdown.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No sector data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common portfolio management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={() => window.location.href = '/real-data'}>
                <Users className="h-4 w-4 mr-2" />
                Manage Companies
              </Button>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Reports
              </Button>
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Performance Analysis
              </Button>
              <Button variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Valuation Updates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
