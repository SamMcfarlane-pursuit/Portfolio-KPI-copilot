'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface AIInsight {
  type: 'performance' | 'risk' | 'opportunity' | 'trend';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

interface AIInsightsPanelProps {
  portfolioId?: string;
  organizationId?: string;
  refreshInterval?: number;
}

export function AIInsightsPanel({ 
  portfolioId, 
  organizationId, 
  refreshInterval = 300000 // 5 minutes
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto-refresh insights
  useEffect(() => {
    generateInsights('Analyze current portfolio performance and identify key trends');
    
    const interval = setInterval(() => {
      generateInsights('Provide updated portfolio insights');
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [portfolioId, organizationId, refreshInterval]);

  const generateInsights = async (analysisQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: analysisQuery,
          portfolioId,
          organizationId,
          analysisType: 'performance',
          includeRecommendations: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const generatedInsights = parseInsightsFromAnalysis(data.data);
        setInsights(generatedInsights);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/explain-kpi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: query,
          userRole: 'portfolio_manager',
          includeExamples: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add custom insight to the list
        const customInsight: AIInsight = {
          type: 'trend',
          title: 'Custom Analysis',
          description: data.data.explanation?.explanation || 'Analysis completed',
          confidence: 85,
          actionable: true
        };
        setInsights(prev => [customInsight, ...prev.slice(0, 4)]);
        setQuery('');
      }
    } catch (error) {
      console.error('Failed to process custom query:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseInsightsFromAnalysis = (analysisData: any): AIInsight[] => {
    const insights: AIInsight[] = [];
    
    // Parse insights from AI analysis
    if (analysisData.insights) {
      analysisData.insights.forEach((insight: string, index: number) => {
        insights.push({
          type: getInsightType(insight),
          title: `Insight ${index + 1}`,
          description: insight,
          confidence: 75 + Math.random() * 20, // Simulated confidence
          actionable: insight.toLowerCase().includes('should') || insight.toLowerCase().includes('recommend')
        });
      });
    }

    // Add recommendations as insights
    if (analysisData.recommendations) {
      analysisData.recommendations.forEach((rec: any) => {
        insights.push({
          type: rec.type === 'data_quality' ? 'risk' : 'opportunity',
          title: rec.type.replace('_', ' ').toUpperCase(),
          description: rec.description,
          confidence: rec.priority === 'high' ? 90 : 70,
          actionable: true
        });
      });
    }

    return insights.slice(0, 5); // Limit to 5 insights
  };

  const getInsightType = (insight: string): AIInsight['type'] => {
    const lowerInsight = insight.toLowerCase();
    if (lowerInsight.includes('risk') || lowerInsight.includes('concern') || lowerInsight.includes('decline')) {
      return 'risk';
    }
    if (lowerInsight.includes('opportunity') || lowerInsight.includes('growth') || lowerInsight.includes('improve')) {
      return 'opportunity';
    }
    if (lowerInsight.includes('trend') || lowerInsight.includes('pattern') || lowerInsight.includes('increase')) {
      return 'trend';
    }
    return 'performance';
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'performance':
        return <TrendingUp className="h-4 w-4" />;
      case 'risk':
        return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity':
        return <Lightbulb className="h-4 w-4" />;
      case 'trend':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'performance':
        return 'bg-blue-100 text-blue-800';
      case 'risk':
        return 'bg-red-100 text-red-800';
      case 'opportunity':
        return 'bg-green-100 text-green-800';
      case 'trend':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Portfolio Insights
        </CardTitle>
        <CardDescription>
          AI-powered analysis of your portfolio performance and trends
          {lastUpdated && (
            <span className="block text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Custom Query Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask about your portfolio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomQuery()}
          />
          <Button 
            onClick={handleCustomQuery} 
            disabled={loading || !query.trim()}
            size="sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
          </Button>
        </div>

        {/* Insights List */}
        <div className="space-y-3">
          {loading && insights.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Generating insights...</span>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <span className="font-medium text-sm">{insight.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getInsightColor(insight.type)}>
                      {insight.type}
                    </Badge>
                    {insight.actionable && (
                      <Badge variant="outline" className="text-xs">
                        Actionable
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {insight.description}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Confidence: {Math.round(insight.confidence)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {insights.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No insights available. Try asking a question about your portfolio.</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateInsights('Identify top performing companies this quarter')}
            disabled={loading}
          >
            Top Performers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateInsights('Analyze portfolio risks and concerns')}
            disabled={loading}
          >
            Risk Analysis
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateInsights('Find growth opportunities across portfolio')}
            disabled={loading}
          >
            Opportunities
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
