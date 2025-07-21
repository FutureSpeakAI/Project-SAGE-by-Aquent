# Pragmatic Architecture for 100 Users

## Right-Sized Technical Approach

This architecture is designed for **100 concurrent users** with room to grow to **500-1000 users** without major changes. No over-engineering, just solid fundamentals.

## Core Requirements Analysis

### Scale Reality Check
- **100 users** = ~10-50 concurrent sessions at peak
- **Session data** = ~10MB per user × 100 users = ~1GB total
- **Events** = ~100 events/minute across all users = manageable with simple database
- **Learning data** = Thousands of campaigns over months, not millions per day

### Technical Constraints
- **Single server deployment** (can scale to 2-3 servers later)
- **PostgreSQL database** (existing Neon instance)
- **Redis for caching** (optional, can use in-memory initially)
- **No microservices** (monolithic is fine at this scale)

## Simplified Architecture

### Database Design (PostgreSQL - Existing)
```sql
-- Simple, efficient tables for 100 users
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(50),
    session_data JSONB,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Simple indexes for 100 users
    INDEX idx_session_id (session_id),
    INDEX idx_user_activity (user_id, last_activity),
    INDEX idx_last_activity (last_activity) -- For cleanup
);

-- Learning events - simple append-only table
CREATE TABLE learning_events (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Basic indexes sufficient for 100 users
    INDEX idx_session_events (session_id, created_at),
    INDEX idx_event_type (event_type, created_at)
);

-- Success patterns - no partitioning needed yet
CREATE TABLE success_patterns (
    id BIGSERIAL PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL,
    industries TEXT[] NOT NULL,
    conditions JSONB NOT NULL,
    outcomes JSONB NOT NULL,
    success_rate DECIMAL(5,4) NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL,
    sample_size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Simple indexes
    INDEX idx_pattern_type (pattern_type),
    INDEX idx_industries (industries),
    INDEX idx_success_rate (success_rate DESC)
);

-- Campaign data for cross-client learning
CREATE TABLE campaign_data (
    id BIGSERIAL PRIMARY KEY,
    campaign_id VARCHAR(100) UNIQUE NOT NULL,
    client_industry VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(100) NOT NULL,
    budget_range VARCHAR(50),
    timeline_days INTEGER,
    team_size INTEGER,
    objectives TEXT[],
    outcomes JSONB, -- success metrics when campaign completes
    context_data JSONB, -- market conditions, seasonality, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Indexes for learning queries
    INDEX idx_industry_type (client_industry, campaign_type),
    INDEX idx_completion (completed_at) WHERE completed_at IS NOT NULL,
    INDEX idx_success_lookup (client_industry, campaign_type, budget_range, completed_at)
);
```

