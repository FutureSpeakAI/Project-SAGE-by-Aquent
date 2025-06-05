import { performDeepResearch } from './research-engine';

export interface ReasoningResult {
  finalInsights: string;
  researchPaths: ResearchPath[];
  completenessScore: number;
  totalQueries: number;
  processingTime: number;
}

export interface ResearchPath {
  iteration: number;
  query: string;
  rationale: string;
  results: string;
  relevanceScore: number;
  completenessAdded: number;
}

export interface ReasoningConfig {
  maxIterations: number;
  relevanceThreshold: number;
  completenessThreshold: number;
  timeoutMs: number;
}

// Marketing-specific reasoning patterns
const MARKETING_REASONING_PATTERNS = {
  campaignAnalysis: {
    followUpQueries: [
      'performance metrics and ROI data',
      'competitive campaign context',
      'target audience demographics and response',
      'creative strategy and execution details'
    ]
  },
  brandStrategy: {
    followUpQueries: [
      'market positioning and differentiation',
      'brand perception and sentiment analysis',
      'competitive landscape and market share',
      'audience insights and behavior patterns'
    ]
  },
  trendResearch: {
    followUpQueries: [
      'adoption rates and market penetration',
      'demographic and psychographic breakdowns',
      'industry impact and business implications',
      'future projections and growth potential'
    ]
  },
  creativeAnalysis: {
    followUpQueries: [
      'engagement metrics and performance data',
      'cultural context and relevance factors',
      'viral mechanics and shareability factors',
      'brand impact and attribution metrics'
    ]
  }
};

export class ReasoningEngine {
  private config: ReasoningConfig;

  constructor(config: Partial<ReasoningConfig> = {}) {
    this.config = {
      maxIterations: 3,
      relevanceThreshold: 0.7,
      completenessThreshold: 0.85,
      timeoutMs: 30000,
      ...config
    };
  }

