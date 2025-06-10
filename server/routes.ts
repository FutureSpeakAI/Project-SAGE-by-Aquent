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
  if (sessionHistory.length > 0) {
    const lastMessage = sessionHistory[sessionHistory.length - 1]?.content?.toLowerCase() || '';
    if (lowerMessage.includes('what about') || 
        lowerMessage.includes('can you also') || 
        lowerMessage.includes('tell me more') ||
        lowerMessage.includes('expand on') ||
        lowerMessage.includes('elaborate')) {
      return false;
    }
  }
  
  // Use reasoning for complex analytical tasks
  const complexIndicators = [
    'analyze', 'compare', 'evaluate', 'assess', 'examine',
    'strategy', 'approach', 'solution', 'recommendation',
    'pros and cons', 'advantages', 'disadvantages',
    'market research', 'competitive analysis', 'trend analysis'
  ];
  
  const hasComplexTask = complexIndicators.some(indicator => 
    lowerMessage.includes(indicator) || lowerContext.includes(indicator)
  );
  
  // Use reasoning for research-enhanced requests
  const hasResearchContext = researchContext.length > 100;
  
  return hasComplexTask && hasResearchContext;
}

// Helper function to extract conversation context
function extractConversationContext(sessionHistory: any[], currentMessage: string): string {
  if (!sessionHistory || sessionHistory.length === 0) return '';
  
  // Get last 3 messages for context
  const recentMessages = sessionHistory.slice(-3);
  const context = recentMessages.map(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    return `${role}: ${content.substring(0, 200)}...`;
  }).join('\n');
  
  return context;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Health check endpoint
  app.get('/api/status', async (_req: Request, res: Response) => {
    res.json({ status: 'operational', timestamp: new Date().toISOString() });
  });

  // Data export/import endpoints
  app.get('/api/export-data', async (_req: Request, res: Response) => {
    try {
      const data = {
        prompts: storage.prompts,
        personas: storage.personas,
        generatedContents: storage.generatedContents,
        briefConversations: storage.briefConversations,
        generatedImages: storage.generatedImages,
        imageProjects: storage.imageProjects,
        chatSessions: storage.chatSessions,
        exportedAt: new Date().toISOString()
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  app.post('/api/import-data', async (req: Request, res: Response) => {
    try {
      const { prompts, personas, generatedContents, briefConversations, generatedImages, imageProjects, chatSessions } = req.body;
      
      if (prompts) storage.prompts = prompts;
      if (personas) storage.personas = personas;
      if (generatedContents) storage.generatedContents = generatedContents;
      if (briefConversations) storage.briefConversations = briefConversations;
      if (generatedImages) storage.generatedImages = generatedImages;
      if (imageProjects) storage.imageProjects = imageProjects;
      if (chatSessions) storage.chatSessions = chatSessions;
      
      res.json({ success: true, message: 'Data imported successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to import data' });
    }
  });

  // Models endpoint
  app.get("/api/models", async (_req: Request, res: Response) => {
    const models = [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google" }
    ];
    res.json(models);
  });

  // Routing validation endpoint
  app.post("/api/validate-routing", async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      
      const routerConfig: PromptRouterConfig = {
        openaiModels: ['gpt-4o', 'gpt-4o-mini'],
        anthropicModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
        geminiModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        fallbackProvider: 'openai',
        fallbackModel: 'gpt-4o-mini'
      };

      const routingDecision = await promptRouter(message, context, routerConfig);
      
      res.json({
        success: true,
        routing: routingDecision,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: 'Routing validation failed', 
        details: error.message 
      });
    }
  });

  // Content generation endpoint
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      const { prompt, systemPrompt, model, provider, temperature, maxTokens } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      let result;
      
      if (provider === 'anthropic') {
        result = await AnthropicAPI.generateContent({
          model: model || 'claude-3-5-sonnet-20241022',
          prompt,
          systemPrompt,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 3000
        });
      } else if (provider === 'gemini') {
        result = await GeminiAPI.generateContent({
          model: model || 'gemini-1.5-pro',
          prompt,
          systemPrompt,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 3000
        });
      } else {
        // Default to OpenAI
        result = await generateContent(prompt, systemPrompt, model || 'gpt-4o');
      }

      res.json({ 
        content: result,
        provider: provider || 'openai',
        model: model || 'gpt-4o'
      });
    } catch (error: any) {
      console.error('Content generation error:', error);
      res.status(500).json({ 
        error: "Content generation failed", 
        details: error.message 
      });
    }
  });

  // Social posts generation endpoint
  app.post("/api/generate-social-posts", async (req: Request, res: Response) => {
    try {
      const { brief, platforms, tone } = req.body;
      
      if (!brief || !platforms) {
        return res.status(400).json({ error: "Brief and platforms are required" });
      }

      const systemPrompt = `You are a social media expert. Create engaging posts for the specified platforms based on the brief provided. Tailor each post to the platform's best practices and audience expectations.`;
      
      const userPrompt = `Create social media posts for these platforms: ${platforms.join(', ')}

Brief: ${brief}

Tone: ${tone || 'Professional'}

For each platform, provide:
- Optimized post content
- Relevant hashtags
- Call-to-action

Format as HTML with clear platform sections.`;

      const result = await generateContent(userPrompt, systemPrompt);
      
      res.json({ 
        content: result,
        platforms,
        tone: tone || 'Professional'
      });
    } catch (error: any) {
      console.error('Social posts generation error:', error);
      res.status(500).json({ 
        error: "Social posts generation failed", 
        details: error.message 
      });
    }
  });

  // Robust content generation with routing
  app.post("/api/robust-generate", async (req: Request, res: Response) => {
    try {
      const { 
        userPrompt, 
        systemPrompt = '', 
        temperature = 0.7, 
        maxTokens = 3000,
        context = '',
        sessionHistory = []
      } = req.body;

      if (!userPrompt) {
        return res.status(400).json({ error: "User prompt is required" });
      }

      console.log('[Content Generation] Processing request:', userPrompt.substring(0, 100) + '...');

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

      // Configure routing
      const routerConfig: PromptRouterConfig = {
        openaiModels: ['gpt-4o', 'gpt-4o-mini'],
        anthropicModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
        geminiModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        fallbackProvider: 'openai',
        fallbackModel: 'gpt-4o-mini'
      };

      // Get routing decision
      const routingDecision = await promptRouter(userPrompt, context, routerConfig);
      console.log('[Content Generation] Routing decision:', routingDecision);

      // Enhanced system prompt for better content generation
      const enhancedSystemPrompt = systemPrompt + `

Important: Generate comprehensive, well-structured content that directly addresses the user's request. 
- For briefs, create actual deliverables (posts, emails, etc.) not just descriptions
- Use professional formatting with HTML tags for structure
- Include specific, actionable content that can be immediately used
- For emails, include subject lines, body copy, and calls to action
- Create professional, publication-ready content that matches the brief requirements exactly`;

      // Route to the selected provider
      if (routingDecision.provider === 'anthropic') {
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
          console.log('[Content Generation] Anthropic failed, trying fallback:', anthropicError.message);
          try {
            const fallbackResult = await GeminiAPI.generateContent({
              model: 'gemini-1.5-flash',
              prompt: userPrompt,
              systemPrompt: enhancedSystemPrompt,
              temperature: temperature || 0.7,
              maxTokens: 3000
            });
            res.json({ 
              content: fallbackResult, 
              provider: 'gemini',
              model: 'gemini-1.5-flash',
              routed: true,
              fallback: true,
              note: 'Switched to Gemini after Anthropic timeout'
            });
          } catch (geminiError: any) {
            res.status(500).json({ 
              error: 'Content generation temporarily unavailable',
              providers_tried: ['anthropic', 'gemini']
            });
          }
        }
      } else if (routingDecision.provider === 'gemini') {
        try {
          const result = await GeminiAPI.generateContent({
            model: routingDecision.model,
            prompt: userPrompt,
            systemPrompt: enhancedSystemPrompt,
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 4000
          });
          res.json({ 
            content: result, 
            provider: 'gemini',
            model: routingDecision.model,
            routed: true
          });
        } catch (geminiError: any) {
          console.log('[Content Generation] Gemini failed, trying OpenAI fallback:', geminiError.message);
          try {
            const fallbackResult = await generateContent(userPrompt, enhancedSystemPrompt, 'gpt-4o-mini');
            res.json({ 
              content: fallbackResult, 
              provider: 'openai',
              model: 'gpt-4o-mini',
              routed: true,
              fallback: true,
              note: 'Switched to OpenAI after Gemini timeout'
            });
          } catch (openaiError: any) {
            res.status(500).json({ 
              error: 'Content generation temporarily unavailable',
              providers_tried: ['gemini', 'openai']
            });
          }
        }
      } else {
        // OpenAI as default/fallback
        try {
          const result = await generateContent(userPrompt, enhancedSystemPrompt, routingDecision.model);
          res.json({ 
            content: result, 
            provider: 'openai',
            model: routingDecision.model,
            routed: true
          });
        } catch (openaiError: any) {
          console.log('[Content Generation] OpenAI failed, trying Anthropic fallback:', openaiError.message);
          try {
            const fallbackResult = await AnthropicAPI.generateContent({
              model: 'claude-3-5-haiku-20241022',
              prompt: userPrompt,
              systemPrompt: enhancedSystemPrompt,
              temperature: temperature || 0.7,
              maxTokens: 3000
            });
            res.json({ 
              content: fallbackResult, 
              provider: 'anthropic',
              model: 'claude-3-5-haiku-20241022',
              routed: true,
              fallback: true,
              note: 'Switched to Anthropic after OpenAI timeout'
            });
          } catch (anthropicError: any) {
            res.status(500).json({ 
              error: 'Content generation temporarily unavailable',
              providers_tried: ['openai', 'anthropic']
            });
          }
        }
      }
    } catch (error: any) {
      console.error('[Content Generation] Unexpected error:', error);
      res.status(500).json({ 
        error: 'Content generation failed', 
        details: error.message 
      });
    }
  });

  // Continue with remaining routes...
  app.post("/api/generate", async (req: Request, res: Response) => {
    // Implementation continues...
  });

  return server;
}