### Application Architecture (Single Node.js Process)
```typescript
// Simple learning engine - no distributed systems needed
class SimpleLearningEngine {
  private db: PostgreSQLConnection;
  private cache: Map<string, CacheEntry>; // In-memory cache for 100 users

  constructor() {
    this.db = new PostgreSQLConnection(process.env.DATABASE_URL);
    this.cache = new Map();
    this.startCleanupTimer();
  }

  // Record learning event (simple database insert)
  async recordEvent(sessionId: string, eventType: string, eventData: any): Promise<void> {
    await this.db.query(`
      INSERT INTO learning_events (session_id, event_type, event_data)
      VALUES ($1, $2, $3)
    `, [sessionId, eventType, eventData]);

    // Update patterns if significant event
    if (this.isSignificantEvent(eventType)) {
      // Run in background - don't block user
      setImmediate(() => this.updatePatternsAsync(eventData));
    }
  }

  // Get recommendations (with simple caching)
  async getRecommendations(context: CampaignContext): Promise<Recommendation[]> {
    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first (sufficient for 100 users)
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minute cache
      return cached.value;
    }

    // Query database for similar campaigns
    const similarCampaigns = await this.db.query(`
      SELECT * FROM campaign_data 
      WHERE client_industry = $1 
        AND campaign_type = $2 
        AND completed_at IS NOT NULL
        AND (outcomes->>'success_score')::float > 7.0
      ORDER BY completed_at DESC 
      LIMIT 20
    `, [context.industry, context.campaignType]);

    // Simple pattern matching (no ML needed yet at this scale)
    const recommendations = this.generateRecommendations(similarCampaigns, context);

    // Cache result
    this.cache.set(cacheKey, {
      value: recommendations,
      timestamp: Date.now()
    });

    return recommendations;
  }

  // Simple pattern detection (no streaming needed)
  private async updatePatternsAsync(eventData: any): Promise<void> {
    try {
      // Batch process every 100 events to avoid overhead
      const eventCount = await this.getRecentEventCount();
      if (eventCount % 100 === 0) {
        await this.detectNewPatterns();
      }
    } catch (error) {
      console.error('Pattern update error:', error);
      // Don't fail user operations due to learning issues
    }
  }

  private async detectNewPatterns(): Promise<void> {
    // Simple pattern detection query
    const patterns = await this.db.query(`
      WITH successful_campaigns AS (
        SELECT 
          client_industry,
          campaign_type,
          budget_range,
          COUNT(*) as sample_size,
          AVG((outcomes->>'success_score')::float) as avg_success
        FROM campaign_data 
        WHERE completed_at IS NOT NULL
          AND completed_at > NOW() - INTERVAL '90 days'
        GROUP BY client_industry, campaign_type, budget_range
        HAVING COUNT(*) >= 3
          AND AVG((outcomes->>'success_score')::float) > 7.5
      )
      SELECT * FROM successful_campaigns
      WHERE avg_success > 8.0
    `);

    // Update patterns table
    for (const pattern of patterns) {
      await this.upsertPattern(pattern);
    }
  }

  // Clean up old data periodically
  private startCleanupTimer(): void {
    setInterval(async () => {
      try {
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
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 3600000); // Every hour
  }

  private cleanMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > 600000) { // 10 minutes
        this.cache.delete(key);
      }
    }
  }

  // Simple recommendation generation (no complex ML)
  private generateRecommendations(
    campaigns: any[], 
    context: CampaignContext
  ): Recommendation[] {
    if (campaigns.length === 0) return [];

    // Extract common successful patterns
    const patterns = this.extractPatterns(campaigns);
    
    // Generate recommendations based on patterns
    return patterns.map(pattern => ({
      type: 'strategy',
      title: pattern.title,
      description: pattern.description,
      confidence: pattern.confidence,
      impact: pattern.expectedImprovement,
      evidence: `Based on ${pattern.sampleSize} similar campaigns`
    }));
  }

  private extractPatterns(campaigns: any[]): any[] {
    // Simple pattern extraction - look for common elements in successful campaigns
    const teamSizes = campaigns.map(c => c.team_size).filter(Boolean);
    const timelines = campaigns.map(c => c.timeline_days).filter(Boolean);
    const objectives = campaigns.flatMap(c => c.objectives || []);

    const patterns = [];

    // Team size pattern
    if (teamSizes.length > 0) {
      const avgTeamSize = Math.round(teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length);
      patterns.push({
        title: 'Optimal Team Size',
        description: `Successful campaigns typically use ${avgTeamSize} team members`,
        confidence: Math.min(0.9, teamSizes.length / 10),
        expectedImprovement: 15,
        sampleSize: teamSizes.length
      });
    }

    // Timeline pattern
    if (timelines.length > 0) {
      const avgTimeline = Math.round(timelines.reduce((a, b) => a + b, 0) / timelines.length);
      patterns.push({
        title: 'Optimal Timeline',
        description: `Similar campaigns succeed with ${avgTimeline}-day timelines`,
        confidence: Math.min(0.9, timelines.length / 10),
        expectedImprovement: 20,
        sampleSize: timelines.length
      });
    }

    // Common objectives pattern
    const objectiveCounts = objectives.reduce((acc, obj) => {
      acc[obj] = (acc[obj] || 0) + 1;
      return acc;
    }, {});

    const topObjectives = Object.entries(objectiveCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3);

    if (topObjectives.length > 0) {
      patterns.push({
        title: 'Key Success Objectives',
        description: `Focus on: ${topObjectives.map((obj: any) => obj[0]).join(', ')}`,
        confidence: Math.min(0.8, objectives.length / 20),
        expectedImprovement: 25,
        sampleSize: campaigns.length
      });
    }

    return patterns;
  }
}

// Simple session management (no Redis cluster needed)
class SimpleSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private db: PostgreSQLConnection;

  constructor(db: PostgreSQLConnection) {
    this.db = db;
    this.loadActiveSessions();
    this.startPersistenceTimer();
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    // Check in-memory first
    let session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }

    // Load from database
    const result = await this.db.query(`
      SELECT session_data, last_activity 
      FROM user_sessions 
      WHERE session_id = $1
    `, [sessionId]);

    if (result.rows.length > 0) {
      session = {
        ...result.rows[0].session_data,
        sessionId,
        lastActivity: result.rows[0].last_activity
      };
      this.sessions.set(sessionId, session);
      return session;
    }

    return null;
  }

  async saveSession(sessionId: string, sessionData: SessionData): Promise<void> {
    sessionData.lastActivity = new Date();
    this.sessions.set(sessionId, sessionData);

    // Immediate database save for important data
    if (sessionData.hasImportantChanges) {
      await this.persistSession(sessionId, sessionData);
    }
  }

  private async loadActiveSessions(): Promise<void> {
    // Load sessions active in last 2 hours on startup
    const results = await this.db.query(`
      SELECT session_id, session_data, last_activity
      FROM user_sessions 
      WHERE last_activity > NOW() - INTERVAL '2 hours'
    `);

    for (const row of results.rows) {
      this.sessions.set(row.session_id, {
        ...row.session_data,
        sessionId: row.session_id,
        lastActivity: row.last_activity
      });
    }
  }

  private startPersistenceTimer(): void {
    // Save all sessions to database every 5 minutes
    setInterval(async () => {
      for (const [sessionId, session] of this.sessions.entries()) {
        try {
          await this.persistSession(sessionId, session);
        } catch (error) {
          console.error(`Failed to persist session ${sessionId}:`, error);
        }
      }
    }, 300000); // 5 minutes
  }

  private async persistSession(sessionId: string, session: SessionData): Promise<void> {
    await this.db.query(`
      INSERT INTO user_sessions (session_id, user_id, session_data, last_activity)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (session_id) 
      DO UPDATE SET 
        session_data = EXCLUDED.session_data,
        last_activity = EXCLUDED.last_activity
    `, [sessionId, session.userId, session, session.lastActivity]);
  }
}
```

