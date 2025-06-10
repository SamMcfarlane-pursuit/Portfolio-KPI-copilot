'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart,
  Activity,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectorData {
  sector: string;
  count: number;
  avgValuation: number;
  percentage?: number;
  growth?: number;
}

interface PortfolioChartProps {
  data: SectorData[];
  title: string;
  description?: string;
  type?: 'bar' | 'donut' | 'progress';
  showGrowth?: boolean;
  className?: string;
}

export function PortfolioChart({
  data,
  title,
  description,
  type = 'bar',
  showGrowth = false,
  className
}: PortfolioChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSectorColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500', 
      'bg-amber-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
      'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const getSectorLightColor = (index: number) => {
    const colors = [
      'bg-blue-100',
      'bg-emerald-100',
      'bg-amber-100', 
      'bg-purple-100',
      'bg-pink-100',
      'bg-indigo-100',
      'bg-cyan-100',
      'bg-orange-100'
    ];
    return colors[index % colors.length];
  };

  const maxValuation = Math.max(...data.map(d => d.avgValuation));

  const renderBarChart = () => (
    <div className="space-y-4">
      {data.map((sector, index) => (
        <div key={sector.sector} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("w-3 h-3 rounded-full", getSectorColor(index))}></div>
              <span className="font-medium text-sm">{sector.sector}</span>
              <Badge variant="outline" className="text-xs">
                {sector.count} companies
              </Badge>
            </div>
            <div className="text-right">
              <div className="font-semibold text-sm">{formatCurrency(sector.avgValuation)}</div>
              {showGrowth && sector.growth && (
                <div className={cn(
                  "text-xs flex items-center",
                  sector.growth > 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {sector.growth > 0 ? '+' : ''}{sector.growth.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all duration-500", getSectorColor(index))}
                style={{ width: `${(sector.avgValuation / maxValuation) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDonutChart = () => {
    const total = data.reduce((sum, sector) => sum + sector.count, 0);
    
    return (
      <div className="space-y-4">
        {/* Simulated Donut Chart with Progress Rings */}
        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-500">Total Companies</div>
            </div>
          </div>
          {/* Outer ring simulation */}
          <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
          {data.map((sector, index) => {
            const percentage = (sector.count / total) * 100;
            return (
              <div 
                key={sector.sector}
                className={cn(
                  "absolute inset-0 rounded-full border-8 border-transparent",
                  getSectorColor(index).replace('bg-', 'border-')
                )}
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + (percentage / 100) * 50}% 0%, 50% 50%)`
                }}
              ></div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {data.map((sector, index) => (
            <div key={sector.sector} className="flex items-center space-x-2">
              <div className={cn("w-3 h-3 rounded-full", getSectorColor(index))}></div>
              <span className="text-xs font-medium">{sector.sector}</span>
              <span className="text-xs text-gray-500">
                {((sector.count / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProgressChart = () => (
    <div className="space-y-6">
      {data.map((sector, index) => {
        const percentage = sector.percentage || ((sector.count / data.reduce((sum, s) => sum + s.count, 0)) * 100);
        return (
          <div key={sector.sector} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn("w-4 h-4 rounded", getSectorColor(index))}></div>
                <div>
                  <div className="font-medium text-sm">{sector.sector}</div>
                  <div className="text-xs text-gray-500">{sector.count} companies</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">{percentage.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">{formatCurrency(sector.avgValuation)}</div>
              </div>
            </div>
            <Progress 
              value={percentage} 
              className="h-3"
              indicatorClassName={getSectorColor(index)}
            />
          </div>
        );
      })}
    </div>
  );

  const renderChart = () => {
    switch (type) {
      case 'donut':
        return renderDonutChart();
      case 'progress':
        return renderProgressChart();
      default:
        return renderBarChart();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'donut':
        return <PieChart className="h-5 w-5" />;
      case 'progress':
        return <Target className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center space-x-2">
              {getIcon()}
              <span>{title}</span>
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          renderChart()
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
