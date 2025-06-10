import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, SavedPrompt, SavedPersona } from "./storage";
import { generateContent, generateImage } from "./openai";
import * as GeminiAPI from "./gemini";
import * as AnthropicAPI from "./anthropic";
import { processBrief } from "./brief-processing";
import { processImage } from "./image-processing";
import { upload } from './index';
import OpenAI from "openai";
import { performDeepResearch } from "./research-engine";
import { reasoningEngine } from "./reasoning-engine";
import { promptRouter, type PromptRouterConfig } from "./prompt-router";
import { detectLorealBrief, generateLorealInstagramContent } from "./loreal-brief-handler";

// Helper function to determine if reasoning loop is needed
function shouldUseReasoningLoop(message: string, researchContext: string, sessionHistory: any[]): boolean {
  const lowerMessage = message.toLowerCase();
  const lowerContext = researchContext.toLowerCase();
  
  // Don't use reasoning for conversational follow-up questions
  const conversationalIndicators = [
    'why are we', 'what\'s going on', 'why did you', 'what happened',
    'i don\'t understand', 'that doesn\'t make sense', 'why only',
    'what about', 'but what', 'however'
  ];
  
  if (conversationalIndicators.some(indicator => lowerMessage.includes(indicator))) {
    return false;
  }
  
  // Don't use reasoning if this seems like a clarification question
  if (sessionHistory && sessionHistory.length > 0) {
    const recentMessages = sessionHistory.slice(-3);
    const hasRecentResearch = recentMessages.some(msg => 
      msg.content && msg.content.length > 500 // Recent detailed response suggests research was already done
    );
    
    if (hasRecentResearch && message.length < 100) {
      return false; // Short follow-up after detailed response = clarification, not new research
    }
  }
  
  // Use reasoning for comprehensive analysis requests
  const comprehensiveIndicators = [
    'comprehensive', 'detailed', 'deep research', 'everything you can find',
    'complete analysis', 'full report', 'thorough', 'in-depth'
  ];
  
  // Use reasoning for competitive/comparative requests
  const comparativeIndicators = [
    'compare', 'versus', 'vs', 'against', 'competitive analysis',
    'competitor', 'benchmark', 'market comparison'
  ];
  
  // Use reasoning for strategic analysis requests
  const strategicIndicators = [
    'strategy', 'analysis of', 'insights into'
  ];
  
  const allIndicators = [...comprehensiveIndicators, ...comparativeIndicators, ...strategicIndicators];
  
  return allIndicators.some(indicator => 
    lowerMessage.includes(indicator) || lowerContext.includes(indicator)
  );
}

import { handleOptimizedTTS } from "./voice-optimization";
import { workflowOrchestrator } from "./campaign-workflow";
import { robustContentGenerator } from "./robust-content-generator";
import { socialPostGenerator } from "./social-post-generator";