### Performance Targets (100 Users)
```typescript
interface RealisticPerformanceTargets {
  concurrent_users: 100;
  peak_concurrent_sessions: 50;
  events_per_minute: 100; // Across all users
  predictions_per_minute: 50;
  
  response_times: {
    prediction: '< 200ms'; // Simple database queries
    pattern_matching: '< 100ms'; // In-memory + cache
    session_load: '< 50ms'; // Memory + database
    recommendation: '< 300ms'; // Database aggregation
  };
  
  storage_requirements: {
    database_size: '< 10GB'; // Including all learning data
    memory_usage: '< 2GB'; // Application + caches
    session_storage: '< 100MB'; // All active sessions
  };
  
  availability: {
    uptime: '99.5%'; // Realistic for single server
    backup_frequency: 'daily';
    recovery_time: '< 30 minutes';
  };
}
```

### Deployment Strategy (Simple)
```typescript
// Single server deployment
interface SimpleDeployment {
  server: {
    type: 'Single Replit deployment';
    resources: 'Standard Replit resources';
    scaling: 'Vertical scaling if needed';
    monitoring: 'Basic Replit monitoring + custom logs';
  };
  
  database: {
    type: 'Existing Neon PostgreSQL';
    backup: 'Neon automatic backups';
    scaling: 'Increase connection pool if needed';
  };
  
  caching: {
    type: 'In-memory Map (JavaScript)';
    fallback: 'Add Redis if needed later';
    cleanup: 'Automatic memory management';
  };
  
  monitoring: {
    logs: 'Console logs with structured format';
    metrics: 'Simple counters and timers';
    alerts: 'Basic error detection';
    health: 'Simple /health endpoint';
  };
}
```

## Implementation Plan (4 Weeks)

### Week 1: Database Setup
- Add learning tables to existing PostgreSQL
- Create simple indexes for common queries  
- Add basic data retention policies
- Test with sample campaign data

### Week 2: Learning Engine
- Build SimpleLearningEngine class
- Add pattern detection logic
- Create recommendation system
- Add background processing for updates

### Week 3: Session Management  
- Build SimpleSessionManager
- Add persistence and cleanup
- Integrate with existing tab system
- Add cross-client learning hooks

### Week 4: Integration & Testing
- Connect learning engine to existing workflows
- Add recommendations to UI
- Performance testing with simulated 100 users
- Documentation and monitoring

This approach is **exactly right-sized** for 100 users while maintaining clean architecture that can grow naturally to 500-1000 users when needed.