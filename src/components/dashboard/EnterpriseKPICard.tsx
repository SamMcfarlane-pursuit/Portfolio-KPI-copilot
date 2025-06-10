'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'percentage' | 'absolute';
  trend?: 'up' | 'down' | 'stable';
  target?: number;
  progress?: number;
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  period?: string;
  loading?: boolean;
  className?: string;
}

export function EnterpriseKPICard({
  title,
  value,
  change,
  changeType = 'percentage',
  trend = 'stable',
  target,
  progress,
  status = 'good',
  icon: Icon,
  description,
  period = 'vs last quarter',
  loading = false,
  className
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600 bg-emerald-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'excellent':
        return 'text-emerald-600';
      case 'good':
        return 'text-blue-600';
      case 'warning':
        return 'text-amber-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-lg border-l-4",
      status === 'excellent' && "border-l-emerald-500",
      status === 'good' && "border-l-blue-500",
      status === 'warning' && "border-l-amber-500",
      status === 'critical' && "border-l-red-500",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-600 tracking-wide uppercase">
              {title}
            </h3>
            {getStatusIcon()}
          </div>
          <div className={cn("p-2 rounded-lg", getStatusColor().replace('text-', 'bg-').replace('-600', '-100'))}>
            <Icon className={cn("h-5 w-5", getStatusColor())} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Value */}
        <div className="space-y-1">
          <div className="text-3xl font-bold text-gray-900">
            {formatValue(value)}
          </div>
          
          {/* Change Indicator */}
          {change !== undefined && (
            <div className="flex items-center space-x-2">
              <div className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                getTrendColor()
              )}>
                {getTrendIcon()}
                <span>
                  {changeType === 'percentage' ? `${Math.abs(change)}%` : formatValue(Math.abs(change))}
                </span>
              </div>
              <span className="text-xs text-gray-500">{period}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Progress to target</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
              indicatorClassName={cn(
                progress >= 90 ? "bg-emerald-500" :
                progress >= 70 ? "bg-blue-500" :
                progress >= 50 ? "bg-amber-500" : "bg-red-500"
              )}
            />
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed">
            {description}
          </p>
        )}

        {/* Target Information */}
        {target && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Target</span>
              <span className="font-medium text-gray-700">{formatValue(target)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
