/**
 * Learning Insights Component
 * Displays intelligent recommendations and industry insights from the learning engine
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Lightbulb, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import type { Recommendation, IndustryInsight } from '../types/learning';

interface LearningInsightsProps {
  context?: {
    industry?: string;
    brand?: string;
    campaignType?: string;
  };
  className?: string;
}

export function LearningInsights({ context, className }: LearningInsightsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [insights, setInsights] = useState<IndustryInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLearningData();
  }, [context]);

  const fetchLearningData = async () => {
    if (!context?.industry) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch recommendations
      const recResponse = await fetch('/api/learning/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: context.industry,
          brand: context.brand || 'Unknown Brand',
          id: `session_${Date.now()}`,
          projectName: `${context.brand} Campaign`,
          targetAudience: '',
          campaignObjectives: [],
          keyMessages: [],
          researchData: [],
          generatedContent: [],
          visualAssets: [],
          briefingData: {
            brandGuidelines: '',
            campaignGoals: '',
            keyInsights: [],
            recommendedApproaches: [],
            deliverables: [],
            timeline: '',
            successMetrics: []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
      });

      if (recResponse.ok) {
        const recData = await recResponse.json();
        setRecommendations(recData.recommendations || []);
      }

      // Fetch industry insights
      const insightsResponse = await fetch(`/api/learning/insights/${encodeURIComponent(context.industry)}`);
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.insights || []);
      }

    } catch (err) {
      console.error('Failed to fetch learning data:', err);
      setError('Unable to load intelligent insights. Learning engine may be initializing.');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'content_optimization': return <Lightbulb className="h-4 w-4" />;
      case 'timing_suggestion': return <TrendingUp className="h-4 w-4" />;
      case 'audience_insight': return <Users className="h-4 w-4" />;
      case 'creative_direction': return <Brain className="h-4 w-4" />;
      case 'budget_allocation': return <Target className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Learning Insights
          </CardTitle>
          <CardDescription>
            Generating intelligent recommendations...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full border-dashed border-gray-300", className)}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchLearningData}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!context?.industry) {
    return (
      <Card className={cn("w-full border-dashed border-gray-300", className)}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Set industry context to see intelligent insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Learning Insights
          <Badge variant="secondary" className="ml-auto">
            {context.industry}
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered recommendations based on cross-client learning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Smart Recommendations</h4>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-blue-600">
                      {getRecommendationIcon(rec.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-medium text-gray-900 truncate">
                          {rec.title}
                        </h5>
                        <Badge className={cn("text-xs", getImpactColor(rec.impact))}>
                          {rec.impact} impact
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                      {rec.reasoning && (
                        <p className="text-xs text-gray-500 italic">
                          💡 {rec.reasoning}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round(rec.confidence * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Industry Insights Section */}
        {insights.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Industry Insights</h4>
            <div className="grid grid-cols-1 gap-2">
              {insights.slice(0, 2).map((insight, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {insight.metric}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-blue-600">
                        {insight.value}
                      </span>
                      {insight.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                      {insight.trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{insight.context}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recommendations.length === 0 && insights.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <h4 className="text-sm font-medium mb-1">Building Intelligence</h4>
            <p className="text-xs">
              As you create campaigns, SAGE learns patterns to provide smarter recommendations.
            </p>
          </div>
        )}

        {/* Learning Status */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Learning Engine Active</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchLearningData}
              className="h-auto p-1 text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}