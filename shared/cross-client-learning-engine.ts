/**
 * Cross-Client Learning Engine - Internal Tool Implementation
 * Leverages unrestricted cross-client data for maximum collective intelligence
 */

import { SessionContext, BriefingData, GeneratedContent, CampaignResult } from './session-context';

// Enhanced data structures for cross-client learning
export interface CrossClientCampaignData {
  campaignId: string;
  clientIndustry: string;
  campaignType: 'brand_awareness' | 'lead_generation' | 'product_launch' | 'thought_leadership' | 'crisis_management';
  budgetRange: 'under_10k' | '10k_50k' | '50k_100k' | '100k_500k' | 'over_500k';
  timeline: number; // days
  teamComposition: TeamMember[];
  objectives: string[];
  deliverables: string[];
  finalOutcome: CampaignResult;
  successMetrics: SuccessMetrics;
  contextualFactors: ContextualFactors;
  lessonsLearned: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface TeamMember {
  role: 'strategist' | 'copywriter' | 'designer' | 'developer' | 'project_manager' | 'analyst';
  experience: 'junior' | 'mid' | 'senior' | 'lead';
  specialization?: string[];
}

export interface SuccessMetrics {
  clientSatisfaction: number; // 1-10
  onTimeDelivery: boolean;
  budgetAdherence: number; // percentage
  qualityScore: number; // 1-10
  innovationScore: number; // 1-10
  reuseableAssets: number; // count of assets created for reuse
  followUpEngagements: number; // additional projects generated
}

export interface ContextualFactors {
  seasonality: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  marketConditions: 'bull' | 'bear' | 'neutral';
  competitorActivity: 'high' | 'medium' | 'low';
  clientMaturity: 'startup' | 'growth' | 'enterprise' | 'legacy';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  innovationTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface SuccessPattern {
  patternId: string;
  patternType: 'strategy' | 'execution' | 'team' | 'process' | 'innovation';
  applicableIndustries: string[];
  successRate: number; // 0-1
  sampleSize: number;
  conditions: PatternCondition[];
  outcomes: PatternOutcome[];
  implementation: ImplementationGuide;
  confidence: number; // 0-1
  lastValidated: Date;
}

export interface PatternCondition {
  factor: string;
  value: any;
  importance: number; // 0-1
}

export interface PatternOutcome {
  metric: string;
  improvement: number; // percentage improvement
  baseline: number;
}

export interface ImplementationGuide {
  steps: ImplementationStep[];
  resources: ResourceRequirement[];
  timeframe: string;
  risks: Risk[];
  successIndicators: string[];
}

export interface ImplementationStep {
  step: number;
  description: string;
  duration: string;
  dependencies: string[];
  deliverables: string[];
}

export interface ResourceRequirement {
  type: 'human' | 'technology' | 'budget' | 'time';
  specification: string;
  quantity: number;
  criticality: 'essential' | 'important' | 'optional';
}

export interface Risk {
  description: string;
  probability: number; // 0-1
  impact: number; // 0-1
  mitigation: string;
}

export interface PredictiveInsights {
  successProbability: number;
  expectedOutcomes: ExpectedOutcome[];
  riskFactors: RiskFactor[];
  optimizationRecommendations: OptimizationRecommendation[];
  benchmarkComparison: BenchmarkData;
  confidenceLevel: number;
}

export interface ExpectedOutcome {
  metric: string;
  predictedValue: number;
  confidenceInterval: [number, number];
  benchmarkComparison: number;
}

export interface RiskFactor {
  factor: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: string;
  mitigation: string[];
}

export interface OptimizationRecommendation {
  category: 'strategy' | 'team' | 'timeline' | 'budget' | 'process';
  recommendation: string;
  expectedImprovement: number;
  implementation: string;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface BenchmarkData {
  industryAverage: number;
  topQuartile: number;
  historicalPerformance: number;
  similarCampaigns: CampaignReference[];
}

export interface CampaignReference {
  campaignId: string;
  similarity: number;
  successMetrics: SuccessMetrics;
  keyDifferences: string[];
}

// Main Cross-Client Learning Engine
export class CrossClientLearningEngine {
  private campaignDatabase: CrossClientCampaignData[] = [];
  private successPatterns: SuccessPattern[] = [];
  private learningModel: LearningModel;

  constructor() {
    this.learningModel = new LearningModel();
    this.initializeWithHistoricalData();
  }

  // Record campaign data for learning
  async recordCampaignData(campaignData: CrossClientCampaignData): Promise<void> {
    // Store campaign data
    this.campaignDatabase.push(campaignData);
    
    // Update patterns
    await this.updateSuccessPatterns(campaignData);
    
    // Retrain model
    await this.learningModel.incrementalTrain(campaignData);
    
    // Validate and update existing patterns
    await this.validateExistingPatterns();
  }