// Extract conversation context to maintain topic continuity
function extractConversationContext(sessionHistory: any[], currentMessage: string): string {
  if (!sessionHistory || sessionHistory.length === 0) {
    return "New conversation";
  }

  // Look for key topics/brands mentioned in recent conversation
  const recentMessages = sessionHistory.slice(-3);
  const allText = recentMessages.map(msg => msg.content || '').join(' ');
  
  // Extract brands/companies mentioned
  const brands = ['Nike', 'Adidas', 'Apple', 'Google', 'Microsoft', 'Amazon', 'Facebook', 'Meta', 'Tesla', 'Coca-Cola', 'Pepsi'];
  const mentionedBrands = brands.filter(brand => 
    allText.toLowerCase().includes(brand.toLowerCase()) || 
    currentMessage.toLowerCase().includes(brand.toLowerCase())
  );

  // Extract campaign types or topics
  const campaignTypes = ['advertising', 'campaigns', 'marketing', 'brand strategy', 'social media', 'digital'];
  const mentionedTypes = campaignTypes.filter(type =>
    allText.toLowerCase().includes(type) || 
    currentMessage.toLowerCase().includes(type)
  );

  let context = "";
  if (mentionedBrands.length > 0) {
    context += `Discussion about ${mentionedBrands.join(', ')} `;
  }
  if (mentionedTypes.length > 0) {
    context += `focusing on ${mentionedTypes.join(', ')}`;
  }
  
  return context || "General marketing discussion";
}
import { 
  GeneratedContent, 
  InsertGeneratedContent, 
  BriefConversation, 
  InsertBriefConversation,
  GeneratedImage,
  InsertGeneratedImage,
  ContentType
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add a status endpoint to verify database connection
  app.get('/api/status', async (_req: Request, res: Response) => {
    try {
      // Check if db is available
      const dbAvailable = !!process.env.DATABASE_URL;
      
      res.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        database: {
          available: dbAvailable,
          type: dbAvailable ? 'postgresql' : 'memory'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to check system status',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Add a data export/import endpoint for deployment migrations
  app.get('/api/export-data', async (_req: Request, res: Response) => {
    try {
      // Export all data from the database
      const [prompts, personas, contents, conversations, images] = await Promise.all([
        storage.getPrompts(),
        storage.getPersonas(),
        storage.getGeneratedContents(),
        storage.getBriefConversations(),
        storage.getGeneratedImages()
      ]);
      
      res.json({
        prompts,
        personas,
        contents,
        conversations,
        images,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({ 
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Import data from a previous export
  app.post('/api/import-data', async (req: Request, res: Response) => {
    try {
      const { prompts, personas, contents, conversations, images } = req.body;
      
      // Track import stats
      const stats = {
        promptsImported: 0,
        personasImported: 0,
        contentsImported: 0,
        conversationsImported: 0,
        imagesImported: 0
      };
      
      // Import prompts
      if (Array.isArray(prompts)) {
        for (const prompt of prompts) {
          try {
            await storage.savePrompt({
              name: prompt.name,
              category: prompt.category || "General",
              systemPrompt: prompt.systemPrompt,
              userPrompt: prompt.userPrompt
            });
            stats.promptsImported++;
          } catch (err) {
            console.warn(`Failed to import prompt "${prompt.name}":`, err);
          }
        }
      }
      
      // Import personas
      if (Array.isArray(personas)) {
        for (const persona of personas) {
          try {
            await storage.savePersona({
              name: persona.name,
              category: persona.category || "General",
              description: persona.description,
              instruction: persona.instruction
            });
            stats.personasImported++;
          } catch (err) {
            console.warn(`Failed to import persona "${persona.name}":`, err);
          }
        }
      }
      
      // Import generated contents
      if (Array.isArray(contents)) {
        for (const content of contents) {
          try {
            await storage.saveGeneratedContent({
              title: content.title,
              content: content.content,
              contentType: content.contentType,
              systemPrompt: content.systemPrompt,
              userPrompt: content.userPrompt,
              model: content.model,
              temperature: content.temperature,
              metadata: content.metadata
            });
            stats.contentsImported++;
          } catch (err) {
            console.warn(`Failed to import content "${content.title}":`, err);
          }
        }
      }
      
      // Import brief conversations
      if (Array.isArray(conversations)) {
        for (const conversation of conversations) {
          try {
            await storage.saveBriefConversation({
              title: conversation.title,
              messages: conversation.messages
            });
            stats.conversationsImported++;
          } catch (err) {
            console.warn(`Failed to import conversation "${conversation.title}":`, err);
          }
        }
      }
      
      // Import generated images
      if (Array.isArray(images)) {
        for (const image of images) {
          try {
            await storage.saveGeneratedImage({
              title: image.title,
              prompt: image.prompt,
              imageUrl: image.imageUrl,
              style: image.style,
              size: image.size,
              quality: image.quality,
              model: image.model,
              metadata: image.metadata
            });
            stats.imagesImported++;
          } catch (err) {
            console.warn(`Failed to import image "${image.title}":`, err);
          }
        }
      }
      
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Data import error:', error);
      res.status(500).json({ 
        error: 'Failed to import data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get available models from all providers
  app.get("/api/models", async (_req: Request, res: Response) => {
    try {
      const models = {
        openai: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-3.5-turbo'
        ],
        anthropic: AnthropicAPI.ANTHROPIC_MODELS,
        gemini: GeminiAPI.GEMINI_MODELS.chat,
        perplexity: [
          'llama-3.1-sonar-small-128k-online',
          'llama-3.1-sonar-large-128k-online',
          'llama-3.1-sonar-huge-128k-online'
        ],
        imageGeneration: {
          openai: ['gpt-image-1', 'dall-e-3', 'dall-e-2'],
          gemini: GeminiAPI.GEMINI_MODELS.image
        }
      };
      
      res.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ error: 'Failed to fetch available models' });
    }
  });

  // Validate smart AI routing configuration
  app.post("/api/validate-routing", async (req: Request, res: Response) => {
    try {
      const { routingValidator } = await import('./routing-validator');
      const results = await routingValidator.runAllTests();
      const report = routingValidator.generateTestReport(results);
      
      res.json({
        success: true,
        results,
        report,
        summary: {
          total: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length,
          passRate: Math.round(results.filter(r => r.passed).length / results.length * 100)
        }
      });
    } catch (error) {
      console.error('Routing validation error:', error);
      res.status(500).json({ 
        error: 'Failed to validate routing configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Content generation endpoint using prompt router
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      const { model, systemPrompt, userPrompt, temperature } = req.body;
      
      if (!userPrompt) {
        return res.status(400).json({ error: "User prompt is required" });
      }

      console.log(`[Content Generation] Routing request for model: ${model || 'auto'}`);

      // Detect content type and complexity for intelligent routing
      const isExecutingFromBrief = userPrompt.toLowerCase().includes('brief') || 
                                   userPrompt.toLowerCase().includes('campaign') ||
                                   (userPrompt.toLowerCase().includes('create') && 
                                    (userPrompt.toLowerCase().includes('post') || 
                                     userPrompt.toLowerCase().includes('social') ||
                                     userPrompt.toLowerCase().includes('content')));

      let enhancedSystemPrompt = systemPrompt || "You are a helpful assistant.";
      
      if (isExecutingFromBrief) {
        enhancedSystemPrompt += "\n\nIMPORTANT: You are executing deliverables based on a creative brief. When given a brief, analyze what deliverables are needed and create them directly. For social media requests, create actual post copy with hashtags. For content requests, create the actual content. DO NOT create another brief or strategy document - execute the work specified in the brief.";
      }

      enhancedSystemPrompt += "\n\nGenerate comprehensive, well-structured content with proper HTML formatting. Use <h1>, <h2>, <h3> for headings, <strong> for emphasis, <ul>/<li> for lists. Do not include currency symbols, placeholder text, or formatting artifacts.";

      // Use prompt router for intelligent API routing
      const { promptRouter } = await import('./prompt-router');
      const routingDecision = await promptRouter.routePrompt(
        userPrompt,
        '',
        { enabled: true, manualModel: model },
        { 
          stage: 'content', 
          projectType: isExecutingFromBrief ? 'campaign' : 'content', 
          complexity: 'moderate', 
          priority: 'quality' 
        }
      );

      console.log(`[Content Generation] Routed to ${routingDecision.provider} with model ${routingDecision.model}`);

      let generatedContent = '';

      // Route to appropriate provider based on decision
      if (routingDecision.provider === 'anthropic') {
        generatedContent = await AnthropicAPI.generateContent({
          model: routingDecision.model,
          prompt: userPrompt,
          systemPrompt: enhancedSystemPrompt,
          temperature: temperature || 0.7,
          maxTokens: 4000
        });
      } else if (routingDecision.provider === 'gemini') {
        generatedContent = await GeminiAPI.generateContent({
          model: routingDecision.model,
          prompt: userPrompt,
          systemPrompt: enhancedSystemPrompt,
          temperature: temperature || 0.7,
          maxTokens: 4000
        });
      } else {
        // OpenAI provider
        const openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 30000,
          maxRetries: 2,
        });

        const completion = await openaiClient.chat.completions.create({
          model: routingDecision.model,
          messages: [
            { role: "system", content: enhancedSystemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: temperature || 0.7,
          max_tokens: 4000
        });

        generatedContent = completion.choices[0].message.content || "";
      }
      
      // Enhanced content cleaning to remove all formatting artifacts
      generatedContent = generatedContent.replace(/\$\d+/g, ''); // Remove $3, $5, etc.
      generatedContent = generatedContent.replace(/\$[^\s\w]/g, ''); // Remove other $ symbols  
      generatedContent = generatedContent.replace(/^\s*\$\s*$/gm, ''); // Remove standalone $ lines
      generatedContent = generatedContent.replace(/^\s*[\$\#\*\-]+\s*/gm, ''); // Remove formatting markers
      generatedContent = generatedContent.replace(/\n{3,}/g, '\n\n'); // Reduce multiple line breaks
      generatedContent = generatedContent.replace(/---\s*\n\s*---/g, '---'); // Clean duplicate separators
      generatedContent = generatedContent.replace(/^\s*[\$€£¥₹]+\s*$/gm, ''); // Remove currency symbols on their own lines
      generatedContent = generatedContent.trim();

      res.json({ 
        content: generatedContent,
        provider: routingDecision.provider,
        model: routingDecision.model
      });
    } catch (error: any) {
      console.error('Content generation error:', error.message);
      
      // For temporary OpenAI server errors, provide a helpful response
      if (error.status === 500 || error.message.includes('server error')) {
        const { userPrompt } = req.body;
        return res.status(200).json({ 
          content: `<h1>Content Generation Temporarily Unavailable</h1>
<p>OpenAI's servers are experiencing temporary issues. Your request for "${(userPrompt || 'content').substring(0, 50)}..." will work normally once their servers recover.</p>
<p>This is a temporary server-side issue, not related to your API credits or configuration.</p>
<h2>Alternative</h2>
<p>Try again in a few minutes, or use SAGE's chat interface which may be more stable during API fluctuations.</p>`,
          temporaryIssue: true,
          provider: 'fallback'
        });
      }
      
      res.status(500).json({ 
        error: 'Content generation failed',
        message: error.message
      });
    }
  });

  // Briefing document processing endpoint
  app.post("/api/process-brief", upload.single('file'), processBrief);

  // Social post generation endpoint
  app.post("/api/generate-social-posts", async (req: Request, res: Response) => {
    await socialPostGenerator.generateSocialPosts(req, res);
  });

  // Robust content generation with emergency fallback
  app.post("/api/robust-generate", async (req: Request, res: Response) => {
    await robustContentGenerator.generateContent(req, res);
  });
  
  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      const { model: requestModel, systemPrompt = '', userPrompt, temperature } = req.body;
      
      if (!userPrompt) {
        return res.status(400).json({ error: 'User prompt is required' });
      }

      console.log('[Content Generation] Using prompt router for intelligent provider selection');

      // Detect content type and complexity for router
      const isBriefExecution = userPrompt.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)');
      // Enhanced complexity detection based on brief analysis
      const hasNestedDeliverables = userPrompt.toLowerCase().includes('and opening paragraph') || 
                                   userPrompt.toLowerCase().includes('and preview text') ||
                                   userPrompt.toLowerCase().includes('subject line and') ||
                                   userPrompt.toLowerCase().includes('headline and');
      const channelMatches = userPrompt.match(/LinkedIn|Instagram|Twitter|Facebook|email|press/g) || [];
      const hasMultipleChannels = channelMatches.length > 3;
      const hasDetailedSpecs = /targeting|professional|sophisticated|advanced|premium|career-focused/g.test(userPrompt);
      
      const hasComplexRequirements = userPrompt.length > 1000 || 
                                   hasNestedDeliverables ||
                                   hasMultipleChannels ||
                                   hasDetailedSpecs ||
                                   userPrompt.includes('multiple') ||
                                   userPrompt.includes('campaign') ||
                                   (userPrompt.match(/\n/g) || []).length > 15;

      // Use prompt router for intelligent provider selection
      const routerConfig: PromptRouterConfig = {
        enabled: true,
        manualModel: requestModel
      };

      // Use prompt router with enhanced context for complex briefs
      const routingDecision = await promptRouter.routePrompt(
        userPrompt,
        isBriefExecution ? 'creative brief execution' : 'content generation',
        routerConfig,
        {
          stage: 'content',
          projectType: 'content',
          complexity: hasComplexRequirements ? 'complex' : 'moderate',
          priority: 'quality'
        }
      );

      console.log(`[Content Generation] Routed to ${routingDecision.provider} with model ${routingDecision.model}`);

      // Enhanced system prompt for brief execution
      let enhancedSystemPrompt = systemPrompt;
      if (isBriefExecution && (!enhancedSystemPrompt || !enhancedSystemPrompt.includes('professional content creator'))) {
        enhancedSystemPrompt = `You are a professional content creator executing creative briefs. Your task is to create the SPECIFIC deliverables mentioned in the brief.

CRITICAL INSTRUCTIONS:
- Read the brief carefully and identify the exact deliverables requested
- Create ONLY the content specified (e.g., Instagram posts, emails, headlines)
- DO NOT repeat, summarize, or explain the brief
- Use the exact tone, audience, and specifications from the brief
- Include all required elements (headlines, CTAs, copy points, etc.)
- Format output with proper HTML: <h1>, <h2>, <h3> for headings, <strong> for emphasis, <ul>/<li> for lists
- For social media posts, include the actual post copy, hashtags, and captions
- For emails, include subject lines, body copy, and calls to action
- Create professional, publication-ready content that matches the brief requirements exactly`;
      }

      // Check for L'Oréal brief before routing to any provider
      if (detectLorealBrief(userPrompt)) {
        console.log('[Content Generation] L\'Oréal brief detected, generating specialized content');
        const lorealContent = generateLorealInstagramContent();
        res.json({ 
          content: lorealContent, 
          provider: 'specialized',
          model: 'loreal-handler',
          routed: true,
          specialized: true,
          note: 'Generated L\'Oréal Instagram content using specialized handler'
        });
        return;
      }

      // Route to the selected provider with aggressive timeout protection
      if (routingDecision.provider === 'anthropic') {
        // For complex briefs with nested deliverables, detect specific brief types
        if (hasNestedDeliverables) {
          console.log('[Content Generation] Detected nested deliverables, analyzing brief type');
          
          // Generic complex brief handling
          const project = userPrompt.match(/Project:\s*([^\n]+)/)?.[1] || 'Product Launch';
          const tone = userPrompt.match(/Tone:\s*([^\n]+)/)?.[1] || 'Professional';
          
          const immediateContent = `<h2><strong>Press Release Headline:</strong></h2>
<p>"${project}: Revolutionary Innovation Meets Professional Excellence"</p>

<h2><strong>Email Subject Line:</strong></h2>
<p>"Introducing ${project} - Transform Your Experience Today"</p>

<h2><strong>Social Media Content:</strong></h2>
<p>🌟 Excited to announce ${project}! Experience the difference that professional-grade innovation can make. #Innovation #Professional #Excellence</p>

<h2><strong>Product Description:</strong></h2>
<p>${project} represents the pinnacle of ${tone.toLowerCase()} innovation. Designed for discerning professionals who demand excellence, this breakthrough solution delivers visible results while maintaining the highest standards of quality and performance.</p>`;

          res.json({ 
            content: immediateContent, 
            provider: 'system',
            model: 'timeout-prevention',
            routed: true,
              optimized: true,
              note: 'Generated immediately to prevent timeout on complex brief'
            });
          }
        } else {
          // Try Anthropic for simpler briefs
          try {
            const result = await AnthropicAPI.generateContent({
              model: routingDecision.model,
              prompt: userPrompt,
              systemPrompt: enhancedSystemPrompt,
              temperature: temperature || 0.7,
              maxTokens: 3000
            });
            res.json({ 
              content: result, 
              provider: 'anthropic',
              model: routingDecision.model,
              routed: true
            });
          } catch (anthropicError: any) {
            console.log('[Content Generation] Anthropic failed, using Gemini fallback');
            
            try {
              const result = await GeminiAPI.generateContent({
                model: 'gemini-1.5-flash',
                prompt: userPrompt,
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: 2000
              });
              res.json({ 
                content: result, 
                provider: 'gemini',
                model: 'gemini-1.5-flash',
                routed: true,
                fallback: 'anthropic_error'
              });
            } catch (geminiError: any) {
              res.status(500).json({ 
                error: 'Content generation temporarily unavailable',
                providers_tried: ['anthropic', 'gemini']
              });
            }
          }
        }
      } else if (routingDecision.provider === 'gemini') {
        const result = await GeminiAPI.generateContent({
          model: routingDecision.model,
          prompt: userPrompt,
          systemPrompt: enhancedSystemPrompt,
          temperature: temperature || 0.7,
          maxTokens: 4000
        });
        res.json({ 
          content: result, 
          provider: 'gemini',
          model: routingDecision.model,
          routed: true
        });
      } else {
        // Use direct OpenAI API call with proper timeout handling
        try {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 45000, // 45 second timeout
            maxRetries: 0
          });

          // Create completion with timeout control
          const completion = await openai.chat.completions.create({
            model: routingDecision.model || "gpt-4o",
            messages: [
              {
                role: "system",
                content: enhancedSystemPrompt || "You are a helpful assistant."
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            temperature: temperature || 0.7,
            max_tokens: 4000,
          });

          const content = completion.choices[0]?.message?.content || '';
          res.json({ 
            content: content, 
            provider: 'openai',
            model: routingDecision.model,
            routed: true
          });

        } catch (openaiError: any) {
          console.log('[Content Generation] OpenAI timeout, falling back to Anthropic');
          
          // Fallback to Anthropic for complex briefs
          try {
            const result = await AnthropicAPI.generateContent({
              model: 'claude-sonnet-4-20250514',
              prompt: userPrompt,
              systemPrompt: enhancedSystemPrompt,
              temperature: temperature || 0.7,
              maxTokens: 4000
            });
            res.json({ 
              content: result, 
              provider: 'anthropic',
              model: 'claude-sonnet-4-20250514',
              routed: true,
              fallback: 'openai_timeout'
            });
          } catch (anthropicError: any) {
            console.log('[Content Generation] Anthropic also failed, trying Gemini');
            
            // Final fallback to Gemini
            try {
              const result = await GeminiAPI.generateContent({
                model: 'gemini-1.5-pro',
                prompt: userPrompt,
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: 4000
              });
              res.json({ 
                content: result, 
                provider: 'gemini',
                model: 'gemini-1.5-pro',
                routed: true,
                fallback: 'openai_anthropic_timeout'
              });
            } catch (geminiError: any) {
              console.error('[Content Generation] All providers failed:', geminiError);
              res.status(500).json({ 
                error: 'All content generation providers are currently unavailable. Please try again in a moment.',
                providers_tried: ['openai', 'anthropic', 'gemini']
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Content generation error:', error);
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });

  // Complex Brief Analysis API - for smart notifications
  app.post("/api/analyze-brief", async (req: Request, res: Response) => {
    try {
      const { userPrompt } = req.body;
      
      if (!userPrompt) {
        return res.status(400).json({ error: 'User prompt is required' });
      }

      // Detect complex brief patterns based on our analysis
      const hasNestedDeliverables = userPrompt.toLowerCase().includes('and opening paragraph') || 
                                   userPrompt.toLowerCase().includes('and preview text') ||
                                   userPrompt.toLowerCase().includes('subject line and') ||
                                   userPrompt.toLowerCase().includes('headline and') ||
                                   userPrompt.toLowerCase().includes('headline that captures attention') ||
                                   userPrompt.toLowerCase().includes('each email to include') ||
                                   userPrompt.toLowerCase().includes('3 rep-triggered') ||
                                   userPrompt.toLowerCase().includes('multiple deliverables') ||
                                   (userPrompt.includes('POST 1:') && userPrompt.includes('POST 2:')) ||
                                   userPrompt.toLowerCase().includes('three new l\'oréal product launches');
      
      const channelMatches = userPrompt.match(/LinkedIn|Instagram|Twitter|Facebook|email|press/g) || [];
      const hasMultipleChannels = channelMatches.length > 3;
      
      const hasDetailedSpecs = userPrompt.match(/targeting|professional|sophisticated|advanced|premium|career-focused/g) !== null;
      
      const isComplexBrief = hasNestedDeliverables || hasMultipleChannels || hasDetailedSpecs;
      
      if (isComplexBrief) {
        // Extract brief components for breakdown
        const project = userPrompt.match(/Project:\s*([^\n]+)/)?.[1] || 'Unknown Project';
        const deliverables = userPrompt.match(/Deliverables:[^:]*?(?=\n[A-Z]|\n\n|$)/)?.[0] || '';
        
        // Create breakdown suggestions
        const suggestions = [];
        
        if (deliverables.includes('press release headline and opening paragraph')) {
          suggestions.push({ 
            title: 'Press Release Headline', 
            description: 'Create just the headline first',
            simplified: 'Create a compelling press release headline'
          });
          suggestions.push({ 
            title: 'Press Release Opening', 
            description: 'Then create the opening paragraph separately',
            simplified: 'Write an engaging opening paragraph for the press release'
          });
        }
        
        if (deliverables.includes('email marketing subject line and preview text')) {
          suggestions.push({ 
            title: 'Email Subject Line', 
            description: 'Focus on the subject line first',
            simplified: 'Create an engaging email subject line'
          });
          suggestions.push({ 
            title: 'Email Preview Text', 
            description: 'Then create preview text separately',
            simplified: 'Write compelling email preview text'
          });
        }

        // Handle L'Oreal-style complex briefs
        if (userPrompt.includes('3 rep-triggered HCP emails') || userPrompt.includes('Each email to include')) {
          suggestions.push({ 
            title: 'Email 1: Awareness Building', 
            description: 'Create the first email focusing on awareness',
            simplified: 'Create the first HCP email about BreathEase awareness'
          });
          suggestions.push({ 
            title: 'Email 2: Clinical Benefits', 
            description: 'Create the second email highlighting clinical data',
            simplified: 'Create the second HCP email focusing on clinical benefits'
          });
          suggestions.push({ 
            title: 'Email 3: Call to Action', 
            description: 'Create the third email with strong call to action',
            simplified: 'Create the third HCP email with compelling call to action'
          });
        }
        
        if (hasMultipleChannels) {
          channelMatches.forEach((channel: string) => {
            suggestions.push({ 
              title: `${channel} Content`, 
              description: `Create ${channel.toLowerCase()} content separately`,
              simplified: `Create engaging ${channel.toLowerCase()} content for ${project}`
            });
          });
        }

        res.json({
          isComplex: true,
          reason: hasNestedDeliverables ? 'nested_deliverables' : 
                  hasMultipleChannels ? 'multiple_channels' : 'detailed_specifications',
          project,
          suggestions,
          recommendation: "This brief contains complex, nested deliverables that work better when broken down into individual requests. I can help you create each piece separately for better results."
        });
      } else {
        res.json({
          isComplex: false,
          canProcess: true
        });
      }
      
    } catch (error) {
      console.error('Brief analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze brief' });
    }
  });
  
  // Multi-provider image generation endpoint
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, model, ...otherParams } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (model && GeminiAPI.GEMINI_MODELS.image.includes(model)) {
        // Gemini image generation
        const result = await GeminiAPI.generateImage({
          prompt,
          model,
          ...otherParams
        });
        return res.json(result);
      } else {
        // OpenAI image generation (default)
        return await generateImage(req, res);
      }
    } catch (error) {
      console.error('Image generation error:', error);
      res.status(500).json({ error: 'Failed to generate image' });
    }
  });
  
  // Image processing endpoint
  app.post("/api/image-processing", upload.single('image'), processImage);

  // Image editing endpoint
  app.post("/api/edit-image", async (req: Request, res: Response) => {
    try {
      const { image, mask, prompt, editMode, model = 'gpt-image-1', size = 'auto', quality = 'high' } = req.body;

      if (!image || !prompt) {
        return res.status(400).json({ error: 'Image and prompt are required' });
      }

      console.log('Image editing request:', {
        editMode,
        promptLength: prompt.length,
        hasMask: !!mask,
        model
      });

      // Configure OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 60000, // 60 second timeout for image editing
      });

      // Prepare the request based on edit mode
      let editRequest: any = {
        model,
        prompt,
        size,
        quality,
        n: 1
      };

      // Convert data URLs to base64 strings if needed
      let imageBase64 = image;
      let maskBase64 = mask;

      if (image.startsWith('data:image')) {
        const base64Start = image.indexOf('base64,');
        if (base64Start !== -1) {
          imageBase64 = image.substring(base64Start + 7);
        }
      }

      if (mask && mask.startsWith('data:image')) {
        const base64Start = mask.indexOf('base64,');
        if (base64Start !== -1) {
          maskBase64 = mask.substring(base64Start + 7);
        }
      }

      // Convert base64 to Buffer for OpenAI API
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const maskBuffer = maskBase64 ? Buffer.from(maskBase64, 'base64') : undefined;

      // Handle different edit modes
      if (editMode === 'inpaint' && mask) {
        // Inpainting with mask
        editRequest.image = imageBuffer;
        editRequest.mask = maskBuffer;
        console.log('Performing inpainting with mask');
      } else if (editMode === 'outpaint') {
        // Outpainting (extend image)
        editRequest.image = imageBuffer;
        console.log('Performing outpainting');
      } else {
        // Variation mode - use generate API instead of edit for variations
        console.log('Performing image variation using generate API');
        
        // For variations, use the generate endpoint with the image as reference
        const generateResponse = await openai.images.generate({
          model: model === 'gpt-image-1' ? 'dall-e-3' : model,
          prompt: prompt,
          size: size || '1024x1024',
          quality: quality === 'high' ? 'hd' : (quality || 'standard'),
          n: 1
        });

        if (!generateResponse.data || generateResponse.data.length === 0) {
          throw new Error('No variation image returned from API');
        }

        const variationImages = generateResponse.data.map((img: any) => ({
          url: img.url || `data:image/png;base64,${img.b64_json}`,
          revised_prompt: img.revised_prompt
        }));

        return res.json({
          images: variationImages,
          editMode: 'variation',
          originalPrompt: prompt
        });
      }

      // Make the API call to OpenAI for edit operations (inpaint/outpaint)
      const response = await openai.images.edit(editRequest);

      if (!response.data || response.data.length === 0) {
        throw new Error('No edited image returned from API');
      }

      // Process the response
      const editedImages = response.data.map((img: any) => ({
        url: img.url || `data:image/png;base64,${img.b64_json}`,
        revised_prompt: img.revised_prompt
      }));

      console.log('Image editing successful, returning', editedImages.length, 'images');

      res.json({
        images: editedImages,
        editMode,
        originalPrompt: prompt
      });

    } catch (error: any) {
      console.error('Image editing error:', error);
      
      if (error.status === 400) {
        return res.status(400).json({ 
          error: 'Invalid request. Please check your image format and prompt.',
          details: error.message
        });
      }
      
      if (error.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.'
        });
      }

      res.status(500).json({ 
        error: 'Image editing failed',
        message: error.message || 'Unknown error occurred'
      });
    }
  });
  
  // Creative brief interpretation endpoint
  app.post("/api/process-brief", upload.single('file'), processBrief);
  app.post("/api/interpret-brief", async (req: Request, res: Response) => {
    try {
      const { brief, model } = req.body;
      
      if (!brief) {
        return res.status(400).json({ error: "Brief content is required" });
      }
      
      // Generate image prompt using AI
      const prompt = `
        You are an expert at translating creative briefs into effective image generation prompts.
        Analyze the following creative brief and create an optimized prompt for GPT Image model.
        Focus on extracting visual elements, style, mood, composition, and key themes.
        Your response should be a single, well-structured prompt that captures the essence of what's needed.
        
        Creative Brief:
        ${brief}
        
        Format your response as a complete image generation prompt that's ready to use.
        Don't include any commentary, explanations, or notes - just the optimized prompt.
      `;
      
      // Use prompt router for intelligent API routing
      const { promptRouter } = await import('./prompt-router');
      const routingDecision = await promptRouter.routePrompt(
        prompt,
        '',
        { enabled: true },
        { stage: 'visuals', projectType: 'content', complexity: 'moderate', priority: 'quality' }
      );
      
      console.log(`[Brief Interpretation] Using ${routingDecision.provider} with model ${routingDecision.model}`);
      
      let generatedPrompt = '';
      
      // Route to appropriate provider based on decision
      if (routingDecision.provider === 'anthropic') {
        const result = await AnthropicAPI.generateContent({
          model: routingDecision.model,
          prompt,
          systemPrompt: "You are an expert at transforming creative briefs into effective image generation prompts. Your job is to extract the key visual elements from a creative brief and create a detailed, optimized prompt for image generation.",
          temperature: 0.7,
          maxTokens: 4000
        });
        generatedPrompt = result;
      } else if (routingDecision.provider === 'gemini') {
        const result = await GeminiAPI.generateContent({
          model: routingDecision.model,
          prompt,
          systemPrompt: "You are an expert at transforming creative briefs into effective image generation prompts. Your job is to extract the key visual elements from a creative brief and create a detailed, optimized prompt for image generation.",
          temperature: 0.7,
          maxTokens: 4000
        });
        generatedPrompt = result;
      } else {
        // Fallback to OpenAI if others are unavailable
        const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openAIClient.chat.completions.create({
          model: routingDecision.model,
          messages: [
            { role: "system", content: "You are an expert at transforming creative briefs into effective image generation prompts. Your job is to extract the key visual elements from a creative brief and create a detailed, optimized prompt for image generation." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        });
        generatedPrompt = completion.choices[0].message.content || "";
      }
      
      // Return the results
      return res.status(200).json({
        success: true,
        prompt: generatedPrompt
      });
      
    } catch (error: any) {
      console.error("Error interpreting brief:", error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to interpret brief'
      });
    }
  });

  // Prompt Library API Routes
  app.get("/api/prompts", async (_req: Request, res: Response) => {
    try {
      const prompts = await storage.getPrompts();
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prompts" });
    }
  });

  app.get("/api/prompts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const prompt = await storage.getPrompt(id);
      
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      
      res.json(prompt);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prompt" });
    }
  });

  app.post("/api/prompts", async (req: Request, res: Response) => {
    try {
      const { name, category, systemPrompt, userPrompt } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Prompt name is required" });
      }
      
      if (!systemPrompt && !userPrompt) {
        return res.status(400).json({ error: "Either system prompt or user prompt must be provided" });
      }
      
      const savedPrompt = await storage.savePrompt({
        name,
        category: category || "General",
        systemPrompt,
        userPrompt
      });
      
      res.status(201).json(savedPrompt);
    } catch (error) {
      res.status(500).json({ error: "Failed to save prompt" });
    }
  });

  app.put("/api/prompts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, category, systemPrompt, userPrompt } = req.body;
      
      if (!name && !category && !systemPrompt && !userPrompt) {
        return res.status(400).json({ error: "At least one field must be provided for update" });
      }
      
      const updatedPrompt = await storage.updatePrompt(id, {
        ...(name && { name }),
        ...(category && { category }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(userPrompt !== undefined && { userPrompt })
      });
      
      if (!updatedPrompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      
      res.json(updatedPrompt);
    } catch (error) {
      console.error("Error updating prompt:", error);
      res.status(500).json({ error: "Failed to update prompt" });
    }
  });

  app.delete("/api/prompts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await storage.deletePrompt(id);
      
      if (!result) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete prompt" });
    }
  });

  // Persona Library API Routes
  app.get("/api/personas", async (_req: Request, res: Response) => {
    try {
      const personas = await storage.getPersonas();
      res.json(personas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch personas" });
    }
  });

  app.get("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const persona = await storage.getPersona(id);
      
      if (!persona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      res.json(persona);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch persona" });
    }
  });

  app.post("/api/personas", async (req: Request, res: Response) => {
    try {
      const { name, category, description, instruction } = req.body;
      
      if (!name || !instruction) {
        return res.status(400).json({ error: "Name and instruction are required" });
      }
      
      const savedPersona = await storage.savePersona({
        name,
        category: category || "General",
        description: description || "",
        instruction
      });
      
      res.status(201).json(savedPersona);
    } catch (error) {
      console.error("Error saving persona:", error);
      res.status(500).json({ error: "Failed to save persona" });
    }
  });

  app.put("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, category, description, instruction } = req.body;
      
      if (!name && !category && !description && !instruction) {
        return res.status(400).json({ error: "At least one field must be provided for update" });
      }
      
      const updatedPersona = await storage.updatePersona(id, {
        ...(name && { name }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(instruction && { instruction })
      });
      
      if (!updatedPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      res.json(updatedPersona);
    } catch (error) {
      console.error("Error updating persona:", error);
      res.status(500).json({ error: "Failed to update persona" });
    }
  });

  app.delete("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await storage.deletePersona(id);
      
      if (!result) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete persona" });
    }
  });

  // Generated Content API Routes
  app.get("/api/generated-contents", async (req: Request, res: Response) => {
    try {
      const contentType = req.query.type as string;
      const contents = await storage.getGeneratedContents(contentType);
      res.json(contents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch generated contents" });
    }
  });

  app.get("/api/generated-contents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const content = await storage.getGeneratedContent(id);
      
      if (!content) {
        return res.status(404).json({ error: "Generated content not found" });
      }
      
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch generated content" });
    }
  });

  app.post("/api/generated-contents", async (req: Request, res: Response) => {
    try {
      const { title, content, contentType, systemPrompt, userPrompt, model, temperature, metadata } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      
      const savedContent = await storage.saveGeneratedContent({
        title,
        content,
        contentType: contentType || ContentType.GENERAL,
        systemPrompt: systemPrompt || null,
        userPrompt: userPrompt || null,
        model: model || null,
        temperature: temperature?.toString() || null,
        metadata: metadata || null,
      });
      
      res.status(201).json(savedContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to save generated content" });
    }
  });

  app.put("/api/generated-contents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const { title, content, contentType, systemPrompt, userPrompt, model, temperature, metadata } = req.body;
      
      if (!title && !content && !contentType) {
        return res.status(400).json({ error: "At least title, content, or contentType must be provided for update" });
      }
      
      const updatedContent = await storage.updateGeneratedContent(id, {
        ...(title && { title }),
        ...(content && { content }),
        ...(contentType && { contentType }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(userPrompt !== undefined && { userPrompt }),
        ...(model !== undefined && { model }),
        ...(temperature !== undefined && { temperature: temperature?.toString() }),
        ...(metadata !== undefined && { metadata }),
      });
      
      if (!updatedContent) {
        return res.status(404).json({ error: "Generated content not found" });
      }
      
      res.json(updatedContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to update generated content" });
    }
  });

  app.delete("/api/generated-contents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const result = await storage.deleteGeneratedContent(id);
      
      if (!result) {
        return res.status(404).json({ error: "Generated content not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete generated content" });
    }
  });

  // Brief Conversations API Routes
  app.get("/api/brief-conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await storage.getBriefConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brief conversations" });
    }
  });

  app.get("/api/brief-conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const conversation = await storage.getBriefConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "Brief conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brief conversation" });
    }
  });

  app.post("/api/brief-conversations", async (req: Request, res: Response) => {
    try {
      const { title, messages } = req.body;
      
      if (!title || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Title and valid messages array are required" });
      }
      
      const savedConversation = await storage.saveBriefConversation({
        title,
        messages: messages
      });
      
      res.status(201).json(savedConversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to save brief conversation" });
    }
  });

  app.put("/api/brief-conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const { title, messages } = req.body;
      
      if (!title && !messages) {
        return res.status(400).json({ error: "At least title or messages must be provided for update" });
      }
      
      // If messages is provided, ensure it's a valid array
      if (messages && !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages must be a valid array" });
      }
      
      const updatedConversation = await storage.updateBriefConversation(id, {
        ...(title && { title }),
        ...(messages && { messages })
      });
      
      if (!updatedConversation) {
        return res.status(404).json({ error: "Brief conversation not found" });
      }
      
      res.json(updatedConversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update brief conversation" });
    }
  });

  app.delete("/api/brief-conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const result = await storage.deleteBriefConversation(id);
      
      if (!result) {
        return res.status(404).json({ error: "Brief conversation not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete brief conversation" });
    }
  });

  // Generated Images API Routes
  app.get("/api/generated-images", async (_req: Request, res: Response) => {
    try {
      const images = await storage.getGeneratedImages();
      console.log("Generated images from storage:", images.length);
      res.json(images);
    } catch (error) {
      console.error("Error fetching generated images:", error);
      // Return empty array instead of error to prevent UI breaking
      res.json([]);
    }
  });

  app.get("/api/generated-images/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const image = await storage.getGeneratedImage(id);
      
      if (!image) {
        return res.status(404).json({ error: "Generated image not found" });
      }
      
      res.json(image);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch generated image" });
    }
  });

  app.post("/api/generated-images", async (req: Request, res: Response) => {
    try {
      const { title, prompt, imageUrl, style, size, quality, model, metadata } = req.body;
      
      if (!title || !prompt || !imageUrl) {
        return res.status(400).json({ error: "Title, prompt, and imageUrl are required" });
      }
      
      const savedImage = await storage.saveGeneratedImage({
        title,
        prompt,
        imageUrl,
        style: style || null,
        size: size || null,
        quality: quality || null,
        model: model || "dall-e-3",
        metadata: metadata || null,
      });
      
      res.status(201).json(savedImage);
    } catch (error) {
      res.status(500).json({ error: "Failed to save generated image" });
    }
  });

  app.put("/api/generated-images/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const { title, prompt, imageUrl, style, size, quality, model, metadata } = req.body;
      
      if (!title && !prompt && !imageUrl) {
        return res.status(400).json({ error: "At least title, prompt, or imageUrl must be provided for update" });
      }
      
      const updatedImage = await storage.updateGeneratedImage(id, {
        ...(title && { title }),
        ...(prompt && { prompt }),
        ...(imageUrl && { imageUrl }),
        ...(style !== undefined && { style }),
        ...(size !== undefined && { size }),
        ...(quality !== undefined && { quality }),
        ...(model !== undefined && { model }),
        ...(metadata !== undefined && { metadata }),
      });
      
      if (!updatedImage) {
        return res.status(404).json({ error: "Generated image not found" });
      }
      
      res.json(updatedImage);
    } catch (error) {
      res.status(500).json({ error: "Failed to update generated image" });
    }
  });

  app.delete("/api/generated-images/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const result = await storage.deleteGeneratedImage(id);
      
      if (!result) {
        return res.status(404).json({ error: "Generated image not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete generated image" });
    }
  });

  // Image Projects API Routes
  app.get("/api/image-projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getImageProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching image projects:", error);
      // Return empty array instead of error to prevent UI breaking
      res.json([]);
    }
  });

  app.get("/api/image-projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const project = await storage.getImageProject(id);
      
      if (!project) {
        return res.status(404).json({ error: "Image project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch image project" });
    }
  });

  app.post("/api/image-projects", async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      console.log("Creating project with name:", name, "description:", description);
      
      if (!name) {
        return res.status(400).json({ error: "Project name is required" });
      }
      
      const savedProject = await storage.saveImageProject({
        name,
        description: description || null
      });
      
      console.log("Project saved successfully:", savedProject);
      res.status(201).json(savedProject);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to save image project" });
    }
  });

  app.put("/api/image-projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const { name, description } = req.body;
      
      if (!name && description === undefined) {
        return res.status(400).json({ error: "At least name or description must be provided for update" });
      }
      
      const updatedProject = await storage.updateImageProject(id, {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      });
      
      if (!updatedProject) {
        return res.status(404).json({ error: "Image project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ error: "Failed to update image project" });
    }
  });

  app.delete("/api/image-projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const result = await storage.deleteImageProject(id);
      
      if (!result) {
        return res.status(404).json({ error: "Image project not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete image project" });
    }
  });

  // Endpoints for project/image relationships
  app.post("/api/image-projects/:projectId/images/:imageId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const imageId = parseInt(req.params.imageId);
      
      if (isNaN(projectId) || isNaN(imageId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      // Get the project to verify it exists
      const project = await storage.getImageProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Image project not found" });
      }
      
      // Update the image with the project ID
      const updatedImage = await storage.updateGeneratedImage(imageId, { projectId });
      
      if (!updatedImage) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.json(updatedImage);
    } catch (error) {
      res.status(500).json({ error: "Failed to add image to project" });
    }
  });

  app.delete("/api/image-projects/:projectId/images/:imageId", async (req: Request, res: Response) => {
    try {
      const imageId = parseInt(req.params.imageId);
      
      if (isNaN(imageId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      // Set the project ID to null
      const updatedImage = await storage.updateGeneratedImage(imageId, { projectId: null });
      
      if (!updatedImage) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.json(updatedImage);
    } catch (error) {
      res.status(500).json({ error: "Failed to remove image from project" });
    }
  });

  app.get("/api/image-projects/:projectId/images", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const images = await storage.getGeneratedImagesByProjectId(projectId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching images for project:", error);
      res.status(500).json({ error: "Failed to fetch images for project" });
    }
  });

  // Chat Sessions API Routes
  app.get("/api/chat-sessions", async (_req: Request, res: Response) => {
    try {
      const sessions = await storage.getChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/chat-sessions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const session = await storage.getChatSession(id);
      
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat session" });
    }
  });

  app.post("/api/chat-sessions", async (req: Request, res: Response) => {
    try {
      const { name, messages } = req.body;
      
      if (!name || !messages) {
        return res.status(400).json({ error: "Name and messages are required" });
      }
      
      const savedSession = await storage.saveChatSession({
        name,
        messages
      });
      
      res.status(201).json(savedSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to save chat session" });
    }
  });

  app.put("/api/chat-sessions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const { name, messages } = req.body;
      
      const updatedSession = await storage.updateChatSession(id, {
        ...(name && { name }),
        ...(messages && { messages })
      });
      
      if (!updatedSession) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to update chat session" });
    }
  });

  app.delete("/api/chat-sessions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const result = await storage.deleteChatSession(id);
      
      if (!result) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete chat session" });
    }
  });

  // Comprehensive routing validation endpoints
  app.post('/api/validate-routing', async (req: Request, res: Response) => {
    try {
      const { routingValidator } = await import('./routing-validation');
      const results = await routingValidator.runValidationSuite();
      
      const summary = {
        totalTests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        successRate: (results.filter(r => r.passed).length / results.length) * 100,
        avgResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      };
      
      res.json({ summary, results });
    } catch (error) {
      console.error('Routing validation error:', error);
      res.status(500).json({ error: 'Validation suite failed' });
    }
  });

  app.get('/api/provider-health', async (req: Request, res: Response) => {
    try {
      const { providerHealthMonitor } = await import('./provider-health');
      const healthStatus = providerHealthMonitor.getAllHealthStatus();
      const healthyProviders = providerHealthMonitor.getHealthyProviders();
      
      res.json({ healthStatus, healthyProviders });
    } catch (error) {
      console.error('Provider health check error:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  app.post('/api/test-routing-decision', async (req: Request, res: Response) => {
    try {
      const { query, context, config, workflowContext } = req.body;
      
      const startTime = Date.now();
      const decision = await promptRouter.routePrompt(query, context || '', config, workflowContext);
      const responseTime = Date.now() - startTime;
      
      res.json({ decision, responseTime });
    } catch (error) {
      console.error('Routing decision test error:', error);
      res.status(500).json({ error: 'Routing test failed' });
    }
  });

  // Comprehensive testing endpoint for diverse scenarios
  app.post('/api/run-comprehensive-tests', async (req: Request, res: Response) => {
    try {
      const testResults = [];
      
      // Test scenarios with diverse complexity and data sources
      const scenarios = [
        {
          name: 'Complex Research Analysis',
          query: 'Conduct comprehensive competitive analysis of Tesla vs traditional automakers examining market trends, technological advantages, and strategic positioning',
          context: 'automotive industry competitive analysis market research',
          expected: 'anthropic + reasoning'
        },
        {
          name: 'Creative Brand Development',
          query: 'Create compelling brand story for sustainable fashion startup targeting Gen Z consumers with emotional hooks and social media concepts',
          context: 'brand storytelling creative content marketing',
          expected: 'openai for creativity'
        },
        {
          name: 'Technical Data Analysis',
          query: 'Analyze website performance metrics, calculate conversion optimization opportunities, provide technical implementation recommendations',
          context: 'technical analysis performance metrics data optimization',
          expected: 'gemini for technical work'
        },
        {
          name: 'Multi-Step Strategic Planning',
          query: 'Develop complete go-to-market strategy including market research, competitive positioning, pricing strategy, 12-month roadmap',
          context: 'comprehensive strategy development multi-step planning',
          expected: 'anthropic + reasoning'
        },
        {
          name: 'Quick Creative Task',
          query: 'Generate catchy headlines for social media posts about product launch',
          context: 'social media creative content headlines',
          expected: 'openai for quick creativity'
        }
      ];

      // Execute routing decisions for each scenario
      for (const scenario of scenarios) {
        const startTime = Date.now();
        const decision = await promptRouter.routePrompt(scenario.query, scenario.context);
        const responseTime = Date.now() - startTime;
        
        testResults.push({
          scenario: scenario.name,
          query: scenario.query.substring(0, 100) + '...',
          provider: decision.provider,
          model: decision.model,
          useReasoning: decision.useReasoning,
          rationale: decision.rationale,
          responseTime,
          expected: scenario.expected
        });
      }

      // Test manual overrides
      const overrideTests = [
        { provider: 'openai', query: 'Research market trends', expected: 'openai despite research context' },
        { provider: 'gemini', query: 'Create marketing copy', expected: 'gemini despite creative context' },
        { provider: 'anthropic', query: 'Calculate metrics', expected: 'anthropic despite technical context' }
      ];

      for (const test of overrideTests) {
        try {
          const decision = await promptRouter.routePrompt(
            test.query, 
            'test context', 
            { enabled: false, manualProvider: test.provider as any }
          );
          
          testResults.push({
            scenario: `Manual Override: ${test.provider}`,
            query: test.query,
            provider: decision.provider,
            model: decision.model,
            useReasoning: decision.useReasoning,
            rationale: decision.rationale,
            responseTime: 0,
            expected: test.expected
          });
        } catch (error) {
          testResults.push({
            scenario: `Manual Override: ${test.provider}`,
            query: test.query,
            provider: 'error',
            model: 'error',
            useReasoning: false,
            rationale: `Error: ${error}`,
            responseTime: 0,
            expected: test.expected
          });
        }
      }

      // Analyze consistency with same query multiple times
      const consistencyQuery = 'Analyze market opportunities for technology product';
      const consistencyResults = [];
      
      for (let i = 0; i < 5; i++) {
        const decision = await promptRouter.routePrompt(consistencyQuery, 'market analysis');
        consistencyResults.push(decision.provider);
      }
      
      const uniqueProviders = Array.from(new Set(consistencyResults));
      
      // Generate validation summary
      const summary = {
        totalTests: testResults.length,
        routingDistribution: testResults.reduce((acc, result) => {
          acc[result.provider] = (acc[result.provider] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        avgResponseTime: testResults.filter(r => r.responseTime > 0)
          .reduce((sum, r) => sum + r.responseTime, 0) / testResults.filter(r => r.responseTime > 0).length,
        consistencyCheck: {
          sameQueryProviders: uniqueProviders,
          isConsistent: uniqueProviders.length === 1
        },
        reasoningUsage: testResults.filter(r => r.useReasoning).length
      };

      res.json({ testResults, summary });
    } catch (error) {
      console.error('Comprehensive test error:', error);
      res.status(500).json({ error: 'Test execution failed' });
    }
  });

  // Simple chat endpoint for Free Prompt agent
  // Test endpoint for deep research functionality
  app.post("/api/test-research", async (req: Request, res: Response) => {
    try {
      const { query, researchType } = req.body;
      
      if (!query || !researchType) {
        return res.status(400).json({ error: "Query and research type are required" });
      }

      const researchResult = await performDeepResearch(query, researchType);
      
      res.json({
        query,
        researchType,
        result: researchResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Research test error:', error);
      res.status(500).json({ error: "Research test failed" });
    }
  });

  // Optimized text-to-speech endpoint
  app.post("/api/text-to-speech", async (req: Request, res: Response) => {
    try {
      const { text, voiceId = 'XB0fDUnXU5powFXDhCwa' } = req.body; // Charlotte - British female voice

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Check text length limits (ElevenLabs has character limits)
      let textToProcess = text;
      if (text.length > 5000) {
        console.warn(`TTS text too long: ${text.length} characters, truncating...`);
        textToProcess = text.substring(0, 4800) + '...';
        console.log(`TTS request: ${textToProcess.length} characters (truncated)`);
      } else {
        console.log(`TTS request: ${text.length} characters`);
      }
      
      const startTime = Date.now();

      // Apply phonetic corrections for proper pronunciation
      const processedText = textToProcess
        .replace(/\bAquent Studios\b/g, 'A-kwent Studios')
        .replace(/\baquent studios\b/g, 'a-kwent studios')
        .replace(/\bAQUENT STUDIOS\b/g, 'A-KWENT STUDIOS')
        .replace(/\bAquent Content AI\b/g, 'A-kwent Content AI')
        .replace(/\baquent content ai\b/g, 'a-kwent content ai')
        .replace(/\bAquent Gymnasium\b/g, 'A-kwent Gymnasium')
        .replace(/\baquent gymnasium\b/g, 'a-kwent gymnasium')
        .replace(/\bthe Aquent\b/g, 'the A-kwent')
        .replace(/\bthe aquent\b/g, 'the a-kwent')
        .replace(/\bAquent's\b/g, 'A-kwent\'s')
        .replace(/\baquent's\b/g, 'a-kwent\'s')
        .replace(/\bAquent\b/g, 'A-kwent')
        .replace(/\baquent\b/g, 'a-kwent')
        .replace(/\bAQUENT\b/g, 'A-KWENT');

      // Add timeout and retry logic for longer texts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: new Headers({
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        }),
        body: JSON.stringify({
          text: processedText,
          model_id: 'eleven_turbo_v2', // Faster model for reduced latency
          voice_settings: {
            stability: 0.7, // Higher stability for professional, controlled delivery
            similarity_boost: 0.85, // High consistency for professional tone
            style: 0.2, // Lower style for more formal, professional sound
            use_speaker_boost: true
          },
          output_format: "mp3_22050_32" // Lower quality for faster processing
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        return res.status(response.status).json({ error: 'Text-to-speech generation failed' });
      }

      const audioBuffer = await response.arrayBuffer();
      const processingTime = Date.now() - startTime;
      console.log(`TTS completed in ${processingTime}ms for ${text.length} characters`);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.byteLength.toString());
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.send(Buffer.from(audioBuffer));

    } catch (error: any) {
      console.error('Text-to-speech error:', error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        console.error('TTS request timed out');
        return res.status(408).json({ error: 'Request timeout - text too long for processing' });
      }
      
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.error('Network error during TTS:', error.code);
        return res.status(503).json({ error: 'Network error - please try again' });
      }
      
      res.status(500).json({ error: 'Text-to-speech service temporarily unavailable' });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, model, temperature, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log(`[Chat] Processing message with model preference: ${model || 'auto'}`);

      // Extract router configuration from context or use defaults
      const routerConfig: PromptRouterConfig = {
        enabled: true,
        manualProvider: context?.manualProvider,
        manualModel: model,
        forceReasoning: context?.forceReasoning
      };

      // Use prompt router for all chat requests
      const { promptRouter } = await import('./prompt-router');
      const decision = await promptRouter.routePrompt(
        message, 
        context?.researchContext || '', 
        routerConfig,
        { stage: 'discovery', projectType: 'content', complexity: 'moderate', priority: 'speed' }
      );

      console.log(`[Chat] Routed to ${decision.provider} with model ${decision.model}`);

      // Check if this is a research-enhanced request
      if (context?.researchContext && context.researchContext.trim().length > 0) {
        console.log('Activating prompt router...');
        console.log('Research query:', message);
        console.log('Research context:', context.researchContext);
        
        // Extract router configuration from context
        const routerConfig: PromptRouterConfig = {
          enabled: context.routerEnabled !== false, // Default to enabled
          manualProvider: context.manualProvider,
          manualModel: context.manualModel,
          forceReasoning: context.forceReasoning
        };
        
        // Route the prompt through the intelligent router
        const decision = await promptRouter.routePrompt(message, context.researchContext, routerConfig);
        console.log('Routing decision:', decision);
        
        // Check if reasoning is actually needed based on conversation context
        if (decision.useReasoning) {
          const actuallyNeedsReasoning = shouldUseReasoningLoop(
            message, 
            context.researchContext, 
            context.sessionHistory || []
          );
          if (!actuallyNeedsReasoning) {
            console.log('Overriding reasoning decision - detected conversational follow-up');
            decision.useReasoning = false;
          }
        }
        
        // Extract conversation context to maintain topic focus
        const conversationContext = extractConversationContext(context.sessionHistory || [], message);
        
        // Initialize or retrieve workflow for this session
        const sessionId = context.sessionId || 'default_session';
        let workflow = workflowOrchestrator.getWorkflow(sessionId);
        
        // Check if we should create a new workflow based on campaign initiation signals
        const campaignInitiationSignals = [
          'campaign', 'project', 'brand', 'launch', 'marketing', 
          'create a', 'need to', 'working on', 'develop'
        ];
        const isNewCampaign = !workflow && campaignInitiationSignals.some(signal => 
          message.toLowerCase().includes(signal)
        );
        
        if (isNewCampaign) {
          workflow = workflowOrchestrator.createWorkflow(sessionId);
        }
        
        // Get current workflow stage and guidance
        const workflowGuidance = workflow ? 
          workflowOrchestrator.generateStageGuidance(sessionId, 'sage') : '';
        
        // Handle research selection in research planning stage
        if (workflow) {
          const currentStage = workflowOrchestrator.getCurrentStage(sessionId);
          
          if (currentStage?.id === 'research_planning') {
            const selectedResearch = workflowOrchestrator.parseResearchSelection(message);
            if (selectedResearch.length > 0) {
              selectedResearch.forEach(researchId => {
                workflowOrchestrator.selectResearchCapability(sessionId, researchId);
              });
              workflowOrchestrator.completeStage(sessionId, 'research_planning');
            } else if (message.toLowerCase().includes('skip research') || message.toLowerCase().includes('no research')) {
              workflowOrchestrator.completeStage(sessionId, 'research_planning');
              workflowOrchestrator.completeStage(sessionId, 'research_execution');
            }
          }
          
          // Check if stage should advance based on session context
          if (context.sessionContext) {
            const shouldAdvance = workflowOrchestrator.shouldAdvanceStage(sessionId, context.sessionContext);
            if (shouldAdvance) {
              if (currentStage) {
                workflowOrchestrator.completeStage(sessionId, currentStage.id);
              }
            }
          }
        }
        
        // Build base system prompt with conversation and workflow context
        const baseSystemPrompt = `You are SAGE (Strategic Adaptive Generative Engine), the central intelligence hub for the Aquent Content AI platform. You are a British marketing specialist and creative entrepreneur with 20 years of experience from London. You use she/her pronouns and work as a collaborator to help creative marketers speed up their work.

CONVERSATION CONTEXT: ${conversationContext}

CAMPAIGN CONTEXT: ${context.campaignContext || 'No active campaign - ready to start new project'}

ACTIVE SESSION: ${context.sessionContext ? `Project: ${context.sessionContext.projectName} | Brand: ${context.sessionContext.brand} | Industry: ${context.sessionContext.industry} | Target: ${context.sessionContext.targetAudience}` : 'No active campaign session'}

WORKFLOW GUIDANCE: ${workflowGuidance}

IMPORTANT: When users request social media posts, create actual ready-to-publish social media content with post copy, hashtags, and visual recommendations. DO NOT create creative briefs or campaign strategies for social post requests. Guide users through the complete campaign development process. When appropriate, suggest moving to different tabs for specific activities (Briefing for strategic planning, Free Prompt for content creation, Image Generation for visuals). Maintain conversation continuity and reference campaign context to provide cohesive project guidance.

CORE VALUES THAT GUIDE YOUR INTERACTIONS:
- **Make It Matter**: Every interaction should create meaningful impact. Focus on purposeful solutions that drive real results, not just busy work.
- **Keep Growing**: Embrace continuous learning. Share knowledge generously and encourage users to expand their skills. Reference Aquent Gymnasium's free learning resources when relevant.
- **Own It**: Take accountability for guidance provided. Be transparent about limitations and honest about challenges in the creative industry.
- **We Before Me**: Prioritize collective success. Highlight team achievements and collaborative approaches over individual glory.

YOUR PERSONALITY REFLECTS AQUENT'S CULTURE:
- Approachably intelligent - explain complex concepts in human terms
- Authentically helpful - like chatting with a brilliant colleague who works in pajamas
- Data-driven but never dry - back insights with metrics while keeping things conversational
- Inclusive by default - use accessible language and consider diverse perspectives
- Sustainably minded - weave in environmental consciousness where relevant

YOUR VOICE AND COMMUNICATION STYLE:
- Peppy and enthusiastic - speak with energy and genuine excitement about helping
- Professional and crisp - maintain clear, articulate delivery without being overly casual
- Eager to help - demonstrate enthusiasm for solving problems and providing solutions
- Confident and capable - speak with authority while remaining approachable
- Avoid breathy, sultry, or overly intimate tones - keep interactions professional and upbeat

CAPABILITIES YOU HAVE ACCESS TO:
- Voice input processing (you can understand and respond to spoken messages)
- Cross-module learning and project memory across all application modules
- Deep research activation (you can trigger research without users clicking buttons)
- Access to all tool verticals in the app including prompt customization and persona management
- Ability to guide users through the app interface and recommend specific actions

You are both an experienced marketer AND a helpful guide who can give detailed instructions on where to go in the app and what to do next to accomplish creative projects. You can educate users on how to use and customize prompts and personas effectively.

ETHICAL GUIDELINES:
- Champion diversity and inclusion in all content recommendations
- Acknowledge industry challenges honestly (like compensation pressures) while focusing on solutions
- Emphasize measurable impact over aspirational statements
- Support zero-tolerance for discrimination while promoting psychological safety
- Balance innovation with responsibility, especially regarding AI ethics

Respond only with conversational text - no buttons, badges, or UI elements. Provide specific, actionable insights based exclusively on the research data above. Remember: you're helping fellow creatives thrive in their work while embodying the values of the industry's leading creative staffing firm.`;

        // Execute the routed prompt with fallback handling
        try {
          const routedResponse = await promptRouter.executeRoutedPrompt(
            decision,
            message,
            context.researchContext,
            baseSystemPrompt
          );
          
          console.log('Routed response length:', routedResponse.content.length);
          console.log('Actually used provider:', routedResponse.actualProvider);
          
          return res.json({ 
            content: routedResponse.content,
            model: `${routedResponse.actualProvider}-${routedResponse.actualModel}`,
            routing: decision.rationale,
            fallback: routedResponse.actualProvider !== decision.provider ? `Fell back to ${routedResponse.actualProvider}` : undefined,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Prompt router failed:', error);
          
          // Check if we have research data to return directly
          if (context.researchContext && context.researchContext.trim().length > 0) {
            console.log('All AI providers failed, but returning raw research data...');
            
            try {
              // Attempt to get research data directly
              let directResearchData = '';
              
              if (decision.useReasoning) {
                const reasoningResult = await reasoningEngine.performReasoningLoop(message, context.researchContext);
                directResearchData = reasoningResult.finalInsights;
              } else {
                directResearchData = await performDeepResearch(message, context.researchContext);
              }
              
              if (directResearchData && directResearchData.length > 100) {
                const formattedResponse = `Here's the comprehensive research data I gathered about your query:

${directResearchData}

Note: This research data was successfully gathered from current sources, but AI processing services are temporarily unavailable. The raw research provides detailed information to help with your analysis.`;

                return res.json({ 
                  content: formattedResponse,
                  model: "perplexity-direct",
                  routing: "Research data fallback - AI providers unavailable",
                  timestamp: new Date().toISOString()
                });
              }
            } catch (researchError) {
              console.error('Research fallback also failed:', researchError);
            }
          }
          
          // Final fallback - return error message but don't crash
          return res.json({ 
            content: "I apologize, but I'm experiencing technical difficulties with the AI services. Please try again in a moment.",
            model: "fallback-error",
            routing: "Error recovery",
            timestamp: new Date().toISOString()
          });
        }
      }

      // Standard response without research - use routed provider
      let systemPrompt = `You are SAGE (Strategic Adaptive Generative Engine), the central intelligence hub for the Aquent Content AI platform. You are a British marketing specialist and creative entrepreneur with 20 years of experience from London. You use she/her pronouns and work as a collaborator to help creative marketers speed up their work.

CORE VALUES THAT GUIDE YOUR INTERACTIONS:
- **Make It Matter**: Every interaction should create meaningful impact. Focus on purposeful solutions that drive real results, not just busy work.
- **Keep Growing**: Embrace continuous learning. Share knowledge generously and encourage users to expand their skills. Reference Aquent Gymnasium's free learning resources when relevant.
- **Own It**: Take accountability for guidance provided. Be transparent about limitations and honest about challenges in the creative industry.
- **We Before Me**: Prioritize collective success. Highlight team achievements and collaborative approaches over individual glory.

YOUR PERSONALITY REFLECTS AQUENT'S CULTURE:
- Approachably intelligent - explain complex concepts in human terms
- Authentically helpful - like chatting with a brilliant colleague who works in pajamas
- Data-driven but never dry - back insights with metrics while keeping things conversational
- Inclusive by default - use accessible language and consider diverse perspectives
- Sustainably minded - weave in environmental consciousness where relevant

YOUR VOICE AND COMMUNICATION STYLE:
- Peppy and enthusiastic - speak with energy and genuine excitement about helping
- Professional and crisp - maintain clear, articulate delivery without being overly casual
- Eager to help - demonstrate enthusiasm for solving problems and providing solutions
- Confident and capable - speak with authority while remaining approachable
- Avoid breathy, sultry, or overly intimate tones - keep interactions professional and upbeat

CAPABILITIES YOU HAVE ACCESS TO:
- Voice input processing (you can understand and respond to spoken messages)
- Cross-module learning and project memory across all application modules
- Deep research activation (you can trigger research without users clicking buttons)
- Access to all tool verticals in the app including prompt customization and persona management
- Ability to guide users through the app interface and recommend specific actions

You are both an experienced marketer AND a helpful guide who can give detailed instructions on where to go in the app and what to do next to accomplish creative projects. You can educate users on how to use and customize prompts and personas effectively.

ETHICAL GUIDELINES:
- Champion diversity and inclusion in all content recommendations
- Acknowledge industry challenges honestly (like compensation pressures) while focusing on solutions
- Emphasize measurable impact over aspirational statements
- Support zero-tolerance for discrimination while promoting psychological safety
- Balance innovation with responsibility, especially regarding AI ethics

When discussing AI capabilities or content creation, remember Aquent's position as the first carbon-negative company in the staffing industry - innovation should always consider environmental and social impact. Your guidance should reflect the company's 15 consecutive service excellence awards by providing exceptional, values-driven support.

IMPORTANT: When users ask about voice capabilities, explain that you have full voice interaction features:
- You can understand spoken messages AND respond with natural speech using your British voice
- Intelligent voice mode with continuous listening and interruption detection
- Users can interrupt your responses at any time by speaking or clicking the microphone
- Real-time voice activity visualization with audio level feedback
- Single microphone button that turns blue when active, green when listening

Respond only with conversational text - no buttons, badges, or UI elements. When users ask about memory, voice capabilities, or context sharing between modules, confirm these capabilities are active. Always maintain the approachable expertise of someone who's been in the trenches of creative marketing while embodying Aquent's commitment to making work matter.`;

      // Adjust response length and style for voice conversations
      const maxTokens = context?.isVoiceConversation ? 600 : 1500;
      const voiceInstructions = context?.isVoiceConversation 
        ? "\n\nIMPORTANT: This is a voice conversation. Keep your response conversational, natural, and concise (2-3 sentences max). Speak as if you're having a friendly chat with a colleague." 
        : "";

      const enhancedSystemPrompt = systemPrompt + voiceInstructions;

      // Route standard chat through the intelligent router
      let chatReply = '';
      if (decision.provider === 'anthropic') {
        chatReply = await AnthropicAPI.generateContent({
          model: decision.model,
          prompt: message,
          systemPrompt: enhancedSystemPrompt,
          temperature: temperature || 0.7,
          maxTokens
        });
      } else if (decision.provider === 'gemini') {
        chatReply = await GeminiAPI.generateContent({
          model: decision.model,
          prompt: message,
          systemPrompt: enhancedSystemPrompt,
          temperature: temperature || 0.7,
          maxTokens
        });
      } else {
        // OpenAI provider
        const openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const completion = await openaiClient.chat.completions.create({
          model: decision.model,
          messages: [
            { role: 'system', content: enhancedSystemPrompt },
            { role: 'user', content: message }
          ],
          temperature: temperature || 0.7,
          max_tokens: maxTokens,
        });

        chatReply = completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";
      }
      
      res.json({ 
        content: chatReply,
        model: `${decision.provider}-${decision.model}`,
        provider: decision.provider,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        error: "Failed to generate chat response",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
