/**
 * Enhanced Context Manager - Backwards Compatible Learning Integration
 * Preserves all existing workflows while adding learning capabilities
 */

import { SessionContext, SessionContextManager, ResearchData, GeneratedContent, VisualAsset, BriefingData } from './session-context';
import { LearningSystemManager, LearningEvent, Recommendation } from './learning-system';

// Enhanced interfaces that extend existing ones without breaking changes
export interface EnhancedSessionContext extends SessionContext {
  // All existing fields preserved
  // Learning metadata stored separately to avoid conflicts
  _learningMetadata?: {
    workflowStage: WorkflowStage;
    stageProgress: number;
    timeInStage: number;
    lastAction: string;
    sessionStartTime: Date;
    interactionCount: number;
    userEfficiencyScore?: number;
  };
}

export interface WorkflowStage {
  current: 'discovery' | 'research' | 'brief_creation' | 'content_generation' | 'visual_creation' | 'review' | 'finalization';
  completedStages: string[];
  nextSuggestedStage?: string;
  stageStartTime: Date;
}

export interface WorkflowPosition {
  tabId: string;
  sectionId?: string;
  formProgress?: number;
  lastModified: Date;
}

export interface UserWorkflowState {
  currentPosition: WorkflowPosition;
  recentPositions: WorkflowPosition[];
  workflowPath: string[];
  timeSpentPerTab: Record<string, number>;
  preferredWorkflowOrder: string[];
}

// Enhanced Session Context Manager - 100% Backwards Compatible
export class EnhancedSessionContextManager extends SessionContextManager {
  private learningSystem: LearningSystemManager;
  private workflowTracker: WorkflowTracker;
  private isLearningEnabled: boolean = true;
  private userWorkflowState: UserWorkflowState;

  constructor() {
    super();
    this.learningSystem = new LearningSystemManager();
    this.workflowTracker = new WorkflowTracker();
    this.userWorkflowState = this.initializeWorkflowState();
    this.setupLearningObservers();
    this.loadLearningPreferences();
  }

  // Override parent methods while preserving exact behavior
  setContext(context: SessionContext | null): void {
    // Call parent method first - preserves exact existing behavior
    super.setContext(context);
    
    // Add learning layer without affecting core functionality
    if (context && this.isLearningEnabled) {
      this.recordContextChange(context, 'session_set');
    }
  }

  updateContext(updates: Partial<SessionContext>): void {
    // Call parent method first - preserves exact existing behavior
    super.updateContext(updates);
    
    // Add learning layer
    if (this.isLearningEnabled) {
      const currentContext = this.getCurrentContext();
      if (currentContext) {
        this.recordContextChange(currentContext, 'context_updated', updates);
      }
    }
  }

  addResearchData(research: ResearchData): void {
    // Call parent method first - preserves exact existing behavior
    super.addResearchData(research);
    
    // Add learning layer
    if (this.isLearningEnabled) {
      this.recordResearchAction(research);
      this.workflowTracker.updateStage('research');
    }
  }

  addGeneratedContent(content: GeneratedContent): void {
    // Call parent method first - preserves exact existing behavior
    super.addGeneratedContent(content);
    
    // Add learning layer
    if (this.isLearningEnabled) {
      this.recordContentGeneration(content);
      this.workflowTracker.updateStage('content_generation');
    }
  }

  addVisualAsset(asset: VisualAsset): void {
    // Call parent method first - preserves exact existing behavior
    super.addVisualAsset(asset);
    
    // Add learning layer
    if (this.isLearningEnabled) {
      this.recordVisualCreation(asset);
      this.workflowTracker.updateStage('visual_creation');
    }
  }

  updateBriefingData(briefing: Partial<BriefingData>): void {
    // Call parent method first - preserves exact existing behavior
    super.updateBriefingData(briefing);
    
    // Add learning layer
    if (this.isLearningEnabled) {
      this.recordBriefingUpdate(briefing);
      this.workflowTracker.updateStage('brief_creation');
    }
  }

