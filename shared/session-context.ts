// Shared session context types and utilities for cross-tab persistence

export interface SessionContext {
  id: string;
  projectName: string;
  brand: string;
  industry: string;
  targetAudience: string;
  campaignObjectives: string[];
  keyMessages: string[];
  researchData: ResearchData[];
  generatedContent: GeneratedContent[];
  visualAssets: VisualAsset[];
  briefingData: BriefingData;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchData {
  type: 'competitor_analysis' | 'market_research' | 'brand_analysis' | 'design_trends' | 'campaign_analysis';
  query: string;
  results: string;
  sources: string[];
  timestamp: Date;
  reasoning?: {
    queries: number;
    completeness: number;
    processingTime: number;
  };
}

export interface GeneratedContent {
  type: 'headline' | 'body_copy' | 'social_post' | 'email' | 'blog_post' | 'script';
  content: string;
  persona: string;
  model: string;
  prompt: string;
  timestamp: Date;
  metadata?: {
    wordCount: number;
    tone: string;
    platform?: string;
  };
}

export interface VisualAsset {
  id: string;
  type: 'hero_image' | 'social_graphic' | 'banner' | 'logo' | 'infographic';
  prompt: string;
  url: string;
  model: string;
  dimensions: string;
  timestamp: Date;
  projectContext: string;
}

export interface BriefingData {
  brandGuidelines: string;
  campaignGoals: string;
  keyInsights: string[];
  recommendedApproaches: string[];
  deliverables: string[];
  timeline: string;
  budget?: string;
  successMetrics: string[];
}

// Session context management utilities
export class SessionContextManager {
  private static instance: SessionContextManager;
  private currentContext: SessionContext | null = null;
  private listeners: Array<(context: SessionContext | null) => void> = [];

  static getInstance(): SessionContextManager {
    if (!SessionContextManager.instance) {
      SessionContextManager.instance = new SessionContextManager();
    }
    return SessionContextManager.instance;
  }

  getCurrentContext(): SessionContext | null {
    return this.currentContext;
  }

  setContext(context: SessionContext | null): void {
    this.currentContext = context;
    this.notifyListeners();
    this.persistToLocalStorage();
  }

  updateContext(updates: Partial<SessionContext>): void {
    if (this.currentContext) {
      this.currentContext = {
        ...this.currentContext,
        ...updates,
        updatedAt: new Date()
      };
      this.notifyListeners();
      this.persistToLocalStorage();
    }
  }

  addResearchData(research: ResearchData): void {
    if (this.currentContext) {
      this.currentContext.researchData.push(research);
      this.updateContext({});
    }
  }

  addGeneratedContent(content: GeneratedContent): void {
    if (this.currentContext) {
      this.currentContext.generatedContent.push(content);
      this.updateContext({});
    }
  }

  addVisualAsset(asset: VisualAsset): void {
    if (this.currentContext) {
      this.currentContext.visualAssets.push(asset);
      this.updateContext({});
    }
  }

  updateBriefingData(briefing: Partial<BriefingData>): void {
    if (this.currentContext) {
      this.currentContext.briefingData = {
        ...this.currentContext.briefingData,
        ...briefing
      };
      this.updateContext({});
    }
  }

  subscribe(listener: (context: SessionContext | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentContext));
  }

  private persistToLocalStorage(): void {
    if (this.currentContext) {
      localStorage.setItem('sage_session_context', JSON.stringify(this.currentContext));
    } else {
      localStorage.removeItem('sage_session_context');
    }
  }

  loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('sage_session_context');
      if (stored) {
        const context = JSON.parse(stored);
        // Convert date strings back to Date objects
        context.createdAt = new Date(context.createdAt);
        context.updatedAt = new Date(context.updatedAt);
        context.researchData = context.researchData.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        }));
        context.generatedContent = context.generatedContent.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp)
        }));
        context.visualAssets = context.visualAssets.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
        
        this.currentContext = context;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load session context from localStorage:', error);
    }
  }

  createNewSession(projectName: string, brand: string, industry: string): SessionContext {
    const newContext: SessionContext = {
      id: `session_${Date.now()}`,
      projectName,
      brand,
      industry,
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
    };

    this.setContext(newContext);
    return newContext;
  }

  clearSession(): void {
    this.setContext(null);
  }

  exportSession(): string {
    if (!this.currentContext) {
      throw new Error('No active session to export');
    }
    return JSON.stringify(this.currentContext, null, 2);
  }

  importSession(sessionData: string): void {
    try {
      const context = JSON.parse(sessionData);
      // Validate structure and convert dates
      context.createdAt = new Date(context.createdAt);
      context.updatedAt = new Date(context.updatedAt);
      this.setContext(context);
    } catch (error) {
      throw new Error('Invalid session data format');
    }
  }
}

// Utility functions for cross-tab context sharing
export function getContextForPrompt(context: SessionContext | null): string {
  if (!context) return '';

  let promptContext = `Project: ${context.projectName} | Brand: ${context.brand} | Industry: ${context.industry}`;
  
  if (context.targetAudience) {
    promptContext += ` | Target Audience: ${context.targetAudience}`;
  }
  
  if (context.campaignObjectives.length > 0) {
    promptContext += ` | Objectives: ${context.campaignObjectives.join(', ')}`;
  }
  
  if (context.keyMessages.length > 0) {
    promptContext += ` | Key Messages: ${context.keyMessages.join(', ')}`;
  }
  
  // Add recent research insights
  if (context.researchData.length > 0) {
    const recentResearch = context.researchData.slice(-2);
    promptContext += ` | Recent Research: ${recentResearch.map(r => r.type).join(', ')}`;
  }

  return promptContext;
}

export function buildCampaignSummary(context: SessionContext): string {
  if (!context) return 'No active campaign context';

  let summary = `# ${context.projectName} Campaign Summary\n\n`;
  summary += `**Brand:** ${context.brand}\n`;
  summary += `**Industry:** ${context.industry}\n`;
  
  if (context.targetAudience) {
    summary += `**Target Audience:** ${context.targetAudience}\n`;
  }
  
  if (context.campaignObjectives.length > 0) {
    summary += `\n**Campaign Objectives:**\n${context.campaignObjectives.map(obj => `- ${obj}`).join('\n')}\n`;
  }
  
  if (context.researchData.length > 0) {
    summary += `\n**Research Conducted:**\n`;
    context.researchData.forEach(research => {
      summary += `- ${research.type}: ${research.query}\n`;
    });
  }
  
  if (context.generatedContent.length > 0) {
    summary += `\n**Content Generated:**\n`;
    context.generatedContent.forEach(content => {
      summary += `- ${content.type}: ${content.content.substring(0, 100)}...\n`;
    });
  }
  
  if (context.visualAssets.length > 0) {
    summary += `\n**Visual Assets:** ${context.visualAssets.length} assets created\n`;
  }

  return summary;
}