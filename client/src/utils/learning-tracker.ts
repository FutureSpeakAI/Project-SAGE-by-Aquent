/**
 * Learning Tracker Utility
 * Records user interactions and campaign events for the learning engine
 */

import type { LearningEvent, CampaignData } from '../types/learning';

export class LearningTracker {
  private static instance: LearningTracker;
  private sessionId: string;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getInstance(): LearningTracker {
    if (!LearningTracker.instance) {
      LearningTracker.instance = new LearningTracker();
    }
    return LearningTracker.instance;
  }

  /**
   * Record a learning event
   */
  async recordEvent(eventType: LearningEvent['eventType'], eventData: any): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const event: LearningEvent = {
        sessionId: this.sessionId,
        eventType,
        eventData,
        timestamp: new Date(),
        userId: 'anonymous', // In a real app, this would come from auth
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          url: window.location.pathname
        }
      };

      await fetch('/api/learning/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });

    } catch (error) {
      console.warn('Failed to record learning event:', error);
    }
  }

  /**
   * Record campaign completion
   */
  async recordCampaign(campaign: Partial<CampaignData>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const campaignData: CampaignData = {
        campaignId: campaign.campaignId || `campaign_${Date.now()}`,
        clientIndustry: campaign.clientIndustry || 'Unknown',
        campaignType: campaign.campaignType || 'general',
        deliverables: campaign.deliverables || [],
        successMetrics: campaign.successMetrics || {},
        createdBy: 'anonymous',
        timestamp: new Date(),
        metadata: campaign.metadata || {}
      };

      await fetch('/api/learning/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

    } catch (error) {
      console.warn('Failed to record campaign data:', error);
    }
  }

  /**
   * Track content generation events
   */
  async trackContentGeneration(contentType: string, prompt: string, success: boolean): Promise<void> {
    await this.recordEvent('content_generated', {
      contentType,
      prompt: prompt.substring(0, 200), // Truncate for privacy
      success,
      model: 'gpt-4o', // This would be dynamic in real implementation
      timestamp: new Date()
    });
  }

  /**
   * Track user workflow events
   */
  async trackWorkflow(action: string, tabName: string, context?: any): Promise<void> {
    await this.recordEvent('workflow_interaction', {
      action,
      tabName,
      context: context ? JSON.stringify(context).substring(0, 500) : undefined,
      timestamp: new Date()
    });
  }

  /**
   * Track research and briefing events
   */
  async trackResearch(queryType: string, industry: string, success: boolean): Promise<void> {
    await this.recordEvent('research_query', {
      queryType,
      industry,
      success,
      timestamp: new Date()
    });
  }

  /**
   * Track visual asset generation
   */
  async trackVisualGeneration(assetType: string, prompt: string, model: string): Promise<void> {
    await this.recordEvent('visual_generated', {
      assetType,
      prompt: prompt.substring(0, 200),
      model,
      timestamp: new Date()
    });
  }

  /**
   * Enable or disable learning tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const learningTracker = LearningTracker.getInstance();