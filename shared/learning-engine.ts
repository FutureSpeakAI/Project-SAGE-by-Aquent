/**
 * Simple Learning Engine for 100 Users
 * Pragmatic cross-client learning without over-engineering
 */

import { SessionContext, BriefingData } from './session-context';

export interface LearningEvent {
  sessionId: string;
  eventType: 'briefing_created' | 'content_generated' | 'campaign_completed' | 'user_feedback' | 'pattern_applied';
  eventData: Record<string, any>;
  timestamp?: Date;
}

export interface CampaignData {
  campaignId: string;
  clientIndustry: string;
  campaignType: string;
  budgetRange?: string;
  timelineDays?: number;
  teamSize?: number;
  objectives: string[];
  outcomes?: {
    successScore: number; // 1-10
    clientSatisfaction: number; // 1-10
    onTime: boolean;
    withinBudget: boolean;
    qualityScore: number; // 1-10
  };
  contextData?: {
    seasonality: string;
    marketConditions: string;
    urgency: string;
  };
  completedAt?: Date;
}

export interface SuccessPattern {
  id: string;
  patternType: 'team_composition' | 'timeline' | 'strategy' | 'objectives' | 'process';
  industries: string[];
  conditions: Record<string, any>;
  outcomes: Record<string, any>;
  successRate: number; // 0-1
  confidenceScore: number; // 0-1
  sampleSize: number;
  title: string;
  description: string;
  recommendation: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recommendation {
  type: 'strategy' | 'team' | 'timeline' | 'budget' | 'process';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: number; // Expected improvement percentage
  evidence: string;
  priority: 'low' | 'medium' | 'high';
  implementation: string;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  tabState: Record<string, any>;
  conversationHistory: any[];
  briefingData?: BriefingData;
  preferences: Record<string, any>;
  lastActivity: Date;
  hasImportantChanges?: boolean;
}

interface CacheEntry {
  value: any;
  timestamp: number;
}

/**
 * Simple Learning Engine - No over-engineering, just solid fundamentals
 */
export class SimpleLearningEngine {
  private cache: Map<string, CacheEntry> = new Map();
  private db: any; // Will be injected
  private initialized = false;

  constructor(database: any) {
    this.db = database;
    this.startCleanupTimer();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.createTables();
      this.initialized = true;
      console.log('SimpleLearningEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize learning engine:', error);
      throw error;
    }
  }

  /**
   * Record a learning event (simple database insert)
   */
  async recordEvent(event: LearningEvent): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      await this.db.query(`
        INSERT INTO learning_events (session_id, event_type, event_data, created_at)
        VALUES ($1, $2, $3, $4)
      `, [
        event.sessionId,
        event.eventType,
        JSON.stringify(event.eventData),
        event.timestamp || new Date()
      ]);

      // Update patterns if significant event
      if (this.isSignificantEvent(event.eventType)) {
        // Run in background - don't block user
        setImmediate(() => this.updatePatternsAsync(event.eventData));
      }

