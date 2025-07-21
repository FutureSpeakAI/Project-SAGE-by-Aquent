/**
 * Learning Agent System - Core Implementation
 * Transforms Sage into a continuously learning system
 */

import { SessionContext, ResearchData } from './session-context';

// Knowledge Graph Core Types
export interface KnowledgeNode {
  id: string;
  type: 'brand' | 'industry' | 'strategy' | 'audience' | 'content' | 'outcome' | 'pattern';
  data: Record<string, any>;
  relationships: Relationship[];
  confidence: number;
  lastUpdated: Date;
  usageCount: number;
  successRate: number;
  createdFrom: string; // session ID that created this node
}

export interface Relationship {
  targetNodeId: string;
  type: 'relates_to' | 'caused_by' | 'improved_by' | 'conflicts_with' | 'similar_to' | 'precedes';
  strength: number;
  evidence: string[];
  confidence: number;
  lastObserved: Date;
}

export interface PatternSignature {
  id: string;
  type: 'success' | 'failure' | 'optimization' | 'preference';
  conditions: ConditionSet;
  outcomes: OutcomeSet;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  sessionsObserved: string[];
}

export interface ConditionSet {
  brand?: string;
  industry?: string;
  campaignType?: string;
  audienceSegments?: string[];
  contentTypes?: string[];
  contextSize?: number;
  workflowStage?: string;
  timeOfDay?: string;
  userBehavior?: string[];
}

export interface OutcomeSet {
  success: boolean;
  performanceMetrics: Record<string, number>;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  executionTime?: number;
  errorType?: string;
  quality?: number;
  efficiency?: number;
}

export interface LearningEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  eventType: 'user_action' | 'system_response' | 'outcome' | 'feedback';
  context: SessionContext;
  details: Record<string, any>;
  outcome?: OutcomeSet;
}

// Knowledge Graph Engine
export class KnowledgeGraphEngine {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private nodesByType: Map<string, Set<string>> = new Map();
  private reverseRelationships: Map<string, Set<string>> = new Map();

  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
    
    if (!this.nodesByType.has(node.type)) {
      this.nodesByType.set(node.type, new Set());
    }
    this.nodesByType.get(node.type)!.add(node.id);
  }

  linkNodes(nodeId1: string, nodeId2: string, relationship: Relationship): void {
    const node1 = this.nodes.get(nodeId1);
    if (node1) {
      const existingRel = node1.relationships.find(r => r.targetNodeId === nodeId2 && r.type === relationship.type);
      if (existingRel) {
        // Strengthen existing relationship
        existingRel.strength = Math.min(1.0, existingRel.strength + 0.1);
        existingRel.lastObserved = new Date();
        existingRel.evidence.push(...relationship.evidence);
      } else {
        node1.relationships.push(relationship);
      }
    }

    // Update reverse relationships for efficient queries
    if (!this.reverseRelationships.has(nodeId2)) {
      this.reverseRelationships.set(nodeId2, new Set());
    }
    this.reverseRelationships.get(nodeId2)!.add(nodeId1);
  }

  findNodesByType(type: string): KnowledgeNode[] {
    const nodeIds = this.nodesByType.get(type) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)!).filter(Boolean);
  }

  findRelatedNodes(nodeId: string, relationshipType?: string): KnowledgeNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    const relatedIds = node.relationships
      .filter(r => !relationshipType || r.type === relationshipType)
      .map(r => r.targetNodeId);

    return relatedIds.map(id => this.nodes.get(id)!).filter(Boolean);
  }

  queryPattern(brand: string, industry: string, contentType?: string): KnowledgeNode[] {
    const brandNodes = this.findNodesByType('brand').filter(n => n.data.name === brand);
    const industryNodes = this.findNodesByType('industry').filter(n => n.data.name === industry);
    
    const results: KnowledgeNode[] = [];
    
    // Find patterns that connect these elements
    for (const brandNode of brandNodes) {
      for (const industryNode of industryNodes) {
        const commonRelated = this.findCommonRelatedNodes(brandNode.id, industryNode.id);
        results.push(...commonRelated);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private findCommonRelatedNodes(nodeId1: string, nodeId2: string): KnowledgeNode[] {
    const related1 = new Set(this.findRelatedNodes(nodeId1).map(n => n.id));
    const related2 = new Set(this.findRelatedNodes(nodeId2).map(n => n.id));
    
    const common: string[] = [];
    for (const id of related1) {
      if (related2.has(id)) {
        common.push(id);
      }
    }

    return common.map(id => this.nodes.get(id)!).filter(Boolean);
  }

  updateNodePerformance(nodeId: string, outcome: OutcomeSet): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.usageCount++;
      node.successRate = (node.successRate * (node.usageCount - 1) + (outcome.success ? 1 : 0)) / node.usageCount;
      node.lastUpdated = new Date();
      
      // Adjust confidence based on success rate and usage
      node.confidence = Math.min(1.0, node.successRate * Math.log(node.usageCount + 1) / 5);
    }
  }

  getHighConfidenceNodes(minConfidence: number = 0.7): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(n => n.confidence >= minConfidence);
  }

  exportGraph(): object {
    return {
      nodes: Array.from(this.nodes.values()),
      metadata: {
        totalNodes: this.nodes.size,
        nodeTypes: Array.from(this.nodesByType.keys()),
        exportTime: new Date()
      }
    };
  }

  importGraph(data: any): void {
    if (data.nodes) {
      for (const node of data.nodes) {
        this.addNode(node);
      }
    }
  }
}