  // Get predictive insights for new campaign
  async getPredictiveInsights(briefing: BriefingData, context: SessionContext): Promise<PredictiveInsights> {
    // Find similar campaigns
    const similarCampaigns = await this.findSimilarCampaigns(briefing, context);
    
    // Apply learning model
    const modelPrediction = await this.learningModel.predict(briefing, context);
    
    // Generate recommendations
    const recommendations = await this.generateOptimizationRecommendations(briefing, context, similarCampaigns);
    
    // Calculate risk factors
    const riskFactors = await this.identifyRiskFactors(briefing, context, similarCampaigns);
    
    // Generate benchmark comparison
    const benchmarks = await this.generateBenchmarkComparison(briefing, context);
    
    return {
      successProbability: modelPrediction.successProbability,
      expectedOutcomes: modelPrediction.expectedOutcomes,
      riskFactors,
      optimizationRecommendations: recommendations,
      benchmarkComparison: benchmarks,
      confidenceLevel: this.calculateConfidenceLevel(similarCampaigns.length, modelPrediction.confidence)
    };
  }

  // Get success patterns applicable to current context
  async getApplicableSuccessPatterns(briefing: BriefingData, context: SessionContext): Promise<SuccessPattern[]> {
    return this.successPatterns.filter(pattern => {
      // Check industry applicability
      if (!pattern.applicableIndustries.includes('all') && 
          !pattern.applicableIndustries.includes(context.industry)) {
        return false;
      }
      
      // Check success rate threshold
      if (pattern.successRate < 0.7) return false;
      
      // Check sample size significance
      if (pattern.sampleSize < 5) return false;
      
      // Check pattern conditions match current context
      return this.matchesPatternConditions(pattern, briefing, context);
    }).sort((a, b) => {
      // Sort by success rate and confidence
      return (b.successRate * b.confidence) - (a.successRate * a.confidence);
    });
  }

  // Get real-time collective intelligence
  async getCollectiveIntelligence(industry: string): Promise<CollectiveIntelligence> {
    const recentCampaigns = this.getRecentCampaigns(industry, 90); // Last 90 days
    
    return {
      currentTrends: await this.identifyCurrentTrends(recentCampaigns),
      emergingStrategies: await this.identifyEmergingStrategies(recentCampaigns),
      successfulInnovations: await this.identifySuccessfulInnovations(recentCampaigns),
      commonPitfalls: await this.identifyCommonPitfalls(recentCampaigns),
      marketInsights: await this.generateMarketInsights(recentCampaigns),
      competitiveAdvantages: await this.identifyCompetitiveAdvantages(recentCampaigns)
    };
  }

  // Get resource optimization recommendations
  async getResourceOptimization(briefing: BriefingData, context: SessionContext): Promise<ResourceOptimization> {
    const optimalPatterns = await this.findOptimalResourcePatterns(briefing, context);
    
    return {
      optimalTeamComposition: this.calculateOptimalTeam(optimalPatterns),
      budgetAllocation: this.calculateOptimalBudget(optimalPatterns),
      timelineOptimization: this.calculateOptimalTimeline(optimalPatterns),
      toolRecommendations: this.getOptimalTools(optimalPatterns),
      efficiencyGains: this.calculateEfficiencyGains(optimalPatterns)
    };
  }

  // Private methods for internal processing
  private async updateSuccessPatterns(campaignData: CrossClientCampaignData): Promise<void> {
    // Extract patterns from successful campaigns
    if (campaignData.successMetrics.clientSatisfaction >= 8 &&
        campaignData.successMetrics.qualityScore >= 8) {
      
      const newPatterns = await this.extractPatternsFromCampaign(campaignData);
      
      // Merge with existing patterns or create new ones
      for (const pattern of newPatterns) {
        const existingPattern = this.findSimilarPattern(pattern);
        if (existingPattern) {
          await this.mergePatterns(existingPattern, pattern);
        } else {
          this.successPatterns.push(pattern);
        }
      }
    }
  }

  private async findSimilarCampaigns(
    briefing: BriefingData, 
    context: SessionContext, 
    limit: number = 10
  ): Promise<CrossClientCampaignData[]> {
    // Calculate similarity scores
    const campaignsWithSimilarity = this.campaignDatabase.map(campaign => ({
      campaign,
      similarity: this.calculateSimilarity(campaign, briefing, context)
    }));
    
    // Sort by similarity and return top matches
    return campaignsWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.campaign);
  }

