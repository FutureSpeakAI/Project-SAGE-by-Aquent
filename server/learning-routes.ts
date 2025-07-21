/**
 * Learning Engine API Routes
 * Handles cross-client learning and recommendations
 */

import { Router } from 'express';
import { getLearningEngine } from '../shared/learning-engine';
import type { LearningEvent, CampaignData } from '../shared/learning-engine';
import type { SessionContext } from '../shared/session-context';

export const learningRouter = Router();

// Record a learning event
learningRouter.post('/events', async (req, res) => {
  try {
    const learningEngine = getLearningEngine();
    if (!learningEngine) {
      return res.status(503).json({ error: 'Learning engine not initialized' });
    }

    const event: LearningEvent = req.body;
    
    // Validate event data
    if (!event.sessionId || !event.eventType || !event.eventData) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, eventType, eventData' 
      });
    }

    await learningEngine.recordEvent(event);
    
    res.json({ success: true, message: 'Learning event recorded' });
  } catch (error) {
    console.error('Failed to record learning event:', error);
    res.status(500).json({ error: 'Failed to record learning event' });
  }
});

// Record campaign data
learningRouter.post('/campaigns', async (req, res) => {
  try {
    const learningEngine = getLearningEngine();
    if (!learningEngine) {
      return res.status(503).json({ error: 'Learning engine not initialized' });
    }

    const campaign: CampaignData = req.body;
    
    // Validate campaign data
    if (!campaign.campaignId || !campaign.clientIndustry || !campaign.campaignType) {
      return res.status(400).json({ 
        error: 'Missing required fields: campaignId, clientIndustry, campaignType' 
      });
    }

    await learningEngine.recordCampaign(campaign);
    
    res.json({ success: true, message: 'Campaign data recorded' });
  } catch (error) {
    console.error('Failed to record campaign data:', error);
    res.status(500).json({ error: 'Failed to record campaign data' });
  }
});

// Get recommendations for current context
learningRouter.post('/recommendations', async (req, res) => {
  try {
    const learningEngine = getLearningEngine();
    if (!learningEngine) {
      return res.status(503).json({ error: 'Learning engine not initialized' });
    }

    const context: SessionContext = req.body;
    
    // Validate context
    if (!context.industry) {
      return res.status(400).json({ 
        error: 'Context must include industry' 
      });
    }

    const recommendations = await learningEngine.getRecommendations(context);
    
    res.json({ 
      success: true, 
      recommendations,
      count: recommendations.length 
    });
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get industry insights
learningRouter.get('/insights/:industry', async (req, res) => {
  try {
    const learningEngine = getLearningEngine();
    if (!learningEngine) {
      return res.status(503).json({ error: 'Learning engine not initialized' });
    }

    const { industry } = req.params;
    
    if (!industry) {
      return res.status(400).json({ error: 'Industry parameter required' });
    }

    const insights = await learningEngine.getIndustryInsights(industry);
    
    res.json({ 
      success: true, 
      industry,
      insights 
    });
  } catch (error) {
    console.error('Failed to get industry insights:', error);
    res.status(500).json({ error: 'Failed to get industry insights' });
  }
});

// Health check for learning engine
learningRouter.get('/health', async (req, res) => {
  try {
    const learningEngine = getLearningEngine();
    
    if (!learningEngine) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Learning engine not initialized' 
      });
    }

    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      message: 'Learning engine operational' 
    });
  } catch (error) {
    console.error('Learning engine health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Learning engine health check failed' 
    });
  }
});

// Get learning statistics (for monitoring)
learningRouter.get('/stats', async (req, res) => {
  try {
    const learningEngine = getLearningEngine();
    if (!learningEngine) {
      return res.status(503).json({ error: 'Learning engine not initialized' });
    }

    // This would be implemented in the learning engine to provide stats
    // For now, return basic info
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      message: 'Learning statistics endpoint ready'
    });
  } catch (error) {
    console.error('Failed to get learning stats:', error);
    res.status(500).json({ error: 'Failed to get learning stats' });
  }
});