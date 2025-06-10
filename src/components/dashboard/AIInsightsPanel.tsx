'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, MessageSquare, TrendingUp, AlertTriangle, Lightbulb, Brain, Zap, Target, CheckCircle } from 'lucide-react';

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
    <Card className="w-full border-l-4 border-l-blue-500 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="text-lg font-bold">AI Portfolio Insights</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Real-time Analysis
                </Badge>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-600">Confidence Score</div>
            <div className="flex items-center gap-2">
              <Progress value={85} className="w-16 h-2" />
              <span className="text-sm font-bold text-blue-600">85%</span>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          Enterprise-grade AI analysis of portfolio performance, trends, and strategic recommendations
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

        {/* Enhanced Insights List */}
        <div className="space-y-4">
          {loading && insights.length === 0 ? (
            <div className="flex items-center justify-center py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Analyzing portfolio data...</span>
                <div className="text-xs text-gray-500 mt-1">This may take a few moments</div>
              </div>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={index}
                className="group p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-200 transition-all duration-200 bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getInsightColor(insight.type).replace('text-', 'bg-').replace('-800', '-100')}`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-gray-900">{insight.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getInsightColor(insight.type)} variant="secondary">
                          {insight.type.toUpperCase()}
                        </Badge>
                        {insight.actionable && (
                          <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                            <Target className="h-3 w-3 mr-1" />
                            Actionable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <CheckCircle className="h-3 w-3" />
                      Confidence
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={insight.confidence}
                        className="w-12 h-1.5"
                        indicatorClassName={
                          insight.confidence >= 80 ? "bg-green-500" :
                          insight.confidence >= 60 ? "bg-blue-500" : "bg-amber-500"
                        }
                      />
                      <span className="text-xs font-bold text-gray-700">
                        {Math.round(insight.confidence)}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3 pl-11">
                  {insight.description}
                </p>
                {insight.actionable && (
                  <div className="pl-11">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Take Action
                    </Button>
                  </div>
                )}
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