  createNewSession(projectName: string, brand: string, industry: string): SessionContext {
    // Call parent method first - preserves exact existing behavior
    const session = super.createNewSession(projectName, brand, industry);
    
    // Add learning layer
    if (this.isLearningEnabled) {
      this.recordSessionStart(session);
      this.workflowTracker.reset();
      this.workflowTracker.updateStage('discovery');
    }
    
    return session;
  }

  // New methods that don't interfere with existing functionality
  getWorkflowRecommendations(): Recommendation[] {
    if (!this.isLearningEnabled) return [];
    
    const currentContext = this.getCurrentContext();
    if (!currentContext) return [];
    
    return this.learningSystem.getRecommendations(currentContext);
  }

  getWorkflowInsights(): WorkflowInsights {
    const currentStage = this.workflowTracker.getCurrentStage();
    const progress = this.workflowTracker.getProgress();
    const recommendations = this.getWorkflowRecommendations();
    
    return {
      currentStage: currentStage.current,
      progress: progress.overall,
      stageProgress: progress.currentStage,
      timeInCurrentStage: Date.now() - currentStage.stageStartTime.getTime(),
      recommendations: recommendations.slice(0, 3), // Top 3 recommendations
      nextSuggestedAction: this.getNextSuggestedAction(),
      userEfficiencyScore: this.calculateEfficiencyScore()
    };
  }

  trackTabSwitch(fromTab: string, toTab: string): void {
    if (!this.isLearningEnabled) return;
    
    this.userWorkflowState.currentPosition = {
      tabId: toTab,
      lastModified: new Date()
    };
    
    this.userWorkflowState.workflowPath.push(toTab);
    this.userWorkflowState.recentPositions.unshift(this.userWorkflowState.currentPosition);
    
    // Keep only last 10 positions
    if (this.userWorkflowState.recentPositions.length > 10) {
      this.userWorkflowState.recentPositions = this.userWorkflowState.recentPositions.slice(0, 10);
    }
    
    this.recordTabNavigation(fromTab, toTab);
  }

  trackFormProgress(tabId: string, sectionId: string, progress: number): void {
    if (!this.isLearningEnabled) return;
    
    this.userWorkflowState.currentPosition = {
      tabId,
      sectionId,
      formProgress: progress,
      lastModified: new Date()
    };
    
    this.recordFormProgress(tabId, sectionId, progress);
  }

  enableLearning(): void {
    this.isLearningEnabled = true;
    localStorage.setItem('sage_learning_enabled', 'true');
  }

  disableLearning(): void {
    this.isLearningEnabled = false;
    localStorage.setItem('sage_learning_enabled', 'false');
  }

  isLearningActive(): boolean {
    return this.isLearningEnabled;
  }

  exportWorkflowAnalytics(): WorkflowAnalytics {
    return {
      userWorkflowState: this.userWorkflowState,
      workflowInsights: this.getWorkflowInsights(),
      learningData: this.learningSystem.exportLearningData(),
      systemInsights: this.learningSystem.getSystemInsights()
    };
  }

  // Private learning methods
  private setupLearningObservers(): void {
    // Observe parent class context changes without modifying them
    this.subscribe((context) => {
      if (context && this.isLearningEnabled) {
        this.updateWorkflowMetadata(context);
      }
    });
  }

  private loadLearningPreferences(): void {
    const enabled = localStorage.getItem('sage_learning_enabled');
    this.isLearningEnabled = enabled !== 'false'; // Default to enabled
    
    const workflowState = localStorage.getItem('sage_workflow_state');
    if (workflowState) {
      try {
        this.userWorkflowState = JSON.parse(workflowState);
      } catch (error) {
        console.warn('Failed to load workflow state:', error);
      }
    }
  }

  private initializeWorkflowState(): UserWorkflowState {
    return {
      currentPosition: {
        tabId: 'free-prompt', // Default starting tab
        lastModified: new Date()
      },
      recentPositions: [],
      workflowPath: ['free-prompt'],
      timeSpentPerTab: {},
      preferredWorkflowOrder: ['free-prompt', 'briefing', 'content', 'visual']
    };
  }