  private calculateSimilarity(
    campaign: CrossClientCampaignData,
    briefing: BriefingData,
    context: SessionContext
  ): number {
    let similarity = 0;
    let factors = 0;
    
    // Industry similarity (high weight)
    if (campaign.clientIndustry === context.industry) {
      similarity += 0.3;
    } else if (this.areRelatedIndustries(campaign.clientIndustry, context.industry)) {
      similarity += 0.15;
    }
    factors += 0.3;
    
    // Campaign type similarity (medium weight)
    if (briefing.campaignGoals && campaign.objectives) {
      const goalSimilarity = this.calculateGoalSimilarity(briefing.campaignGoals, campaign.objectives);
      similarity += goalSimilarity * 0.2;
    }
    factors += 0.2;
    
    // Budget range similarity (medium weight)
    const budgetSimilarity = this.calculateBudgetSimilarity(briefing.budget, campaign.budgetRange);
    similarity += budgetSimilarity * 0.2;
    factors += 0.2;
    
    // Timeline similarity (low weight)
    if (briefing.timeline && campaign.timeline) {
      const timelineSimilarity = this.calculateTimelineSimilarity(briefing.timeline, campaign.timeline);
      similarity += timelineSimilarity * 0.1;
    }
    factors += 0.1;
    
    // Contextual factors similarity (medium weight)
    const contextSimilarity = this.calculateContextSimilarity(context, campaign.contextualFactors);
    similarity += contextSimilarity * 0.2;
    factors += 0.2;
    
    return factors > 0 ? similarity / factors : 0;
  }

  private async generateOptimizationRecommendations(
    briefing: BriefingData,
    context: SessionContext,
    similarCampaigns: CrossClientCampaignData[]
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Strategy optimizations
    const strategyRecs = await this.getStrategyOptimizations(briefing, context, similarCampaigns);
    recommendations.push(...strategyRecs);
    
    // Team optimizations
    const teamRecs = await this.getTeamOptimizations(briefing, context, similarCampaigns);
    recommendations.push(...teamRecs);
    
    // Timeline optimizations
    const timelineRecs = await this.getTimelineOptimizations(briefing, context, similarCampaigns);
    recommendations.push(...timelineRecs);
    
    // Budget optimizations
    const budgetRecs = await this.getBudgetOptimizations(briefing, context, similarCampaigns);
    recommendations.push(...budgetRecs);
    
    // Process optimizations
    const processRecs = await this.getProcessOptimizations(briefing, context, similarCampaigns);
    recommendations.push(...processRecs);
    
    return recommendations.sort((a, b) => {
      // Sort by priority and expected improvement
      const aPriority = this.getPriorityWeight(a.priority);
      const bPriority = this.getPriorityWeight(b.priority);
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.expectedImprovement - a.expectedImprovement;
    });
  }

  private async initializeWithHistoricalData(): Promise<void> {
    // In a real implementation, this would load from database
    // For demonstration, we'll start with empty data that would be populated over time
    console.log('Cross-client learning engine initialized');
    console.log('Ready to learn from campaigns across all clients');
  }

  // Helper methods for similarity calculations
  private areRelatedIndustries(industry1: string, industry2: string): boolean {
    const relatedGroups = [
      ['healthcare', 'pharmaceuticals', 'medical'],
      ['technology', 'software', 'saas', 'fintech'],
      ['retail', 'ecommerce', 'consumer goods'],
      ['finance', 'banking', 'insurance'],
      ['manufacturing', 'automotive', 'industrial']
    ];
    
    return relatedGroups.some(group => 
      group.includes(industry1.toLowerCase()) && group.includes(industry2.toLowerCase())
    );
  }

  private calculateGoalSimilarity(goals1: string[], goals2: string[]): number {
    if (!goals1?.length || !goals2?.length) return 0;
    
    const intersection = goals1.filter(goal => 
      goals2.some(g => g.toLowerCase().includes(goal.toLowerCase()) || 
                       goal.toLowerCase().includes(g.toLowerCase()))
    );
    
    return intersection.length / Math.max(goals1.length, goals2.length);
  }

  private calculateBudgetSimilarity(budget1: string, budget2: string): number {
    const budgetOrder = ['under_10k', '10k_50k', '50k_100k', '100k_500k', 'over_500k'];
    const index1 = budgetOrder.indexOf(budget1);
    const index2 = budgetOrder.indexOf(budget2);
    
    if (index1 === -1 || index2 === -1) return 0;
    
    const distance = Math.abs(index1 - index2);
    return Math.max(0, 1 - (distance / (budgetOrder.length - 1)));
  }

  private calculateTimelineSimilarity(timeline1: string, timeline2: number): number {
    // Convert timeline string to days for comparison
    const days1 = this.parseTimelineToDays(timeline1);
    if (!days1) return 0;
    
    const ratio = Math.min(days1, timeline2) / Math.max(days1, timeline2);
    return ratio;
  }