      console.log(`Learning event recorded: ${event.eventType} for session ${event.sessionId}`);
    } catch (error) {
      console.error('Failed to record learning event:', error);
      // Don't throw - learning failures shouldn't break user operations
    }
  }

  /**
   * Record campaign data for cross-client learning
   */
  async recordCampaign(campaign: CampaignData): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      await this.db.query(`
        INSERT INTO campaign_data (
          campaign_id, client_industry, campaign_type, budget_range,
          timeline_days, team_size, objectives, outcomes, context_data,
          created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (campaign_id) DO UPDATE SET
          outcomes = EXCLUDED.outcomes,
          completed_at = EXCLUDED.completed_at,
          context_data = EXCLUDED.context_data
      `, [
        campaign.campaignId,
        campaign.clientIndustry,
        campaign.campaignType,
        campaign.budgetRange,
        campaign.timelineDays,
        campaign.teamSize,
        JSON.stringify(campaign.objectives),
        campaign.outcomes ? JSON.stringify(campaign.outcomes) : null,
        campaign.contextData ? JSON.stringify(campaign.contextData) : null,
        new Date(),
        campaign.completedAt || null
      ]);

      console.log(`Campaign data recorded: ${campaign.campaignId}`);

      // If campaign is completed, update patterns
      if (campaign.completedAt && campaign.outcomes) {
        setImmediate(() => this.updatePatternsAsync(campaign));
      }
    } catch (error) {
      console.error('Failed to record campaign data:', error);
    }
  }

  /**
   * Get recommendations with simple caching
   */
  async getRecommendations(context: SessionContext): Promise<Recommendation[]> {
    if (!this.initialized) await this.initialize();

    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first (sufficient for 100 users)
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minute cache
      return cached.value;
    }

    try {
      // Query database for similar successful campaigns
      const similarCampaigns = await this.db.query(`
        SELECT * FROM campaign_data 
        WHERE client_industry = $1 
          AND completed_at IS NOT NULL
          AND (outcomes->>'successScore')::float > 7.0
        ORDER BY completed_at DESC 
        LIMIT 20
      `, [context.industry || 'technology']);

      // Get applicable success patterns
      const patterns = await this.db.query(`
        SELECT * FROM success_patterns
        WHERE $1 = ANY(industries) OR 'all' = ANY(industries)
          AND success_rate > 0.7
          AND sample_size >= 3
        ORDER BY success_rate DESC, confidence_score DESC
        LIMIT 10
      `, [context.industry || 'technology']);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        similarCampaigns.rows, 
        patterns.rows, 
        context
      );

      // Cache result
      this.cache.set(cacheKey, {
        value: recommendations,
        timestamp: Date.now()
      });

      return recommendations;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Get cross-client insights for industry
   */
  async getIndustryInsights(industry: string): Promise<any> {
    if (!this.initialized) await this.initialize();

    try {
      const insights = await this.db.query(`
        WITH industry_stats AS (
          SELECT 
            COUNT(*) as total_campaigns,
            AVG((outcomes->>'successScore')::float) as avg_success,
            AVG(timeline_days) as avg_timeline,
            AVG(team_size) as avg_team_size,
            mode() WITHIN GROUP (ORDER BY campaign_type) as most_common_type
          FROM campaign_data 
          WHERE client_industry = $1 
            AND completed_at IS NOT NULL
            AND outcomes IS NOT NULL
        ),
        recent_trends AS (
          SELECT 
            campaign_type,
            COUNT(*) as recent_count,
            AVG((outcomes->>'successScore')::float) as recent_success
          FROM campaign_data 
          WHERE client_industry = $1 
            AND completed_at > NOW() - INTERVAL '90 days'
            AND outcomes IS NOT NULL
          GROUP BY campaign_type
          ORDER BY recent_success DESC
          LIMIT 5
        )
        SELECT 
          (SELECT row_to_json(industry_stats) FROM industry_stats) as stats,
          (SELECT array_agg(row_to_json(recent_trends)) FROM recent_trends) as trends
      `, [industry]);

      return insights.rows[0] || { stats: null, trends: [] };
    } catch (error) {
      console.error('Failed to get industry insights:', error);
      return { stats: null, trends: [] };
    }
  }

  /**
   * Private method: Create database tables
   */
  private async createTables(): Promise<void> {
    // Learning events table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS learning_events (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_learning_events_session 
      ON learning_events (session_id, created_at)
    `);

    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_learning_events_type 
      ON learning_events (event_type, created_at)
    `);

    // Campaign data table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS campaign_data (
        id BIGSERIAL PRIMARY KEY,
        campaign_id VARCHAR(100) UNIQUE NOT NULL,
        client_industry VARCHAR(100) NOT NULL,
        campaign_type VARCHAR(100) NOT NULL,
        budget_range VARCHAR(50),
        timeline_days INTEGER,
        team_size INTEGER,
        objectives JSONB NOT NULL,
        outcomes JSONB,
        context_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_industry_type 
      ON campaign_data (client_industry, campaign_type)
    `);

    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_completed 
      ON campaign_data (completed_at) WHERE completed_at IS NOT NULL
    `);

    // Success patterns table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS success_patterns (
        id BIGSERIAL PRIMARY KEY,
        pattern_type VARCHAR(50) NOT NULL,
        industries TEXT[] NOT NULL,
        conditions JSONB NOT NULL,
        outcomes JSONB NOT NULL,
        success_rate DECIMAL(5,4) NOT NULL,
        confidence_score DECIMAL(5,4) NOT NULL,
        sample_size INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_success_patterns_type 
      ON success_patterns (pattern_type)
    `);

    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_success_patterns_industries 
      ON success_patterns USING GIN (industries)
    `);

    // User sessions table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        user_id VARCHAR(50),
        session_data JSONB,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_activity 
      ON user_sessions (last_activity)
    `);
  }

  /**
   * Private method: Check if event is significant enough to trigger pattern updates
   */
  private isSignificantEvent(eventType: string): boolean {
    return ['campaign_completed', 'user_feedback', 'briefing_created'].includes(eventType);
  }

  /**
   * Private method: Update patterns asynchronously
   */
  private async updatePatternsAsync(eventData: any): Promise<void> {
    try {
      // Batch process every 10 events to avoid overhead
      const eventCount = await this.getRecentEventCount();
      if (eventCount % 10 === 0) {
        await this.detectNewPatterns();
      }
    } catch (error) {
      console.error('Pattern update error:', error);
      // Don't fail user operations due to learning issues
    }
  }

  /**
   * Private method: Get recent event count
   */
  private async getRecentEventCount(): Promise<number> {
    const result = await this.db.query(`
      SELECT COUNT(*) as count 
      FROM learning_events 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    return parseInt(result.rows[0].count);
  }

  /**
   * Private method: Simple pattern detection
   */
  private async detectNewPatterns(): Promise<void> {
    try {
      // Find successful campaign patterns
      const patterns = await this.db.query(`
        WITH successful_campaigns AS (
          SELECT 
            client_industry,
            campaign_type,
            budget_range,
            timeline_days,
            team_size,
            COUNT(*) as sample_size,
            AVG((outcomes->>'successScore')::float) as avg_success,
            AVG((outcomes->>'clientSatisfaction')::float) as avg_satisfaction
          FROM campaign_data 
          WHERE completed_at IS NOT NULL
            AND completed_at > NOW() - INTERVAL '90 days'
            AND outcomes IS NOT NULL
          GROUP BY client_industry, campaign_type, budget_range, timeline_days, team_size
          HAVING COUNT(*) >= 3
            AND AVG((outcomes->>'successScore')::float) > 7.5
        )
        SELECT 
          client_industry,
          campaign_type,
          budget_range,
          timeline_days,
          team_size,
          sample_size,
          avg_success,
          avg_satisfaction
        FROM successful_campaigns
        WHERE avg_success > 8.0
        ORDER BY avg_success DESC, sample_size DESC
      `);

      // Update patterns table
      for (const pattern of patterns.rows) {
        await this.upsertPattern(pattern);
      }

      console.log(`Updated ${patterns.rows.length} success patterns`);
    } catch (error) {
      console.error('Pattern detection error:', error);
    }
  }

  /**
   * Private method: Upsert a success pattern
   */
  private async upsertPattern(patternData: any): Promise<void> {
    const patternId = `${patternData.client_industry}_${patternData.campaign_type}_${patternData.budget_range || 'any'}`;
    
    await this.db.query(`
      INSERT INTO success_patterns (
        pattern_type, industries, conditions, outcomes, success_rate,
        confidence_score, sample_size, title, description, recommendation,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT ON CONSTRAINT success_patterns_pkey DO UPDATE SET
        success_rate = EXCLUDED.success_rate,
        confidence_score = EXCLUDED.confidence_score,
        sample_size = EXCLUDED.sample_size,
        outcomes = EXCLUDED.outcomes,
        updated_at = NOW()
    `, [
      'campaign_success',
      [patternData.client_industry],
      JSON.stringify({
        campaignType: patternData.campaign_type,
        budgetRange: patternData.budget_range,
        timelineDays: patternData.timeline_days,
        teamSize: patternData.team_size
      }),
      JSON.stringify({
        successScore: patternData.avg_success,
        satisfaction: patternData.avg_satisfaction
      }),
      Math.min(patternData.avg_success / 10, 1), // Convert to 0-1 scale
      Math.min(patternData.sample_size / 20, 1), // Confidence based on sample size
      patternData.sample_size,
      `Optimal ${patternData.campaign_type} Strategy`,
      `Successful ${patternData.campaign_type} campaigns in ${patternData.client_industry} typically achieve ${Math.round(patternData.avg_success * 10)}% success rates`,
      `Consider using ${patternData.team_size || 'standard'} team members with ${patternData.timeline_days || 'flexible'} day timeline for ${patternData.budget_range || 'any'} budget range`
    ]);
  }

  /**
   * Private method: Generate cache key
   */
  private generateCacheKey(context: SessionContext): string {
    return `recommendations:${context.industry || 'default'}:${context.id || 'anon'}`;
  }

  /**
   * Private method: Generate recommendations
   */
  private generateRecommendations(
    campaigns: any[], 
    patterns: any[], 
    context: SessionContext
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Generate recommendations from patterns
    for (const pattern of patterns) {
      recommendations.push({
        type: 'strategy',
        title: pattern.title,
        description: pattern.description,
        confidence: pattern.confidence_score,
        impact: Math.round(pattern.success_rate * 100),
        evidence: `Based on ${pattern.sample_size} similar campaigns with ${Math.round(pattern.success_rate * 100)}% success rate`,
        priority: pattern.confidence_score > 0.8 ? 'high' : pattern.confidence_score > 0.6 ? 'medium' : 'low',
        implementation: pattern.recommendation
      });
    }

    // Generate recommendations from campaign analysis
    if (campaigns.length > 0) {
      const campaignPatterns = this.extractCampaignPatterns(campaigns);
      recommendations.push(...campaignPatterns);
    }

    // Sort by priority and confidence
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return b.confidence - a.confidence;
      })
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Private method: Extract patterns from campaigns
   */
  private extractCampaignPatterns(campaigns: any[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Team size analysis
    const teamSizes = campaigns.map(c => c.team_size).filter(Boolean);
    if (teamSizes.length > 2) {
      const avgTeamSize = Math.round(teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length);
      recommendations.push({
        type: 'team',
        title: 'Optimal Team Size',
        description: `Successful campaigns typically use ${avgTeamSize} team members`,
        confidence: Math.min(0.9, teamSizes.length / 10),
        impact: 15,
        evidence: `Based on ${teamSizes.length} similar successful campaigns`,
        priority: teamSizes.length > 5 ? 'high' : 'medium',
        implementation: `Assemble a team of ${avgTeamSize} members with complementary skills`
      });
    }

    // Timeline analysis
    const timelines = campaigns.map(c => c.timeline_days).filter(Boolean);
    if (timelines.length > 2) {
      const avgTimeline = Math.round(timelines.reduce((a, b) => a + b, 0) / timelines.length);
      recommendations.push({
        type: 'timeline',
        title: 'Optimal Timeline',
        description: `Similar campaigns succeed with ${avgTimeline}-day timelines`,
        confidence: Math.min(0.9, timelines.length / 10),
        impact: 20,
        evidence: `Based on ${timelines.length} similar campaigns`,
        priority: timelines.length > 5 ? 'high' : 'medium',
        implementation: `Plan for ${avgTimeline} days with appropriate milestones and buffers`
      });
    }

    return recommendations;
  }

  /**
   * Clean up old data and memory cache
   */
  private startCleanupTimer(): void {
    setInterval(async () => {
      try {
        if (!this.initialized) return;

        // Clean old sessions (inactive for 24 hours)
        await this.db.query(`
          DELETE FROM user_sessions 
          WHERE last_activity < NOW() - INTERVAL '24 hours'
        `);

        // Clean old events (keep 30 days)
        await this.db.query(`
          DELETE FROM learning_events 
          WHERE created_at < NOW() - INTERVAL '30 days'
        `);

        // Clean memory cache
        this.cleanMemoryCache();

        console.log('Learning engine cleanup completed');
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 3600000); // Every hour
  }

  /**
   * Clean memory cache of old entries
   */
  private cleanMemoryCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > 600000) { // 10 minutes
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }
}

// Singleton instance - will be initialized with database connection
export let learningEngine: SimpleLearningEngine | null = null;

export function initializeLearningEngine(database: any): SimpleLearningEngine {
  if (!learningEngine) {
    learningEngine = new SimpleLearningEngine(database);
  }
  return learningEngine;
}

export function getLearningEngine(): SimpleLearningEngine | null {
  return learningEngine;
}