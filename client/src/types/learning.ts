/**
 * Learning Engine Types for Client Side
 */

export interface LearningEvent {
  sessionId: string;
  eventType: 'content_generated' | 'workflow_interaction' | 'research_query' | 'visual_generated' | 'campaign_completed';
  eventData: any;
  timestamp: Date;
  userId: string;
  metadata?: {
    userAgent?: string;
    timestamp?: number;
    url?: string;
    [key: string]: any;
  };
}

export interface CampaignData {
  campaignId: string;
  clientIndustry: string;
  campaignType: string;
  deliverables: string[];
  successMetrics: Record<string, any>;
  createdBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Recommendation {
  type: 'content_optimization' | 'timing_suggestion' | 'audience_insight' | 'creative_direction' | 'budget_allocation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  reasoning: string;
  actionable: boolean;
}

export interface IndustryInsight {
  metric: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  context: string;
  source: string;
}