  private parseTimelineToDays(timeline: string): number {
    const matches = timeline.match(/(\d+)\s*(days?|weeks?|months?)/i);
    if (!matches) return 0;
    
    const value = parseInt(matches[1]);
    const unit = matches[2].toLowerCase();
    
    switch (unit.charAt(0)) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      default: return 0;
    }
  }

  private calculateContextSimilarity(context: SessionContext, factors: ContextualFactors): number {
    // This would implement contextual similarity calculation
    // For now, return a placeholder
    return 0.5;
  }

  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  // Placeholder methods that would be implemented with full learning algorithms
  private async getStrategyOptimizations(briefing: BriefingData, context: SessionContext, similarCampaigns: CrossClientCampaignData[]): Promise<OptimizationRecommendation[]> { return []; }
  private async getTeamOptimizations(briefing: BriefingData, context: SessionContext, similarCampaigns: CrossClientCampaignData[]): Promise<OptimizationRecommendation[]> { return []; }
  private async getTimelineOptimizations(briefing: BriefingData, context: SessionContext, similarCampaigns: CrossClientCampaignData[]): Promise<OptimizationRecommendation[]> { return []; }
  private async getBudgetOptimizations(briefing: BriefingData, context: SessionContext, similarCampaigns: CrossClientCampaignData[]): Promise<OptimizationRecommendation[]> { return []; }
  private async getProcessOptimizations(briefing: BriefingData, context: SessionContext, similarCampaigns: CrossClientCampaignData[]): Promise<OptimizationRecommendation[]> { return []; }
}

// Supporting classes
class LearningModel {
  async incrementalTrain(campaignData: CrossClientCampaignData): Promise<void> {
    // Implement incremental learning algorithm
  }

  async predict(briefing: BriefingData, context: SessionContext): Promise<any> {
    // Implement prediction algorithm
    return {
      successProbability: 0.8,
      expectedOutcomes: [],
      confidence: 0.85
    };
  }
}

// Additional interfaces for comprehensive cross-client learning
export interface CollectiveIntelligence {
  currentTrends: Trend[];
  emergingStrategies: Strategy[];
  successfulInnovations: Innovation[];
  commonPitfalls: Pitfall[];
  marketInsights: MarketInsight[];
  competitiveAdvantages: CompetitiveAdvantage[];
}

export interface ResourceOptimization {
  optimalTeamComposition: TeamComposition;
  budgetAllocation: BudgetAllocation;
  timelineOptimization: TimelineOptimization;
  toolRecommendations: ToolRecommendation[];
  efficiencyGains: EfficiencyGains;
}

export interface Trend {
  name: string;
  description: string;
  adoptionRate: number;
  successRate: number;
  industries: string[];
  emergingDate: Date;
}

export interface Strategy {
  name: string;
  description: string;
  applicability: string[];
  successRate: number;
  implementation: string[];
}

export interface Innovation {
  name: string;
  description: string;
  impact: number;
  adoptionBarriers: string[];
  successStories: string[];
}

export interface Pitfall {
  description: string;
  frequency: number;
  impact: number;
  prevention: string[];
  indicators: string[];
}

export interface MarketInsight {
  insight: string;
  confidence: number;
  applicableIndustries: string[];
  timeframe: string;
  actionable: boolean;
}

export interface CompetitiveAdvantage {
  advantage: string;
  difficulty: number;
  impact: number;
  implementation: string[];
  sustainability: number;
}

export interface TeamComposition {
  optimalSize: number;
  roles: TeamRole[];
  experienceDistribution: ExperienceDistribution;
  specializations: string[];
}

export interface TeamRole {
  role: string;
  count: number;
  experienceLevel: string;
  criticality: number;
}

export interface ExperienceDistribution {
  junior: number;
  mid: number;
  senior: number;
  lead: number;
}

export interface BudgetAllocation {
  strategy: number;
  creative: number;
  production: number;
  media: number;
  contingency: number;
}

export interface TimelineOptimization {
  optimalDuration: number;
  criticalMilestones: Milestone[];
  parallelActivities: Activity[];
  bufferRecommendations: Buffer[];
}

export interface Milestone {
  name: string;
  day: number;
  criticality: number;
  dependencies: string[];
}

export interface Activity {
  name: string;
  duration: number;
  canParallelize: boolean;
  dependencies: string[];
}

export interface Buffer {
  phase: string;
  recommendedBuffer: number;
  reason: string;
}

export interface ToolRecommendation {
  tool: string;
  category: string;
  benefit: string;
  adoptionEffort: number;
  roi: number;
}

export interface EfficiencyGains {
  timeReduction: number;
  costReduction: number;
  qualityImprovement: number;
  riskReduction: number;
}

// Export singleton instance
export const crossClientLearningEngine = new CrossClientLearningEngine();