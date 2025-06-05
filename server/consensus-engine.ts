import { performDeepResearch } from './research-engine';
import { reasoningEngine, type ReasoningResult } from './reasoning-engine';
import * as OpenAI from './openai';
import * as GeminiAPI from './gemini';
import * as AnthropicAPI from './anthropic';

export interface ConsensusResult {
  synthesizedResponse: string;
  modelResponses: ModelResponse[];
  consensusScore: number;
  processingTime: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface ModelResponse {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  response: string;
  responseTime: number;
  quality: number;
  keyInsights: string[];
}

export interface ConsensusConfig {
  enabledProviders: ('openai' | 'anthropic' | 'gemini')[];
  useReasoning: boolean;
  synthesisModel: 'openai' | 'anthropic' | 'gemini';
  qualityThreshold: number;
}

export class ConsensusEngine {
  
  async performConsensusAnalysis(
    query: string,
    researchContext: string,
    systemPrompt: string,
    config: ConsensusConfig
  ): Promise<ConsensusResult> {
    const startTime = Date.now();
    const modelResponses: ModelResponse[] = [];

    console.log('Starting multi-model consensus analysis...');
    console.log('Enabled providers:', config.enabledProviders);

    // Step 1: Perform research if needed
    let researchData = '';
    if (researchContext && researchContext.trim().length > 0) {
      if (config.useReasoning) {
        console.log('Performing reasoning-enhanced research...');
        const reasoningResult = await reasoningEngine.performReasoningLoop(query, researchContext);
        researchData = reasoningResult.finalInsights;
      } else {
        console.log('Performing direct research...');
        researchData = await performDeepResearch(query, researchContext);
      }
    }

    // Build enhanced system prompt with research data
    const enhancedSystemPrompt = researchData ? 
      `${systemPrompt}\n\n=== RESEARCH DATA ===\n${researchData}\n=== END RESEARCH DATA ===` : 
      systemPrompt;

    // Step 2: Query all enabled models in parallel
    const modelQueries = config.enabledProviders.map(provider => 
      this.queryModel(provider, query, enhancedSystemPrompt)
    );

    const responses = await Promise.allSettled(modelQueries);

    // Process responses and calculate quality scores
    responses.forEach((result, index) => {
      const provider = config.enabledProviders[index];
      
      if (result.status === 'fulfilled') {
        const response = result.value;
        const quality = this.calculateResponseQuality(response.response, query);
        
        if (quality >= config.qualityThreshold) {
          modelResponses.push({
            provider,
            model: response.model,
            response: response.response,
            responseTime: response.responseTime,
            quality,
            keyInsights: this.extractKeyInsights(response.response)
          });
        }
      } else {
        console.warn(`Failed to get response from ${provider}:`, result.reason);
      }
    });

    console.log(`Received ${modelResponses.length} quality responses`);

    // Step 3: Synthesize responses using the designated synthesis model
    const synthesizedResponse = await this.synthesizeResponses(
      modelResponses,
      query,
      config.synthesisModel,
      systemPrompt
    );

    // Step 4: Calculate consensus metrics
    const consensusScore = this.calculateConsensusScore(modelResponses);
    const confidenceLevel = this.determineConfidenceLevel(consensusScore, modelResponses.length);

    return {
      synthesizedResponse,
      modelResponses,
      consensusScore,
      processingTime: Date.now() - startTime,
      confidenceLevel
    };
  }

  private async queryModel(
    provider: 'openai' | 'anthropic' | 'gemini',
    query: string,
    systemPrompt: string
  ): Promise<{ response: string; model: string; responseTime: number }> {
    const startTime = Date.now();

    try {
      switch (provider) {
        case 'anthropic':
          const anthropicResponse = await AnthropicAPI.generateContent({
            model: 'claude-sonnet-4-20250514',
            prompt: query,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 2000
          });
          return {
            response: anthropicResponse,
            model: 'claude-sonnet-4-20250514',
            responseTime: Date.now() - startTime
          };

        case 'openai':
          const OpenAILib = require('openai');
          const openai = new OpenAILib({ apiKey: process.env.OPENAI_API_KEY });
          
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query }
            ],
            temperature: 0.7,
            max_tokens: 2000
          });
          