  private recordContextChange(context: SessionContext, action: string, details?: any): void {
    const event: LearningEvent = {
      id: `context_${Date.now()}`,
      sessionId: context.id,
      timestamp: new Date(),
      eventType: 'user_action',
      context,
      details: { action, ...details }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private recordSessionStart(session: SessionContext): void {
    const event: LearningEvent = {
      id: `session_start_${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date(),
      eventType: 'user_action',
      context: session,
      details: { action: 'session_created', brand: session.brand, industry: session.industry }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private recordResearchAction(research: ResearchData): void {
    const context = this.getCurrentContext();
    if (!context) return;
    
    const event: LearningEvent = {
      id: `research_${Date.now()}`,
      sessionId: context.id,
      timestamp: new Date(),
      eventType: 'system_response',
      context,
      details: { action: 'research_added', type: research.type, queryLength: research.query.length },
      outcome: {
        success: research.results.length > 0,
        performanceMetrics: { resultLength: research.results.length }
      }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private recordContentGeneration(content: GeneratedContent): void {
    const context = this.getCurrentContext();
    if (!context) return;
    
    const event: LearningEvent = {
      id: `content_${Date.now()}`,
      sessionId: context.id,
      timestamp: new Date(),
      eventType: 'system_response',
      context,
      details: { 
        action: 'content_generated', 
        type: content.type, 
        persona: content.persona,
        model: content.model,
        wordCount: content.metadata?.wordCount
      },
      outcome: {
        success: content.content.length > 0,
        performanceMetrics: { 
          contentLength: content.content.length,
          wordCount: content.metadata?.wordCount || 0
        }
      }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private recordVisualCreation(asset: VisualAsset): void {
    const context = this.getCurrentContext();
    if (!context) return;
    
    const event: LearningEvent = {
      id: `visual_${Date.now()}`,
      sessionId: context.id,
      timestamp: new Date(),
      eventType: 'system_response',
      context,
      details: { 
        action: 'visual_created', 
        type: asset.type,
        model: asset.model,
        dimensions: asset.dimensions
      },
      outcome: {
        success: asset.url.length > 0,
        performanceMetrics: { hasUrl: asset.url.length > 0 ? 1 : 0 }
      }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private recordBriefingUpdate(briefing: Partial<BriefingData>): void {
    const context = this.getCurrentContext();
    if (!context) return;
    
    const event: LearningEvent = {
      id: `briefing_${Date.now()}`,
      sessionId: context.id,
      timestamp: new Date(),
      eventType: 'user_action',
      context,
      details: { 
        action: 'briefing_updated',
        fieldsUpdated: Object.keys(briefing),
        hasGoals: !!briefing.campaignGoals,
        hasGuidelines: !!briefing.brandGuidelines
      }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private recordTabNavigation(fromTab: string, toTab: string): void {
    const context = this.getCurrentContext();
    if (!context) return;
    
    const event: LearningEvent = {
      id: `nav_${Date.now()}`,
      sessionId: context.id,
      timestamp: new Date(),
      eventType: 'user_action',
      context,
      details: { action: 'tab_navigation', fromTab, toTab }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private recordFormProgress(tabId: string, sectionId: string, progress: number): void {
    const context = this.getCurrentContext();
    if (!context) return;
    
    const event: LearningEvent = {
      id: `form_${Date.now()}`,
      sessionId: context.id,
      timestamp: new Date(),
      eventType: 'user_action',
      context,
      details: { action: 'form_progress', tabId, sectionId, progress }
    };
    
    this.learningSystem.recordEvent(event);
  }

  private updateWorkflowMetadata(context: SessionContext): void {
    // Store workflow state
    localStorage.setItem('sage_workflow_state', JSON.stringify(this.userWorkflowState));
  }

  private getNextSuggestedAction(): string {
    const currentStage = this.workflowTracker.getCurrentStage();
    const context = this.getCurrentContext();
    
    if (!context) return 'Create a new campaign';
    
    switch (currentStage.current) {
      case 'discovery':
        return context.brand ? 'Start research on your brand' : 'Define your brand and industry';
      case 'research':
        return 'Create a comprehensive brief';
      case 'brief_creation':
        return 'Generate marketing content';
      case 'content_generation':
        return 'Create visual assets';
      case 'visual_creation':
        return 'Review and finalize campaign';
      case 'review':
        return 'Export and share your campaign';
      default:
        return 'Continue building your campaign';
    }
  }

  private calculateEfficiencyScore(): number {
    // Simple efficiency calculation based on workflow patterns
    const workflowPath = this.userWorkflowState.workflowPath;
    const uniqueTabs = new Set(workflowPath).size;
    const totalSwitches = workflowPath.length;
    
    // Higher score for more focused workflow (fewer tab switches)
    return uniqueTabs > 0 ? Math.max(0.1, 1 - (totalSwitches - uniqueTabs) / totalSwitches) : 0.5;
  }
}

// Workflow tracking utilities
class WorkflowTracker {
  private currentStage: WorkflowStage;
  private stageHistory: Array<{ stage: string; duration: number }> = [];

  constructor() {
    this.currentStage = {
      current: 'discovery',
      completedStages: [],
      stageStartTime: new Date()
    };
  }

  updateStage(newStage: WorkflowStage['current']): void {
    if (this.currentStage.current === newStage) return;
    
    // Record time spent in previous stage
    const timeInStage = Date.now() - this.currentStage.stageStartTime.getTime();
    this.stageHistory.push({
      stage: this.currentStage.current,
      duration: timeInStage
    });
    
    // Update to new stage
    this.currentStage.completedStages.push(this.currentStage.current);
    this.currentStage.current = newStage;
    this.currentStage.stageStartTime = new Date();
    
    // Suggest next stage
    this.currentStage.nextSuggestedStage = this.getNextStage(newStage);
  }

  getCurrentStage(): WorkflowStage {
    return this.currentStage;
  }

  getProgress(): { overall: number; currentStage: number } {
    const totalStages = 6; // discovery, research, brief_creation, content_generation, visual_creation, review
    const completedStages = this.currentStage.completedStages.length;
    
    return {
      overall: Math.min(1, (completedStages + 0.5) / totalStages), // +0.5 for current stage in progress
      currentStage: 0.5 // Assume 50% progress in current stage unless we have more detailed tracking
    };
  }

  reset(): void {
    this.currentStage = {
      current: 'discovery',
      completedStages: [],
      stageStartTime: new Date()
    };
    this.stageHistory = [];
  }

  private getNextStage(current: WorkflowStage['current']): string {
    const stageOrder: WorkflowStage['current'][] = [
      'discovery', 'research', 'brief_creation', 'content_generation', 'visual_creation', 'review', 'finalization'
    ];
    
    const currentIndex = stageOrder.indexOf(current);
    return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : 'finalization';
  }
}

// Type definitions for new interfaces
export interface WorkflowInsights {
  currentStage: string;
  progress: number;
  stageProgress: number;
  timeInCurrentStage: number;
  recommendations: Recommendation[];
  nextSuggestedAction: string;
  userEfficiencyScore: number;
}

export interface WorkflowAnalytics {
  userWorkflowState: UserWorkflowState;
  workflowInsights: WorkflowInsights;
  learningData: any;
  systemInsights: any;
}

// Export enhanced manager as drop-in replacement
export const enhancedSessionManager = new EnhancedSessionContextManager();

// Export factory function for easy migration
export function createEnhancedSessionManager(): EnhancedSessionContextManager {
  return new EnhancedSessionContextManager();
}

// Compatibility layer - existing code continues to work
export { SessionContext, ResearchData, GeneratedContent, VisualAsset, BriefingData } from './session-context';