  async performReasoningLoop(
    initialQuery: string,
    researchContext: string
  ): Promise<ReasoningResult> {
    const startTime = Date.now();
    const researchPaths: ResearchPath[] = [];
    let accumulatedInsights = '';
    let completenessScore = 0;

    try {
      // Step 1: Initial research
      console.log('Starting reasoning loop for query:', initialQuery);
      const initialResults = await performDeepResearch(initialQuery, researchContext);
      
      const initialPath: ResearchPath = {
        iteration: 0,
        query: initialQuery,
        rationale: 'Initial research query',
        results: initialResults,
        relevanceScore: 1.0,
        completenessAdded: 0.4
      };
      
      researchPaths.push(initialPath);
      accumulatedInsights = initialResults;
      completenessScore = 0.4;

      console.log(`Initial research completed. Completeness: ${completenessScore}`);

      // Step 2: Reasoning iterations
      for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
        if (completenessScore >= this.config.completenessThreshold) {
          console.log('Completeness threshold reached, stopping reasoning loop');
          break;
        }

        if (Date.now() - startTime > this.config.timeoutMs) {
          console.log('Timeout reached, stopping reasoning loop');
          break;
        }

        // Identify what additional research is needed
        const followUpQuery = await this.generateFollowUpQuery(
          initialQuery,
          accumulatedInsights,
          researchPaths,
          researchContext
        );

        if (!followUpQuery) {
          console.log('No additional research needed, stopping reasoning loop');
          break;
        }

        console.log(`Iteration ${iteration}: Researching "${followUpQuery.query}"`);

        // Perform follow-up research
        const followUpResults = await performDeepResearch(followUpQuery.query, researchContext);
        
        const followUpPath: ResearchPath = {
          iteration,
          query: followUpQuery.query,
          rationale: followUpQuery.rationale,
          results: followUpResults,
          relevanceScore: followUpQuery.relevanceScore,
          completenessAdded: followUpQuery.completenessAdded
        };

        researchPaths.push(followUpPath);
        accumulatedInsights += '\n\n' + followUpResults;
        completenessScore += followUpQuery.completenessAdded;

        console.log(`Iteration ${iteration} completed. Completeness: ${completenessScore}`);
      }

      // Step 3: Synthesize final insights
      const finalInsights = await this.synthesizeInsights(initialQuery, researchPaths);

      return {
        finalInsights,
        researchPaths,
        completenessScore,
        totalQueries: researchPaths.length,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Reasoning loop error:', error);
      throw new Error(`Reasoning loop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateFollowUpQuery(
    initialQuery: string,
    accumulatedInsights: string,
    existingPaths: ResearchPath[],
    researchContext: string
  ): Promise<{ query: string; rationale: string; relevanceScore: number; completenessAdded: number } | null> {
    
    // Identify marketing query type
    const queryType = this.identifyMarketingQueryType(initialQuery, researchContext);
    const pattern = MARKETING_REASONING_PATTERNS[queryType];
    
    if (!pattern) {
      return null;
    }

    // Find what aspects haven't been covered yet
    const coveredAspects = existingPaths.map(path => path.query.toLowerCase());
    const uncoveredAspects = pattern.followUpQueries.filter(aspect => 
      !coveredAspects.some(covered => covered.includes(aspect.toLowerCase()))
    );

    if (uncoveredAspects.length === 0) {
      return null;
    }

    // Select the most important uncovered aspect
    const nextAspect = uncoveredAspects[0];
    
    // Extract key entities from initial query for context
    const entities = this.extractEntities(initialQuery);
    const contextualizedQuery = this.buildContextualizedQuery(entities, nextAspect, queryType);

    return {
      query: contextualizedQuery,
      rationale: `Researching ${nextAspect} to complete ${queryType} analysis`,
      relevanceScore: 0.9,
      completenessAdded: 0.3
    };
  }

  private identifyMarketingQueryType(query: string, context: string): keyof typeof MARKETING_REASONING_PATTERNS {
    const lowerQuery = query.toLowerCase();
    const lowerContext = context.toLowerCase();
    
    if (lowerQuery.includes('campaign') || lowerQuery.includes('advertising') || lowerQuery.includes('ad')) {
      return 'campaignAnalysis';
    }
    if (lowerQuery.includes('brand') || lowerQuery.includes('strategy') || lowerQuery.includes('positioning')) {
      return 'brandStrategy';
    }
    if (lowerQuery.includes('trend') || lowerQuery.includes('emerging') || lowerQuery.includes('future')) {
      return 'trendResearch';
    }
    if (lowerQuery.includes('creative') || lowerQuery.includes('design') || lowerQuery.includes('visual')) {
      return 'creativeAnalysis';
    }
    
    // Default to campaign analysis for marketing contexts
    return 'campaignAnalysis';
  }

  private extractEntities(query: string): string[] {
    // Enhanced entity extraction that preserves brand names and key subjects
    const words = query.split(/\s+/);
    
    // Brand names and important entities (case-sensitive)
    const knownBrands = ['Nike', 'Adidas', 'Apple', 'Google', 'Microsoft', 'Amazon', 'Facebook', 'Meta', 'Tesla', 'Coca-Cola', 'Pepsi', 'McDonald'];
    const foundBrands = words.filter(word => knownBrands.includes(word));
    
    // Capitalized words (likely proper nouns)
    const capitalizedWords = words.filter(word => 
      word.length > 2 && 
      /^[A-Z]/.test(word) && 
      !['The', 'And', 'For', 'With', 'This', 'That', 'Why', 'What', 'How', 'When', 'Where'].includes(word)
    );
    
    // Combine and prioritize brands
    const entities = [...new Set([...foundBrands, ...capitalizedWords])];
    return entities.length > 0 ? entities : ['the brand']; // Fallback if no entities found
  }

  private buildContextualizedQuery(entities: string[], aspect: string, queryType: string): string {
    const primaryEntity = entities[0] || 'the brand';
    
    switch (queryType) {
      case 'campaignAnalysis':
        return `${primaryEntity} ${aspect} 2024 marketing campaigns North America`;
      case 'brandStrategy':
        return `${primaryEntity} ${aspect} brand analysis market research`;
      case 'trendResearch':
        return `${primaryEntity} ${aspect} industry trends market analysis`;
      case 'creativeAnalysis':
        return `${primaryEntity} ${aspect} creative campaigns advertising effectiveness`;
      default:
        return `${primaryEntity} ${aspect}`;
    }
  }

  private async synthesizeInsights(initialQuery: string, researchPaths: ResearchPath[]): Promise<string> {
    // Combine all research results with clear structure
    let synthesis = `# Comprehensive Analysis: ${initialQuery}\n\n`;
    
    synthesis += `## Executive Summary\n`;
    synthesis += `Based on ${researchPaths.length} research queries, here are the key insights:\n\n`;

    // Add each research path with clear sections
    researchPaths.forEach((path, index) => {
      if (index === 0) {
        synthesis += `## Primary Research Findings\n`;
        synthesis += `${path.results}\n\n`;
      } else {
        synthesis += `## ${path.rationale}\n`;
        synthesis += `${path.results}\n\n`;
      }
    });

    synthesis += `## Strategic Insights\n`;
    synthesis += `This analysis combines multiple research perspectives to provide comprehensive strategic intelligence for marketing decision-making.\n`;

    return synthesis;
  }
}

// Export singleton instance
export const reasoningEngine = new ReasoningEngine();