          return {
            response: completion.choices[0].message.content || '',
            model: 'gpt-4o',
            responseTime: Date.now() - startTime
          };

        case 'gemini':
          const geminiResponse = await GeminiAPI.generateContent({
            model: 'gemini-1.5-pro',
            prompt: query,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 2000
          });
          return {
            response: geminiResponse,
            model: 'gemini-1.5-pro',
            responseTime: Date.now() - startTime
          };

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error querying ${provider}:`, error);
      throw error;
    }
  }

  private calculateResponseQuality(response: string, query: string): number {
    let score = 0.5; // Base score

    // Length quality (not too short, not too verbose)
    const wordCount = response.split(/\s+/).length;
    if (wordCount >= 50 && wordCount <= 1000) score += 0.2;
    
    // Relevance to query (simple keyword matching)
    const queryKeywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const responseText = response.toLowerCase();
    const relevantKeywords = queryKeywords.filter(keyword => responseText.includes(keyword));
    score += (relevantKeywords.length / queryKeywords.length) * 0.3;

    return Math.min(score, 1.0);
  }

  private extractKeyInsights(response: string): string[] {
    // Simple insight extraction - look for bullet points, numbered lists, or key sentences
    const insights: string[] = [];
    
    // Extract bullet points
    const bulletRegex = /[•\-\*]\s*(.+?)(?=\n|$)/g;
    let match;
    while ((match = bulletRegex.exec(response)) !== null) {
      insights.push(match[1].trim());
    }

    // Extract numbered points
    const numberedRegex = /\d+\.\s*(.+?)(?=\n|$)/g;
    while ((match = numberedRegex.exec(response)) !== null) {
      insights.push(match[1].trim());
    }

    // If no structured content, extract key sentences (containing important keywords)
    if (insights.length === 0) {
      const sentences = response.split(/[.!?]+/);
      const keywordPatterns = ['important', 'key', 'critical', 'essential', 'should', 'must', 'recommend'];
      
      sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase();
        if (keywordPatterns.some(keyword => lowerSentence.includes(keyword))) {
          insights.push(sentence.trim());
        }
      });
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private async synthesizeResponses(
    responses: ModelResponse[],
    originalQuery: string,
    synthesisModel: 'openai' | 'anthropic' | 'gemini',
    baseSystemPrompt: string
  ): Promise<string> {
    
    if (responses.length === 0) {
      return "No quality responses were received from the AI models to synthesize.";
    }

    if (responses.length === 1) {
      return responses[0].response;
    }

    // Build synthesis prompt
    const synthesisPrompt = `You are synthesizing responses from multiple AI models to provide a comprehensive, balanced answer.

Original Query: ${originalQuery}

Model Responses to Synthesize:

${responses.map((resp, index) => `
=== ${resp.provider.toUpperCase()} ${resp.model} Response (Quality: ${(resp.quality * 100).toFixed(1)}%) ===
${resp.response}
`).join('\n')}

Your task: Create a unified, comprehensive response that:
1. Combines the best insights from all models
2. Resolves any contradictions by explaining different perspectives
3. Maintains the professional tone and expertise expected
4. Provides a balanced, well-structured final answer
5. Highlights areas where models agree (high confidence) vs. disagree (acknowledge uncertainty)

Synthesize these responses into a single, cohesive answer that leverages the strengths of each model while maintaining accuracy and usefulness.`;

    // Use the designated synthesis model
    const synthesisResponse = await this.queryModel(synthesisModel, synthesisPrompt, baseSystemPrompt);
    
    return synthesisResponse.response;
  }

  private calculateConsensusScore(responses: ModelResponse[]): number {
    if (responses.length <= 1) return responses.length > 0 ? 1.0 : 0.0;

    // Simple consensus calculation based on response similarity
    // In a production system, this could use more sophisticated NLP similarity measures
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateTextSimilarity(responses[i].response, responses[j].response);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private determineConfidenceLevel(consensusScore: number, responseCount: number): 'high' | 'medium' | 'low' {
    if (responseCount >= 3 && consensusScore >= 0.7) return 'high';
    if (responseCount >= 2 && consensusScore >= 0.5) return 'medium';
    return 'low';
  }
}

export const consensusEngine = new ConsensusEngine();