// Pattern Recognition Engine
export class PatternRecognitionEngine {
  private patterns: Map<string, PatternSignature> = new Map();
  private events: LearningEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events

  addEvent(event: LearningEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    this.detectPatternsFromEvent(event);
  }

  private detectPatternsFromEvent(event: LearningEvent): void {
    // Group events by session to detect session-level patterns
    const sessionEvents = this.events.filter(e => e.sessionId === event.sessionId);
    
    if (sessionEvents.length >= 3) {
      this.detectWorkflowPatterns(sessionEvents);
      this.detectPreferencePatterns(sessionEvents);
      this.detectPerformancePatterns(sessionEvents);
    }

    // Cross-session pattern detection
    if (this.events.length >= 10) {
      this.detectCrossSessionPatterns();
    }
  }

  private detectWorkflowPatterns(sessionEvents: LearningEvent[]): void {
    const sequences = sessionEvents.map(e => e.eventType).join('->');
    const patternId = `workflow_${this.hashString(sequences)}`;
    
    const existingPattern = this.patterns.get(patternId);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = new Date();
      existingPattern.sessionsObserved.push(sessionEvents[0].sessionId);
    } else {
      const newPattern: PatternSignature = {
        id: patternId,
        type: 'optimization',
        conditions: {
          workflowStage: sessionEvents[0].context.briefingData.campaignGoals ? 'briefing' : 'discovery'
        },
        outcomes: {
          success: sessionEvents.some(e => e.outcome?.success),
          performanceMetrics: { sequenceLength: sessionEvents.length }
        },
        frequency: 1,
        confidence: 0.1,
        lastSeen: new Date(),
        sessionsObserved: [sessionEvents[0].sessionId]
      };
      this.patterns.set(patternId, newPattern);
    }
  }

  private detectPreferencePatterns(sessionEvents: LearningEvent[]): void {
    const userActions = sessionEvents.filter(e => e.eventType === 'user_action');
    const brands = new Set(userActions.map(e => e.context.brand));
    const industries = new Set(userActions.map(e => e.context.industry));

    if (brands.size === 1 && userActions.length >= 3) {
      const brand = Array.from(brands)[0];
      const patternId = `brand_preference_${brand}`;
      
      const pattern: PatternSignature = {
        id: patternId,
        type: 'preference',
        conditions: { brand },
        outcomes: {
          success: true,
          performanceMetrics: { userEngagement: userActions.length }
        },
        frequency: userActions.length,
        confidence: Math.min(0.9, userActions.length / 10),
        lastSeen: new Date(),
        sessionsObserved: [sessionEvents[0].sessionId]
      };
      
      this.patterns.set(patternId, pattern);
    }
  }

  private detectPerformancePatterns(sessionEvents: LearningEvent[]): void {
    const eventsWithOutcomes = sessionEvents.filter(e => e.outcome);
    if (eventsWithOutcomes.length < 2) return;

    const successRate = eventsWithOutcomes.filter(e => e.outcome!.success).length / eventsWithOutcomes.length;
    const avgExecutionTime = eventsWithOutcomes.reduce((sum, e) => sum + (e.outcome!.executionTime || 0), 0) / eventsWithOutcomes.length;

    if (successRate < 0.5 || avgExecutionTime > 5000) {
      const patternId = `performance_issue_${sessionEvents[0].sessionId}`;
      const pattern: PatternSignature = {
        id: patternId,
        type: 'failure',
        conditions: {
          brand: sessionEvents[0].context.brand,
          industry: sessionEvents[0].context.industry
        },
        outcomes: {
          success: false,
          performanceMetrics: { successRate, avgExecutionTime }
        },
        frequency: 1,
        confidence: 1 - successRate,
        lastSeen: new Date(),
        sessionsObserved: [sessionEvents[0].sessionId]
      };
      
      this.patterns.set(patternId, pattern);
    }
  }

  private detectCrossSessionPatterns(): void {
    // Group events by brand and industry
    const brandGroups = this.groupEventsByCondition('brand');
    const industryGroups = this.groupEventsByCondition('industry');

    // Detect patterns that appear across multiple sessions
    for (const [brand, events] of Object.entries(brandGroups)) {
      if (events.length >= 5) {
        const sessions = new Set(events.map(e => e.sessionId));
        if (sessions.size >= 2) {
          this.createCrossSessionPattern(brand, 'brand', events);
        }
      }
    }

    for (const [industry, events] of Object.entries(industryGroups)) {
      if (events.length >= 5) {
        const sessions = new Set(events.map(e => e.sessionId));
        if (sessions.size >= 2) {
          this.createCrossSessionPattern(industry, 'industry', events);
        }
      }
    }
  }

  private groupEventsByCondition(condition: string): Record<string, LearningEvent[]> {
    const groups: Record<string, LearningEvent[]> = {};
    
    for (const event of this.events) {
      const key = event.context[condition as keyof SessionContext] as string;
      if (key) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(event);
      }
    }
    
    return groups;
  }

  private createCrossSessionPattern(value: string, conditionType: string, events: LearningEvent[]): void {
    const patternId = `cross_session_${conditionType}_${value}`;
    const sessionsObserved = Array.from(new Set(events.map(e => e.sessionId)));
    
    const successfulEvents = events.filter(e => e.outcome?.success);
    const successRate = successfulEvents.length / events.length;

    const pattern: PatternSignature = {
      id: patternId,
      type: successRate > 0.7 ? 'success' : 'optimization',
      conditions: { [conditionType]: value },
      outcomes: {
        success: successRate > 0.5,
        performanceMetrics: {
          crossSessionFrequency: sessionsObserved.length,
          totalEvents: events.length,
          successRate
        }
      },
      frequency: events.length,
      confidence: Math.min(0.9, successRate * Math.log(sessionsObserved.length + 1) / 3),
      lastSeen: new Date(),
      sessionsObserved
    };

    this.patterns.set(patternId, pattern);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  getPatternsByType(type: PatternSignature['type']): PatternSignature[] {
    return Array.from(this.patterns.values()).filter(p => p.type === type);
  }

  getRecommendations(context: SessionContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Find success patterns for this brand/industry
    const successPatterns = this.getPatternsByType('success');
    const relevantPatterns = successPatterns.filter(p => 
      (p.conditions.brand === context.brand || p.conditions.industry === context.industry) &&
      p.confidence > 0.5
    );

    for (const pattern of relevantPatterns) {
      recommendations.push({
        id: `rec_${pattern.id}`,
        type: 'optimization',
        title: `Apply successful strategy from ${pattern.conditions.brand || pattern.conditions.industry}`,
        description: `This approach has succeeded in ${pattern.frequency} similar situations`,
        confidence: pattern.confidence,
        evidence: [`Success rate: ${pattern.outcomes.performanceMetrics.successRate || 'N/A'}`],
        actionable: true
      });
    }

    // Find and warn about failure patterns
    const failurePatterns = this.getPatternsByType('failure');
    const relevantFailures = failurePatterns.filter(p =>
      (p.conditions.brand === context.brand || p.conditions.industry === context.industry) &&
      p.confidence > 0.3
    );

    for (const pattern of relevantFailures) {
      recommendations.push({
        id: `warn_${pattern.id}`,
        type: 'warning',
        title: `Avoid known problematic approach`,
        description: `This pattern has led to issues in similar contexts`,
        confidence: pattern.confidence,
        evidence: [`Failure rate: ${1 - (pattern.outcomes.performanceMetrics.successRate || 0)}`],
        actionable: true
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  exportPatterns(): object {
    return {
      patterns: Array.from(this.patterns.values()),
      events: this.events.slice(-100), // Export last 100 events
      metadata: {
        totalPatterns: this.patterns.size,
        totalEvents: this.events.length,
        exportTime: new Date()
      }
    };
  }

  importPatterns(data: any): void {
    if (data.patterns) {
      for (const pattern of data.patterns) {
        this.patterns.set(pattern.id, pattern);
      }
    }
    if (data.events) {
      this.events.push(...data.events);
    }
  }
}

export interface Recommendation {
  id: string;
  type: 'optimization' | 'warning' | 'suggestion';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
}

// Learning System Coordinator
export class LearningSystemManager {
  private knowledgeGraph: KnowledgeGraphEngine;
  private patternEngine: PatternRecognitionEngine;
  private isEnabled: boolean = true;

  constructor() {
    this.knowledgeGraph = new KnowledgeGraphEngine();
    this.patternEngine = new PatternRecognitionEngine();
    this.loadFromStorage();
  }

  recordEvent(event: LearningEvent): void {
    if (!this.isEnabled) return;

    this.patternEngine.addEvent(event);
    this.createKnowledgeFromEvent(event);
    this.persistToStorage();
  }

  private createKnowledgeFromEvent(event: LearningEvent): void {
    const context = event.context;
    
    // Create or update brand node
    const brandNodeId = `brand_${context.brand}`;
    let brandNode = this.knowledgeGraph.findNodesByType('brand').find(n => n.id === brandNodeId);
    
    if (!brandNode) {
      brandNode = {
        id: brandNodeId,
        type: 'brand',
        data: { name: context.brand, industry: context.industry },
        relationships: [],
        confidence: 0.1,
        lastUpdated: new Date(),
        usageCount: 0,
        successRate: 0,
        createdFrom: event.sessionId
      };
      this.knowledgeGraph.addNode(brandNode);
    }

    // Update performance if outcome available
    if (event.outcome) {
      this.knowledgeGraph.updateNodePerformance(brandNodeId, event.outcome);
    }

    // Create industry node and link to brand
    const industryNodeId = `industry_${context.industry}`;
    let industryNode = this.knowledgeGraph.findNodesByType('industry').find(n => n.id === industryNodeId);
    
    if (!industryNode) {
      industryNode = {
        id: industryNodeId,
        type: 'industry',
        data: { name: context.industry },
        relationships: [],
        confidence: 0.1,
        lastUpdated: new Date(),
        usageCount: 0,
        successRate: 0,
        createdFrom: event.sessionId
      };
      this.knowledgeGraph.addNode(industryNode);
    }

    // Link brand to industry
    this.knowledgeGraph.linkNodes(brandNodeId, industryNodeId, {
      targetNodeId: industryNodeId,
      type: 'relates_to',
      strength: 0.8,
      evidence: [`Session ${event.sessionId}`],
      confidence: 0.9,
      lastObserved: new Date()
    });
  }

  getRecommendations(context: SessionContext): Recommendation[] {
    if (!this.isEnabled) return [];

    const patternRecommendations = this.patternEngine.getRecommendations(context);
    const knowledgeRecommendations = this.getKnowledgeRecommendations(context);

    return [...patternRecommendations, ...knowledgeRecommendations]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 recommendations
  }

  private getKnowledgeRecommendations(context: SessionContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const relatedNodes = this.knowledgeGraph.queryPattern(context.brand, context.industry);
    
    const highConfidenceNodes = relatedNodes.filter(n => n.confidence > 0.7 && n.successRate > 0.6);
    
    for (const node of highConfidenceNodes) {
      recommendations.push({
        id: `knowledge_${node.id}`,
        type: 'suggestion',
        title: `Leverage proven ${node.type} strategy`,
        description: `This ${node.type} approach has ${Math.round(node.successRate * 100)}% success rate`,
        confidence: node.confidence,
        evidence: [`Used successfully ${node.usageCount} times`],
        actionable: true
      });
    }

    return recommendations;
  }

  exportLearningData(): object {
    return {
      knowledgeGraph: this.knowledgeGraph.exportGraph(),
      patterns: this.patternEngine.exportPatterns(),
      metadata: {
        enabled: this.isEnabled,
        exportTime: new Date()
      }
    };
  }

  importLearningData(data: any): void {
    if (data.knowledgeGraph) {
      this.knowledgeGraph.importGraph(data.knowledgeGraph);
    }
    if (data.patterns) {
      this.patternEngine.importPatterns(data.patterns);
    }
  }

  private persistToStorage(): void {
    try {
      const data = this.exportLearningData();
      localStorage.setItem('sage_learning_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist learning data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('sage_learning_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.importLearningData(data);
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
  }

  enableLearning(): void {
    this.isEnabled = true;
  }

  disableLearning(): void {
    this.isEnabled = false;
  }

  isLearningEnabled(): boolean {
    return this.isEnabled;
  }

  // Analytics and insights
  getSystemInsights(): SystemInsights {
    const patterns = Array.from(this.patternEngine['patterns'].values());
    const nodes = this.knowledgeGraph.getHighConfidenceNodes();

    return {
      totalPatterns: patterns.length,
      successPatterns: patterns.filter(p => p.type === 'success').length,
      failurePatterns: patterns.filter(p => p.type === 'failure').length,
      highConfidenceNodes: nodes.length,
      topBrands: this.getTopEntities('brand'),
      topIndustries: this.getTopEntities('industry'),
      learningHealth: this.calculateLearningHealth()
    };
  }

  private getTopEntities(type: string): Array<{name: string, confidence: number, usageCount: number}> {
    return this.knowledgeGraph.findNodesByType(type)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(n => ({
        name: n.data.name,
        confidence: n.confidence,
        usageCount: n.usageCount
      }));
  }

  private calculateLearningHealth(): number {
    const patterns = Array.from(this.patternEngine['patterns'].values());
    const nodes = this.knowledgeGraph.getHighConfidenceNodes();
    
    const recentPatterns = patterns.filter(p => 
      (new Date().getTime() - p.lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length;

    const avgConfidence = nodes.length > 0 
      ? nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length 
      : 0;

    return Math.min(1.0, (recentPatterns / 10) * 0.5 + avgConfidence * 0.5);
  }
}

export interface SystemInsights {
  totalPatterns: number;
  successPatterns: number;
  failurePatterns: number;
  highConfidenceNodes: number;
  topBrands: Array<{name: string, confidence: number, usageCount: number}>;
  topIndustries: Array<{name: string, confidence: number, usageCount: number}>;
  learningHealth: number; // 0-1 score
}

// Global learning system instance
export const learningSystem = new LearningSystemManager();