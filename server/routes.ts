import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContent, generateContentDirect, generateImage } from "./openai";
import * as GeminiAPI from "./gemini";
import * as AnthropicAPI from "./anthropic";
import * as ImagenAPI from "./imagen";
import { processBriefFile, analyzeBriefText, extractTextFromFile, extractContentFromFile } from "./brief-processing";
import path from 'path';
import { processImage } from "./image-processing";
import { upload } from './index';
import OpenAI from "openai";
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FormData from 'form-data';
import axios from 'axios';
import sharp from 'sharp';
import { performDeepResearch } from "./research-engine";
import { reasoningEngine } from "./reasoning-engine";
import { promptRouter, type PromptRouterConfig } from "./prompt-router";
import { providerHealthMonitor } from "./provider-health";
import { detectLorealBrief, generateLorealInstagramContent } from "./loreal-brief-handler";
import { generateBreathEaseEmails } from "./healthcare-content-generator";
import { simpleCampaignStorage, type SimpleCampaign } from "./simple-campaign-storage";
import { pool } from "./db";
import { parseBriefingDeliverables, matchDeliverablesWithAssets } from "./briefing-parser";
import { learningRouter } from "./learning-routes";
import { 
  initializePinecone, 
  checkPineconeStatus, 
  chatWithPinecone,
  type PineconeMessage 
} from "./services/pinecone";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Health check endpoint with database status
  app.get('/api/status', async (_req: Request, res: Response) => {
    try {
      const hasDatabaseUrl = !!process.env.DATABASE_URL;
      
      res.json({ 
        status: 'operational', 
        environment: process.env.NODE_ENV || 'development',
        database: {
          available: hasDatabaseUrl,
          type: hasDatabaseUrl ? 'postgresql' : 'memory'
        },
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      res.json({ 
        status: 'operational', 
        environment: process.env.NODE_ENV || 'development',
        database: {
          available: false,
          type: 'memory'
        },
        timestamp: new Date().toISOString() 
      });
    }
  });

  // Models endpoint
  app.get("/api/models", async (_req: Request, res: Response) => {
    try {
      const models = {
        openai: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-3.5-turbo'
        ],
        anthropic: [
          'claude-sonnet-4-20250514',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022'
        ],
        gemini: [
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-1.5-pro-002'
        ],
        perplexity: [
          'llama-3.1-sonar-small-128k-online',
          'llama-3.1-sonar-large-128k-online',
          'llama-3.1-sonar-huge-128k-online'
        ],
        imageGeneration: {
          openai: [
            'gpt-image-1',
            'dall-e-3',
            'dall-e-2'
          ],
          gemini: [
            'gemini-1.5-pro-vision',
            'gemini-1.5-flash-vision'
          ]
        }
      };
      
      res.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ error: 'Failed to fetch available models' });
    }
  });

  // Healthcare email generation endpoint
  app.post("/api/generate-healthcare-emails", async (req: Request, res: Response) => {
    try {
      console.log('[Healthcare Email Generation] Starting BreathEase email generation');
      const result = await generateBreathEaseEmails();
      res.json({ 
        content: result, 
        provider: 'openai',
        model: 'gpt-4o-mini',
        type: 'healthcare-emails'
      });
    } catch (error: any) {
      console.error('[Healthcare Email Generation] Error:', error);
      res.status(500).json({ error: `Healthcare email generation failed: ${error.message}` });
    }
  });

  // Content generation with L'Oréal detection
  app.post("/api/robust-generate", async (req: Request, res: Response) => {
    try {
      const { 
        userPrompt, 
        systemPrompt = '', 
        temperature = 0.7, 
        maxTokens = 3000,
        context = '',
        sessionHistory = [],
        preferredProvider = 'anthropic',
        model = 'claude-3-5-sonnet-20241022'
      } = req.body;

      if (!userPrompt) {
        return res.status(400).json({ error: "User prompt is required" });
      }

      console.log('[Content Generation] Processing request:', userPrompt.substring(0, 100) + '...');

      // GEMINI-ONLY MODE: Intercept and route all requests to Gemini
      if (process.env.GEMINI_ONLY_MODE === 'true') {
        console.log('[Content Generation] GEMINI-ONLY MODE active - routing to Gemini 2.0');
        
        try {
          // Determine complexity for model selection
          const isComplex = userPrompt.length > 200 || 
                           userPrompt.toLowerCase().includes('comprehensive') ||
                           userPrompt.toLowerCase().includes('detailed') ||
                           userPrompt.toLowerCase().includes('analyze') ||
                           userPrompt.toLowerCase().includes('strategy');
          
          const geminiModel = GeminiAPI.selectGeminiModel(isComplex, true);
          console.log(`[Gemini-Only] Using model: ${geminiModel}`);
          
          const geminiContent = await GeminiAPI.generateContent({
            model: geminiModel,
            prompt: userPrompt,
            systemPrompt: systemPrompt || 'You are a helpful AI assistant. Provide clear, comprehensive responses.',
            temperature,
            maxTokens,
            sessionHistory
          });
          
          return res.json({
            content: geminiContent,
            provider: 'gemini',
            model: geminiModel,
            routed: true,
            geminiOnly: true,
            note: 'Generated using Gemini-only mode (vendor compliance)'
          });
        } catch (geminiError: any) {
          console.error('[Gemini-Only] Error:', geminiError);
          return res.status(500).json({
            error: 'Content generation failed',
            details: geminiError.message,
            provider: 'gemini',
            geminiOnly: true
          });
        }
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

      // Enhanced system prompt for better content generation
      const enhancedSystemPrompt = systemPrompt + `

Important: Generate comprehensive, well-structured content that directly addresses the user's request. 
- For briefs, create actual deliverables (posts, emails, etc.) not just descriptions
- Use professional formatting with HTML tags for structure
- Include specific, actionable content that can be immediately used
- For emails, include subject lines, body copy, and calls to action
- Create professional, publication-ready content that matches the brief requirements exactly`;

      // Route with automatic fallback system
      console.log(`[Content Generation] Preferred provider: ${preferredProvider}, Model: ${model}`);
      
      // Get the best available providers based on health status
      const healthCheck = providerHealthMonitor.getBestProvider([preferredProvider]);
      const availableProviders = healthCheck.fallbackChain;
      
      console.log(`[Content Generation] Available providers: ${availableProviders.join(', ')}`);
      
      let generatedContent: string = '';
      let usedProvider = '';
      let usedModel = '';
      let usedFallback = false;
      
      // Try providers in order of preference/health
      for (let i = 0; i < availableProviders.length; i++) {
        const currentProvider = availableProviders[i];
        try {
          console.log(`[Content Generation] Attempting ${currentProvider} (attempt ${i + 1})`);
          
          if (currentProvider === 'openai') {
            const optimizedModel = model === 'gpt-4o' && userPrompt.length > 200 ? 'gpt-4o-mini' : (model.startsWith('gpt-') ? model : 'gpt-4o');
            generatedContent = await generateContentDirect(userPrompt, enhancedSystemPrompt, optimizedModel);
            usedProvider = 'openai';
            usedModel = optimizedModel;
            providerHealthMonitor.recordProviderSuccess('openai', Date.now());
            break;
            
          } else if (currentProvider === 'anthropic') {
            generatedContent = await AnthropicAPI.generateContent({
              model: 'claude-3-5-sonnet-20241022',
              prompt: userPrompt,
              systemPrompt: enhancedSystemPrompt,
              temperature,
              maxTokens
            });
            usedProvider = 'anthropic';
            usedModel = 'claude-3-5-sonnet-20241022';
            providerHealthMonitor.recordProviderSuccess('anthropic', Date.now());
            usedFallback = i > 0;
            break;
            
          } else if (currentProvider === 'gemini') {
            generatedContent = await GeminiAPI.generateContent({
              model: 'gemini-1.5-pro',
              prompt: userPrompt,
              systemPrompt: enhancedSystemPrompt,
              temperature,
              maxTokens
            });
            usedProvider = 'gemini';
            usedModel = 'gemini-1.5-pro';
            providerHealthMonitor.recordProviderSuccess('gemini', Date.now());
            usedFallback = i > 0;
            break;
          }
          
        } catch (providerError: any) {
          console.log(`[Content Generation] ${currentProvider} failed: ${providerError.message}`);
          providerHealthMonitor.recordProviderError(currentProvider, providerError.message);
          
          // Continue to next provider unless this was the last one
          if (i === availableProviders.length - 1) {
            throw new Error(`All providers failed. Last error: ${providerError.message}`);
          }
        }
      }
      
      if (generatedContent) {
        res.json({ 
          content: generatedContent, 
          provider: usedProvider,
          model: usedModel,
          routed: true,
          fallback: usedFallback,
          note: usedFallback ? `Automatically switched to ${usedProvider} due to primary provider issues` : undefined
        });
        return;
      } else {
        throw new Error(`Content generation failed. No content was generated.`);
      }

      // Try Anthropic (default or fallback)
      try {
        const result = await AnthropicAPI.generateContent({
          model: 'claude-3-5-sonnet-20241022',
          prompt: userPrompt,
          systemPrompt: enhancedSystemPrompt,
          temperature: temperature || 0.7,
          maxTokens: 3000
        });
        res.json({ 
          content: result, 
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          routed: true
        });
      } catch (anthropicError: any) {
        console.log('[Content Generation] Anthropic failed, trying fallback:', anthropicError.message);
        try {
          const fallbackResult = await generateContentDirect(userPrompt, enhancedSystemPrompt, 'gpt-4o-mini');
          res.json({ 
            content: fallbackResult, 
            provider: 'openai',
            model: 'gpt-4o-mini',
            routed: true,
            fallback: true,
            note: 'Switched to OpenAI after Anthropic timeout'
          });
        } catch (openaiError: any) {
          res.status(500).json({ 
            error: 'Content generation temporarily unavailable',
            providers_tried: ['anthropic', 'openai']
          });
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

  // Content generation endpoint for briefing workflow
  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      // Log the raw request body first
      console.log('[Content Generation] RAW REQUEST BODY:', JSON.stringify(req.body));
      
      const { model: requestModel, systemPrompt = '', userPrompt, temperature } = req.body;
      
      // Log extracted values
      console.log('[Content Generation] Extracted userPrompt:', userPrompt);
      console.log('[Content Generation] UserPrompt type:', typeof userPrompt);
      
      if (!userPrompt || userPrompt === '') {
        console.log('[Content Generation] ERROR: User prompt is empty or missing');
        return res.status(400).json({ error: 'User prompt is required' });
      }

      console.log('[Content Generation] Processing briefing-based content generation');
      console.log('[Content Generation] User prompt length:', userPrompt.length);
      console.log('[Content Generation] User prompt preview:', userPrompt.substring(0, 200));
      console.log('[Content Generation] System prompt received:', systemPrompt ? 'Yes' : 'No');
      console.log('[Content Generation] System prompt preview:', systemPrompt ? systemPrompt.substring(0, 200) : 'None');

      // GEMINI-ONLY MODE: Intercept and route all requests to Gemini
      if (process.env.GEMINI_ONLY_MODE === 'true') {
        console.log('[Generate] GEMINI-ONLY MODE active - routing to Gemini 2.0');
        
        try {
          const isComplex = userPrompt.length > 200 || 
                           userPrompt.toLowerCase().includes('comprehensive') ||
                           userPrompt.toLowerCase().includes('detailed') ||
                           userPrompt.toLowerCase().includes('analyze') ||
                           userPrompt.toLowerCase().includes('brief');
          
          const geminiModel = GeminiAPI.selectGeminiModel(isComplex, true);
          console.log(`[Gemini-Only] Using model: ${geminiModel} for /api/generate`);
          
          const result = await GeminiAPI.generateContent({
            model: geminiModel,
            prompt: userPrompt,
            systemPrompt: systemPrompt || 'You are a professional content creator. Create comprehensive, detailed content exactly as specified.',
            temperature: temperature || 0.7,
            maxTokens: 3000
          });
          
          return res.json({
            content: result,
            provider: 'gemini',
            model: geminiModel
          });
        } catch (geminiError: any) {
          console.error('[Gemini-Only] Error in /api/generate:', geminiError);
          return res.status(500).json({
            error: 'Content generation failed',
            details: geminiError.message,
            provider: 'gemini'
          });
        }
      }

      // Parse deliverables from the briefing content
      const extractDeliverables = (briefContent: string): { type: string, count: number }[] => {
        const deliverables: { type: string, count: number }[] = [];
        const content = briefContent.toLowerCase();
        
        // First, check for numbered items in the brief (Email 1:, Email 2:, etc.)
        const emailMatches = content.match(/email\s*\d+:/gi);
        if (emailMatches && emailMatches.length > 0) {
          deliverables.push({ type: 'email', count: emailMatches.length });
        }
        
        const postMatches = content.match(/post\s*\d+:/gi);
        if (postMatches && postMatches.length > 0) {
          deliverables.push({ type: 'Instagram post', count: postMatches.length });
        }
        
        // If no numbered items, look for quantity words
        if (deliverables.length === 0) {
          const numberWords: { [key: string]: number } = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
          };
          
          // Look for "three emails", "two posts", etc.
          const quantityPattern = /(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:[\w-]+\s+)*(email|emails|post|posts|blog)/gi;
          let match;
          while ((match = quantityPattern.exec(content)) !== null) {
            const quantityStr = match[1];
            const contentType = match[2];
            
            let count = parseInt(quantityStr) || numberWords[quantityStr] || 1;
            let type = contentType.includes('email') ? 'email' : 
                      contentType.includes('blog') ? 'blog post' : 'Instagram post';
            
            deliverables.push({ type, count });
          }
        }
        
        // Fallback: check for general content types without quantities
        if (deliverables.length === 0) {
          if (content.includes('blog post') || content.includes('blog content')) 
            deliverables.push({ type: 'blog post', count: 1 });
          if (content.includes('instagram') || content.includes('social media post')) 
            deliverables.push({ type: 'Instagram post', count: 1 });
          if (content.includes('email') && !content.includes('@')) 
            deliverables.push({ type: 'email', count: 1 });
          if (content.includes('headline') || content.includes('tagline')) 
            deliverables.push({ type: 'headline', count: 1 });
        }
        
        return deliverables;
      };

      const briefDeliverables = extractDeliverables(userPrompt);
      const hasSpecificDeliverables = briefDeliverables.length > 0;

      // Enhanced system prompt that prioritizes client's instructions
      let enhancedSystemPrompt = systemPrompt;
      
      // Only apply briefing-specific system prompt if this is actually a briefing
      const isBriefingContent = (userPrompt.includes('CREATIVE BRIEF') || userPrompt.includes('MARKETING BRIEF')) && userPrompt.length > 800;
      
      if (!systemPrompt || systemPrompt.trim().length === 0) {
        if (isBriefingContent) {
          // Apply briefing-specific system prompt only for actual briefs
          enhancedSystemPrompt = `You are a professional healthcare content creator. Create comprehensive, detailed content exactly as specified in the brief.

REQUIREMENTS:
- Generate ALL requested deliverables (emails, posts, articles, etc.)
- For healthcare emails: Include detailed subject lines, comprehensive body copy (400-600 words), clinical benefits, and strong CTAs
- Use proper HTML formatting: <h1>, <h2>, <p>, <ul>, <li>
- Each deliverable must be complete and publication-ready
- Focus on clinical efficacy, patient outcomes, and healthcare provider value
- DO NOT summarize the brief - create the actual content requested`;
        } else {
          // For regular content generation, use a simple, neutral system prompt
          enhancedSystemPrompt = `You are a helpful AI assistant. Follow the user's instructions exactly and generate the content they request.`;
        }
      }

      // Add specific deliverable guidance if detected
      if (hasSpecificDeliverables) {
        const deliverablesList = briefDeliverables.map(d => `${d.count} ${d.type}${d.count > 1 ? 's' : ''}`).join(', ');
        enhancedSystemPrompt += `\n\nDETECTED DELIVERABLES: ${deliverablesList}
FOCUS: Create ALL requested deliverables. For multiple items, number them clearly (e.g., Email 1, Email 2, Email 3). Each deliverable should be complete and ready for publication.`;
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

      // Configure the prompt router for intelligent provider selection
      const config: PromptRouterConfig = {
        userPrompt,
        systemPrompt: enhancedSystemPrompt,
        temperature: temperature || 0.7,
        maxTokens: 3000,
        requestModel
      };

      // isBriefingContent is already defined above - no need to redefine
      
      let generatedContent: string = '';
      let usedProvider: string = 'anthropic';
      let usedModel: string = 'claude-3-5-sonnet-20241022';

      if (isBriefingContent) {
        console.log('[Content Generation] Detected briefing content, using reliable briefing execution');
        const deliverablesSummary = briefDeliverables.length > 0 
          ? briefDeliverables.map(d => `${d.count} ${d.type}${d.count > 1 ? 's' : ''}`).join(', ')
          : 'none specific';
        console.log('[Content Generation] Deliverables detected:', deliverablesSummary);
        
        // Optimize prompt for complex briefs to prevent timeouts
        let optimizedPrompt = userPrompt;
        let maxTokens = 2000; // Increased for comprehensive healthcare content
        
        if (userPrompt.length > 2000) {
          optimizedPrompt = userPrompt; // Keep full content for complex medical/healthcare briefs
          maxTokens = 2500; // Higher limit for detailed healthcare emails
        }
        
        // For healthcare/pharmaceutical content, ensure comprehensive output
        if (userPrompt.toLowerCase().includes('email') || userPrompt.toLowerCase().includes('healthcare') || 
            userPrompt.toLowerCase().includes('pharmaceutical') || userPrompt.toLowerCase().includes('medical')) {
          maxTokens = Math.max(maxTokens, 2000); // Minimum 2000 tokens for healthcare content
        }

        // Use automatic fallback system with provider health monitoring
        const fallbackProviders = ['openai', 'anthropic', 'gemini'];
        let lastError: any;
        let usedFallback = false;
        
        for (let i = 0; i < fallbackProviders.length; i++) {
          const provider = fallbackProviders[i];
          try {
            console.log(`[Content Generation] Attempting ${provider} (attempt ${i + 1})`);
            
            if (provider === 'openai') {
              // Try multiple OpenAI models with progressive timeout
              const models = ['gpt-4o', 'gpt-3.5-turbo'];
              for (const model of models) {
                try {
                  const timeout = model === 'gpt-4o' ? 30000 : 15000;
                  const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                      model: model,
                      messages: [
                        { role: 'system', content: enhancedSystemPrompt },
                        { role: 'user', content: optimizedPrompt }
                      ],
                      temperature: temperature || 0.7,
                      max_tokens: maxTokens
                    }),
                    signal: AbortSignal.timeout(timeout)
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    generatedContent = data.choices[0]?.message?.content || '';
                    usedProvider = 'openai';
                    usedModel = model;
                    providerHealthMonitor.recordProviderSuccess('openai', Date.now());
                    break; // Success, exit both loops
                  }
                } catch (modelError) {
                  console.log(`[Content Generation] ${model} failed, trying next model`);
                  lastError = modelError;
                }
              }
              if (generatedContent) break; // Exit provider loop if successful
              
            } else if (provider === 'anthropic') {
              generatedContent = await AnthropicAPI.generateContent({
                model: 'claude-3-5-sonnet-20241022',
                prompt: optimizedPrompt,
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: maxTokens
              });
              usedProvider = 'anthropic';
              usedModel = 'claude-3-5-sonnet-20241022';
              providerHealthMonitor.recordProviderSuccess('anthropic', Date.now());
              usedFallback = i > 0;
              break;
              
            } else if (provider === 'gemini') {
              generatedContent = await GeminiAPI.generateContent({
                model: 'gemini-1.5-pro',
                prompt: optimizedPrompt,
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: maxTokens
              });
              usedProvider = 'gemini';
              usedModel = 'gemini-1.5-pro';
              providerHealthMonitor.recordProviderSuccess('gemini', Date.now());
              usedFallback = i > 0;
              break;
            }
            
          } catch (providerError: any) {
            lastError = providerError;
            console.log(`[Content Generation] ${provider} failed: ${providerError.message}`);
            providerHealthMonitor.recordProviderError(provider, providerError.message);
            
            // Continue to next provider
            if (i === fallbackProviders.length - 1) {
              // All providers failed
              throw new Error(`All providers failed. Last error: ${providerError.message}`);
            }
          }
        }
        
        if (!generatedContent) {
          throw new Error(`Content generation failed across all providers. Last error: ${lastError?.message}`);
        }
        
        if (usedFallback) {
          console.log(`[Content Generation] Successfully used fallback provider: ${usedProvider}`);
        }
      } else {
        // Use the prompt router for non-briefing content
        const routingDecision = await promptRouter.routeRequest(config);
        console.log(`[Content Generation] Routing to ${routingDecision.provider} with model ${routingDecision.model}`);

        // Execute the generation with fallback handling
        const fallbackProviders = ['anthropic', 'openai', 'gemini'];
        let lastError: any;
        let providerIndex = 0;
        
        // Start with the routing decision provider
        if (routingDecision.provider && fallbackProviders.includes(routingDecision.provider)) {
          providerIndex = fallbackProviders.indexOf(routingDecision.provider);
        }
        
        for (let i = 0; i < fallbackProviders.length; i++) {
          const currentProvider = fallbackProviders[(providerIndex + i) % fallbackProviders.length];
          try {
            console.log(`[Content Generation] Attempting ${currentProvider} for non-briefing content`);
            
            if (currentProvider === 'anthropic') {
              generatedContent = await AnthropicAPI.generateContent({
                model: 'claude-3-5-sonnet-20241022',
                prompt: userPrompt,
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: 3000
              });
              usedProvider = 'anthropic';
              usedModel = 'claude-3-5-sonnet-20241022';
              break;
              
            } else if (currentProvider === 'openai') {
              // Use appropriate OpenAI model
              const openaiModel = routingDecision.model && routingDecision.model.startsWith('gpt-') 
                ? routingDecision.model 
                : 'gpt-4o';
              generatedContent = await generateContentDirect(userPrompt, enhancedSystemPrompt, openaiModel);
              usedProvider = 'openai';
              usedModel = openaiModel;
              break;
              
            } else if (currentProvider === 'gemini') {
              generatedContent = await GeminiAPI.generateContent({
                model: 'gemini-1.5-pro',
                prompt: userPrompt,
                systemPrompt: enhancedSystemPrompt,
                temperature: temperature || 0.7,
                maxTokens: 3000
              });
              usedProvider = 'gemini';
              usedModel = 'gemini-1.5-pro';
              break;
            }
            
          } catch (providerError: any) {
            lastError = providerError;
            console.log(`[Content Generation] ${currentProvider} failed: ${providerError.message}`);
            
            if (i === fallbackProviders.length - 1) {
              throw new Error(`All providers failed. Last error: ${providerError.message}`);
            }
          }
        }
        
        // Ensure provider and model are set from routing decision
        if (routingDecision && !usedProvider.startsWith('anthropic')) {
          usedProvider = routingDecision.provider;
          usedModel = routingDecision.model;
        }
      }

      res.json({ 
        content: generatedContent,
        provider: usedProvider,
        model: usedModel
      });
    } catch (error: any) {
      console.error('Content generation error:', error.message);
      console.error('Full error stack:', error.stack);
      res.status(500).json({ 
        error: 'Content generation failed',
        message: error.message,
        stack: error.stack ? error.stack.split('\n')[1] : 'No stack trace'
      });
    }
  });

  // Generate content endpoint
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      const { prompt, userPrompt, systemPrompt, model, provider, temperature, maxTokens } = req.body;
      
      // Accept either 'userPrompt' or 'prompt' for compatibility
      const actualPrompt = userPrompt || prompt;
      
      if (!actualPrompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // GEMINI-ONLY MODE: Intercept and route all requests to Gemini
      if (process.env.GEMINI_ONLY_MODE === 'true') {
        console.log('[Generate Content] GEMINI-ONLY MODE active - routing to Gemini 2.0');
        
        try {
          const isComplex = actualPrompt.length > 200 || 
                           actualPrompt.toLowerCase().includes('comprehensive') ||
                           actualPrompt.toLowerCase().includes('analyze');
          
          const geminiModel = GeminiAPI.selectGeminiModel(isComplex, true);
          console.log(`[Gemini-Only] Using model: ${geminiModel}`);
          
          const result = await GeminiAPI.generateContent({
            model: geminiModel,
            prompt: actualPrompt,
            systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 3000
          });
          
          return res.json({
            content: result,
            provider: 'gemini',
            model: geminiModel
          });
        } catch (geminiError: any) {
          console.error('[Gemini-Only] Error in generate-content:', geminiError);
          return res.status(500).json({
            error: 'Content generation failed',
            details: geminiError.message,
            provider: 'gemini'
          });
        }
      }

      let result;
      
      if (provider === 'anthropic') {
        result = await AnthropicAPI.generateContent({
          model: model || 'claude-3-5-sonnet-20241022',
          prompt: actualPrompt,
          systemPrompt,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 3000
        });
      } else if (provider === 'gemini') {
        result = await GeminiAPI.generateContent({
          model: model || 'gemini-1.5-pro',
          prompt: actualPrompt,
          systemPrompt,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 3000
        });
      } else {
        // For brief analysis, prioritize Anthropic for better reasoning
        if (actualPrompt.toLowerCase().includes('brief') || actualPrompt.toLowerCase().includes('analyze')) {
          console.log('[Content Generation] Using Anthropic for brief analysis');
          result = await AnthropicAPI.generateContent({
            model: 'claude-3-5-sonnet-20241022',
            prompt: actualPrompt,
            systemPrompt,
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 3000
          });
        } else {
          // Use GPT-4o for other content with fallback
          try {
            result = await generateContentDirect(actualPrompt, systemPrompt, model || 'gpt-4o');
          } catch (error: any) {
            console.warn('OpenAI failed, falling back to Anthropic:', error.message);
            result = await AnthropicAPI.generateContent({
              model: 'claude-3-5-sonnet-20241022',
              prompt: actualPrompt,
              systemPrompt,
              temperature: temperature || 0.7,
              maxTokens: maxTokens || 3000
            });
          }
        }
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

  // Brief analysis endpoint
  app.post("/api/analyze-brief", async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const analysis = await analyzeBriefText(content);
      res.json(analysis);
    } catch (error: any) {
      console.error('Brief analysis error:', error);
      res.status(500).json({ error: "Brief analysis failed", details: error.message });
    }
  });

  // Image generation endpoint
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { 
        prompt, 
        model = "gpt-image-1", 
        size = "1024x1024", 
        quality = "high", 
        background = "auto",
        n = 1
      } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // GEMINI-ONLY MODE: Use Imagen 3 for image generation
      if (process.env.GEMINI_ONLY_MODE === 'true') {
        console.log('[Image Generation] GEMINI-ONLY MODE active - routing to Imagen 3');
        
        try {
          const imagenResult = await ImagenAPI.generateImageWithImagen({
            prompt,
            size,
            quality,
            n,
            model: 'imagen-3'
          });
          
          console.log('[Imagen 3] Successfully generated image(s)');
          return res.json({
            ...imagenResult,
            provider: 'google',
            geminiOnly: true,
            note: 'Generated using Imagen 3 (vendor compliance mode)'
          });
        } catch (imagenError: any) {
          console.error('[Imagen 3] Generation failed:', imagenError);
          
          // Fallback to placeholder if Imagen fails
          const placeholderUrl = `data:image/svg+xml;base64,${Buffer.from(`
            <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
              <rect width="1024" height="1024" fill="#e0e0e0"/>
              <text x="512" y="490" font-family="Arial" font-size="20" text-anchor="middle" fill="#666">
                Imagen 3 Generation Placeholder
              </text>
              <text x="512" y="520" font-family="Arial" font-size="14" text-anchor="middle" fill="#999">
                ${prompt.substring(0, 60)}...
              </text>
              <text x="512" y="550" font-family="Arial" font-size="12" text-anchor="middle" fill="#aaa">
                (Image generation via Google Imagen 3)
              </text>
            </svg>
          `).toString('base64')}`;
          
          return res.json({
            images: [{ url: placeholderUrl, revised_prompt: prompt }],
            model: 'imagen-3',
            prompt,
            provider: 'google',
            geminiOnly: true,
            note: 'Imagen 3 placeholder (actual generation requires Google Cloud setup)'
          });
        }
      }

      // Original OpenAI implementation
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      console.log(`Generating image with ${model}, size: ${size}, quality: ${quality}`);
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: n,
        size: size as any,
        quality: quality as any,
        background: background as any
      });

      if (!response.data || response.data.length === 0) {
        return res.status(500).json({ error: "No images were generated" });
      }

      const firstImage = response.data[0];
      const revisedPrompt = firstImage.revised_prompt || prompt;
      let imageUrl = firstImage.url;

      if (!imageUrl && firstImage.b64_json) {
        imageUrl = `data:image/png;base64,${firstImage.b64_json}`;
      }

      return res.json({ 
        images: [{ url: imageUrl, revised_prompt: revisedPrompt }],
        model,
        prompt
      });

    } catch (error: any) {
      console.error('Image generation error:', error);
      
      if (error.status === 401) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      if (error.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }
      
      if (error.status === 400) {
        return res.status(400).json({ 
          error: "Bad request", 
          details: error.message || "Invalid request parameters" 
        });
      }
      
      return res.status(500).json({ 
        error: "Image generation failed", 
        details: error.message || "Unknown error" 
      });
    }
  });

  // Image editing endpoint
  app.post("/api/edit-image", async (req: Request, res: Response) => {
    try {
      const { image, mask, prompt, model = "gpt-image-1", size = "1024x1024", quality = "standard", n = 1 } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "Image is required" });
      }
      
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // GEMINI-ONLY MODE: Use Imagen 3 for image editing
      if (process.env.GEMINI_ONLY_MODE === 'true') {
        console.log('[Image Editing] GEMINI-ONLY MODE active - routing to Imagen 3');
        
        try {
          const imagenResult = await ImagenAPI.editImageWithImagen({
            image,
            mask,
            prompt,
            size,
            quality,
            n
          });
          
          console.log('[Imagen 3] Successfully edited image');
          return res.json({
            ...imagenResult,
            provider: 'google',
            geminiOnly: true,
            note: 'Edited using Imagen 3 (generates new image based on edit prompt)'
          });
        } catch (imagenError: any) {
          console.error('[Imagen 3] Edit failed:', imagenError);
          
          // Fallback to placeholder
          const placeholderUrl = `data:image/svg+xml;base64,${Buffer.from(`
            <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
              <rect width="1024" height="1024" fill="#e0e0e0"/>
              <text x="512" y="490" font-family="Arial" font-size="20" text-anchor="middle" fill="#666">
                Imagen 3 Edit Placeholder
              </text>
              <text x="512" y="520" font-family="Arial" font-size="14" text-anchor="middle" fill="#999">
                ${prompt.substring(0, 60)}...
              </text>
              <text x="512" y="550" font-family="Arial" font-size="12" text-anchor="middle" fill="#aaa">
                (Image editing via Google Imagen 3)
              </text>
            </svg>
          `).toString('base64')}`;
          
          return res.json({
            images: [{ url: placeholderUrl, revised_prompt: prompt }],
            model: 'imagen-3',
            prompt,
            provider: 'google',
            geminiOnly: true,
            note: 'Imagen 3 placeholder (actual editing requires Google Cloud setup)'
          });
        }
      }

      console.log('GPT Image editing request:', { 
        hasImage: !!image, 
        hasMask: !!mask, 
        prompt: prompt.substring(0, 50) + '...',
        model,
        size 
      });

      // Convert image to proper base64 format for GPT Image
      let imageBase64: string;
      try {
        if (image.startsWith('data:')) {
          // Extract base64 data from data URL
          imageBase64 = image.split(',')[1];
        } else if (image.startsWith('http')) {
          // Fetch image from URL and convert to base64
          const response = await fetch(image);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          imageBase64 = buffer.toString('base64');
        } else {
          // Assume it's already base64
          imageBase64 = image;
        }
      } catch (error: any) {
        console.error('Error processing image:', error);
        return res.status(400).json({ error: "Invalid image format or URL" });
      }

      // Convert mask to base64 if provided
      let maskBase64: string | undefined;
      if (mask) {
        try {
          if (mask.startsWith('data:')) {
            maskBase64 = mask.split(',')[1];
          } else {
            maskBase64 = mask;
          }
        } catch (error: any) {
          console.error('Error processing mask:', error);
          return res.status(400).json({ error: "Invalid mask format" });
        }
      }

      try {
        console.log(`Using ${model} for image editing`);
        console.log('=== DETAILED DEBUG INFO ===');
        
        // Convert base64 to buffers and ensure proper PNG format
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        console.log('Original image buffer size:', imageBuffer.length);
        
        // Get image metadata to ensure consistent sizing
        const imageMetadata = await sharp(imageBuffer).metadata();
        console.log('Original image dimensions:', imageMetadata.width, 'x', imageMetadata.height);
        
        const processedImageBuffer = await sharp(imageBuffer)
          .png()
          .toBuffer();
        console.log('Processed image buffer size:', processedImageBuffer.length);
        
        if (maskBase64) {
          console.log('Performing inpainting with mask');
          
          const maskBuffer = Buffer.from(maskBase64, 'base64');
          console.log('Original mask buffer size:', maskBuffer.length);
          
          // Get mask metadata
          const maskMetadata = await sharp(maskBuffer).metadata();
          console.log('Original mask dimensions:', maskMetadata.width, 'x', maskMetadata.height);
          
          // Test mask inversion - gpt-image-1 might expect opposite polarity from DALL-E
          // Try inverted mask: black = edit areas, white = preserve areas
          const processedMaskBuffer = await sharp(maskBuffer)
            .resize(imageMetadata.width, imageMetadata.height, { fit: 'fill' })
            .greyscale()
            .threshold(128) // Convert to pure black/white
            .negate() // INVERT: Try black for edit areas, white for preserve areas
            .png()
            .toBuffer();
          console.log('Processed mask buffer size:', processedMaskBuffer.length);
          console.log('Final dimensions - Image:', imageMetadata.width, 'x', imageMetadata.height, 'Mask: resized to match');
          console.log('IMPORTANT: Sending FULL original image + mask (not just masked area)');
          
          // No need for temporary files when using toFile
          
          try {
            // Use toFile from OpenAI SDK for proper file handling
            const { toFile } = await import('openai');
            
            const imageFile = await toFile(processedImageBuffer, 'image.png', { type: 'image/png' });
            const maskFile = await toFile(processedMaskBuffer, 'mask.png', { type: 'image/png' });
            
            console.log('Image file object:', {
              type: typeof imageFile,
              constructor: imageFile.constructor.name,
              size: imageFile.size,
              type_prop: imageFile.type,
              name: imageFile.name
            });
            
            console.log('Mask file object:', {
              type: typeof maskFile,
              constructor: maskFile.constructor.name,
              size: maskFile.size,
              type_prop: maskFile.type,
              name: maskFile.name
            });
            
            console.log('Calling OpenAI API with model:', model);
            console.log('Image dimensions:', imageMetadata.width, 'x', imageMetadata.height);
            console.log('Mask dimensions after processing:', processedMaskBuffer.length, 'bytes');
            console.log('TESTING: Using INVERTED mask (black=edit, white=preserve) for gpt-image-1');
            
            // Test if gpt-image-1 has different parameter requirements for full scene inpainting
            const editParams: any = {
              model: model,
              image: imageFile,
              mask: maskFile,
              prompt: prompt.trim(),
              n: 1,
              size: (size || "1024x1024") as any
            };
            
            // Research: Try adding parameters that might influence gpt-image-1 behavior
            // Some models may have undocumented parameters for scene preservation
            console.log('Testing gpt-image-1 with standard parameters...');
            console.log('Edit parameters:', Object.keys(editParams));
            
            const editResponse = await openai.images.edit(editParams);

            console.log(`${model} inpainting completed successfully`);

            const responseData = {
              success: true,
              images: editResponse.data.map(img => ({
                url: img.url || `data:image/png;base64,${img.b64_json}`,
                revised_prompt: img.revised_prompt || prompt
              })),
              method: `${model}_inpaint`
            };
            
            console.log('Sending response with', responseData.images.length, 'images');
            console.log('First image URL length:', responseData.images[0]?.url?.length);
            console.log('First image URL type:', responseData.images[0]?.url?.startsWith('data:') ? 'base64' : 'url');
            
            return res.json(responseData);
          } finally {
            // No cleanup needed with toFile
          }
        } else {
          console.log('Creating image variation');
          
          // No need for temporary files when using toFile
          
          try {
            // Use toFile from OpenAI SDK for proper file handling
            const { toFile } = await import('openai');
            
            const imageFile = await toFile(processedImageBuffer, 'image.png', { type: 'image/png' });
            
            console.log('Image file object:', {
              type: typeof imageFile,
              constructor: imageFile.constructor.name,
              size: imageFile.size,
              type_prop: imageFile.type,
              name: imageFile.name
            });
            
            console.log('Calling OpenAI API with model:', model);
            const editResponse = await openai.images.edit({
              model: model,
              image: imageFile,
              prompt: prompt.trim(),
              n: 1,
              size: (size || "1024x1024") as any
            });

            console.log(`${model} variation completed successfully`);

            const responseData = {
              success: true,
              images: editResponse.data.map(img => ({
                url: img.url || `data:image/png;base64,${img.b64_json}`,
                revised_prompt: img.revised_prompt || prompt
              })),
              method: `${model}_edit`
            };
            
            console.log('Sending variation response with', responseData.images.length, 'images');
            console.log('First image URL length:', responseData.images[0]?.url?.length);
            console.log('First image URL type:', responseData.images[0]?.url?.startsWith('data:') ? 'base64' : 'url');
            
            return res.json(responseData);
          } finally {
            // No cleanup needed with toFile
          }
        }

      } catch (apiError: any) {
        console.error('GPT Image editing error:', apiError);
        throw apiError;
      }

    } catch (error: any) {
      console.error('Image editing error:', error);
      
      // Handle OpenAI content policy violations
      if (error.code === 'moderation_blocked' || error.type === 'image_generation_user_error') {
        return res.status(400).json({ 
          error: 'Content policy violation: Your edit request was blocked by OpenAI\'s safety system. Please try a different prompt that avoids demographic transformations or sensitive content.',
          details: error.message,
          type: 'content_policy_violation'
        });
      }
      
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
        error: "Image editing failed", 
        details: error.message || "Unknown error occurred"
      });
    }
  });

  // Chat sessions CRUD operations
  app.get("/api/chat-sessions", async (_req: Request, res: Response) => {
    try {
      const sessions = await storage.getChatSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/chat-sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await storage.getChatSession(parseInt(req.params.id));
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch chat session" });
    }
  });

  app.post("/api/chat-sessions", async (req: Request, res: Response) => {
    try {
      const session = await storage.saveChatSession(req.body);
      res.status(201).json(session);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  app.put("/api/chat-sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await storage.updateChatSession(parseInt(req.params.id), req.body);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update chat session" });
    }
  });

  app.delete("/api/chat-sessions/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteChatSession(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete chat session" });
    }
  });

  // Personas CRUD operations
  app.get("/api/personas", async (_req: Request, res: Response) => {
    try {
      const personas = await storage.getPersonas();
      res.json(personas);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch personas" });
    }
  });

  app.get("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const persona = await storage.getPersona(req.params.id);
      if (!persona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      res.json(persona);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch persona" });
    }
  });

  app.post("/api/personas", async (req: Request, res: Response) => {
    try {
      const persona = await storage.savePersona(req.body);
      res.status(201).json(persona);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create persona" });
    }
  });

  app.put("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const persona = await storage.updatePersona(req.params.id, req.body);
      if (!persona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      res.json(persona);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update persona" });
    }
  });

  app.delete("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      await storage.deletePersona(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete persona" });
    }
  });

  // Reference images endpoint for briefs
  app.get("/api/briefs/:id/reference-images", async (req: Request, res: Response) => {
    try {
      const briefId = parseInt(req.params.id);
      const brief = await storage.getGeneratedContent(briefId);
      
      if (!brief) {
        return res.status(404).json({ error: "Brief not found" });
      }
      
      if (brief.contentType !== 'briefing') {
        return res.status(400).json({ error: "Content is not a briefing" });
      }
      
      const referenceImages = brief.referenceImages || [];
      res.json({ referenceImages });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch reference images" });
    }
  });

  // Brief conversations CRUD operations
  app.get("/api/brief-conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await storage.getBriefConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch brief conversations" });
    }
  });

  // Unified briefing endpoint - combines brief-conversations and generated-contents briefings
  app.get("/api/unified-briefings", async (req: Request, res: Response) => {
    try {
      // Get both types of briefings
      const briefConversations = await storage.getBriefConversations();
      const generatedBriefings = await storage.getGeneratedContents();
      const filteredBriefings = generatedBriefings.filter(content => content.contentType === 'briefing');
      
      // Convert brief conversations to unified format
      const unifiedConversations = briefConversations.map(conv => {
        // Extract content from messages if content field doesn't exist
        let content = conv.content;
        if (!content && conv.messages && Array.isArray(conv.messages)) {
          // Combine all assistant messages as the briefing content
          const assistantMessages = conv.messages
            .filter((msg: any) => msg.role === 'assistant')
            .map((msg: any) => msg.content)
            .join('\n\n');
          content = assistantMessages || 'No content available';
        }
        
        // Ensure content is always a string
        if (typeof content !== 'string') {
          if (content && typeof content === 'object') {
            try {
              content = JSON.stringify(content, null, 2);
            } catch (e) {
              content = String(content);
            }
          } else {
            content = String(content || 'No content available');
          }
        }
        
        return {
          id: `chat-${conv.id}`,
          title: conv.title || 'SAGE Chat Brief',
          content: content,
          contentType: 'briefing' as const,
          source: 'chat',
          createdAt: conv.createdAt || new Date().toISOString(),
          updatedAt: conv.updatedAt || new Date().toISOString(),
          metadata: {
            analysisType: conv.analysisType,
            projectType: conv.projectType,
            deliverables: conv.deliverables,
            messageCount: conv.messages?.length || 0
          }
        };
      });
      
      // Convert generated briefings to unified format
      const unifiedGenerated = filteredBriefings.map(brief => {
        // Ensure content is always a string
        let content = brief.content;
        if (typeof content !== 'string') {
          if (content && typeof content === 'object') {
            try {
              content = JSON.stringify(content, null, 2);
            } catch (e) {
              content = String(content);
            }
          } else {
            content = String(content || 'No content available');
          }
        }
        
        return {
          id: `generated-${brief.id}`,
          title: brief.title,
          content: content,
          contentType: 'briefing' as const,
          source: 'form',
          createdAt: brief.createdAt,
          updatedAt: brief.updatedAt,
          metadata: brief.metadata
        };
      });
      
      // Combine and sort by most recent
      const allBriefings = [...unifiedConversations, ...unifiedGenerated]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      res.json(allBriefings);
    } catch (error: any) {
      console.error('Failed to fetch unified briefings:', error);
      res.status(500).json({ error: "Failed to fetch unified briefings" });
    }
  });

  app.get("/api/brief-conversations/:id", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getBriefConversation(parseInt(req.params.id));
      if (!conversation) {
        return res.status(404).json({ error: "Brief conversation not found" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch brief conversation" });
    }
  });

  app.post("/api/brief-conversations", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.saveBriefConversation(req.body);
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create brief conversation" });
    }
  });

  app.put("/api/brief-conversations/:id", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.updateBriefConversation(parseInt(req.params.id), req.body);
      if (!conversation) {
        return res.status(404).json({ error: "Brief conversation not found" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update brief conversation" });
    }
  });

  app.delete("/api/brief-conversations/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteBriefConversation(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete brief conversation" });
    }
  });

  // Generated contents CRUD operations
  app.get("/api/generated-contents", async (req: Request, res: Response) => {
    try {
      const contents = await storage.getGeneratedContents();
      const { contentType } = req.query;
      
      if (contentType) {
        const filtered = contents.filter(content => content.contentType === contentType);
        res.json(filtered);
      } else {
        res.json(contents);
      }
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch generated contents" });
    }
  });

  app.get("/api/generated-contents/:id", async (req: Request, res: Response) => {
    try {
      const content = await storage.getGeneratedContent(parseInt(req.params.id));
      if (!content) {
        return res.status(404).json({ error: "Generated content not found" });
      }
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch generated content" });
    }
  });

  app.post("/api/generated-contents", async (req: Request, res: Response) => {
    try {
      const content = await storage.saveGeneratedContent(req.body);
      res.status(201).json(content);
    } catch (error: any) {
      console.error('Error saving generated content:', error);
      res.status(500).json({ error: "Failed to create generated content" });
    }
  });

  app.put("/api/generated-contents/:id", async (req: Request, res: Response) => {
    try {
      const content = await storage.updateGeneratedContent(parseInt(req.params.id), req.body);
      if (!content) {
        return res.status(404).json({ error: "Generated content not found" });
      }
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update generated content" });
    }
  });

  app.delete("/api/generated-contents/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteGeneratedContent(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete generated content" });
    }
  });

  // Generated images CRUD operations with enhanced error handling
  app.get("/api/generated-images", async (_req: Request, res: Response) => {
    try {
      const images = await storage.getGeneratedImages();
      res.json(images);
    } catch (error: any) {
      console.error('Failed to fetch generated images:', error);
      
      // Enhanced error handling for database connection issues
      if (error.message?.includes('Control plane request failed') || 
          error.code === 'XX000' || 
          error.message?.includes('connection')) {
        console.log("Database connection issue detected, returning empty array to prevent UI breaking");
        res.json([]);
      } else {
        res.status(500).json({ error: "Failed to fetch generated images", details: error.message });
      }
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
    } catch (error: any) {
      console.error('Failed to fetch generated image:', error);
      res.status(500).json({ error: "Failed to fetch generated image" });
    }
  });

  app.post("/api/generated-images", async (req: Request, res: Response) => {
    try {
      const { title, prompt, imageUrl, style, size, quality, model, metadata } = req.body;
      
      if (!title || !prompt || !imageUrl) {
        return res.status(400).json({ error: "Title, prompt, and imageUrl are required" });
      }
      
      console.log('Saving generated image:', { title, model, size, quality });
      
      const savedImage = await storage.saveGeneratedImage({
        title,
        prompt,
        imageUrl,
        style: style || null,
        size: size || null,
        quality: quality || null,
        model: model || "gpt-image-1",
        metadata: metadata || null,
      });
      
      res.status(201).json(savedImage);
    } catch (error: any) {
      console.error('Failed to save generated image:', error);
      res.status(500).json({ error: "Failed to save generated image", details: error.message });
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
    } catch (error: any) {
      console.error('Failed to update generated image:', error);
      res.status(500).json({ error: "Failed to update generated image" });
    }
  });

  app.delete("/api/generated-images/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const success = await storage.deleteGeneratedImage(id);
      
      if (!success) {
        return res.status(404).json({ error: "Generated image not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error('Failed to delete generated image:', error);
      res.status(500).json({ error: "Failed to delete generated image" });
    }
  });

  // Brief processing endpoint for file uploads
  app.post("/api/process-brief", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Extract both text and images from file buffer
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      
      try {
        // First extract text content
        const extractedText = await extractTextFromFile(req.file.buffer, fileExt);
        
        // Analyze the extracted text
        const analysis = await analyzeBriefText(extractedText);
        
        // Try to extract images (if implemented for this file type)
        let referenceImages: any[] = [];
        try {
          const extractedContent = await extractContentFromFile(req.file.buffer, fileExt, req.file.originalname);
          referenceImages = extractedContent.images.map((img: any) => ({
            id: img.id,
            filename: img.filename,
            base64: img.base64,
            analysis: img.analysis || `Extracted from ${req.file?.originalname || 'document'}`
          }));
        } catch (imageError) {
          console.log('Image extraction not available for this file type, continuing with text only');
        }
        
        // Create metadata object with null checks
        const metadata = {
          filename: req.file?.originalname || 'unknown',
          filesize: req.file?.size || 0,
          uploadedAt: new Date().toISOString(),
          category: analysis.category || 'general',
          imagesExtracted: referenceImages.length,
          source: 'document_upload',
          ...analysis.metadata
        };
        
        // Save to generated contents as briefing type with images
        const savedContent = await storage.saveGeneratedContent({
          title: analysis.title || `Brief - ${new Date().toLocaleDateString()}`,
          content: analysis.content,
          contentType: 'briefing',
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          metadata: metadata as any
        });

        res.json({
          success: true,
          content: analysis.content,
          title: analysis.title,
          category: analysis.category,
          id: savedContent.id,
          saved: true,
          imagesExtracted: referenceImages.length,
          referenceImages: referenceImages,
          metadata: analysis.metadata
        });
      } catch (extractError: any) {
        // Fallback to text-only extraction if enhanced extraction fails
        console.warn('Enhanced extraction failed, falling back to text-only:', extractError);
        
        const extractedText = await extractTextFromFile(req.file.buffer, fileExt);
        const analysis = await analyzeBriefText(extractedText);
        
        const fallbackMetadata = {
          filename: req.file.originalname,
          filesize: req.file.size,
          uploadedAt: new Date().toISOString(),
          category: analysis.category || 'general',
          source: 'document_upload',
          extractionMethod: 'text_only_fallback',
          wordCount: analysis.metadata?.wordCount || 0,
          extractedAt: analysis.metadata?.extractedAt || new Date().toISOString()
        };

        const savedContent = await storage.saveGeneratedContent({
          title: analysis.title || `Brief - ${new Date().toLocaleDateString()}`,
          content: analysis.content,
          contentType: 'briefing',
          metadata: fallbackMetadata as any
        });

        res.json({
          success: true,
          content: analysis.content,
          title: analysis.title,
          category: analysis.category,
          id: savedContent.id,
          saved: true,
          imagesExtracted: 0,
          metadata: analysis.metadata
        });
      }
    } catch (error: any) {
      console.error('Brief processing error:', error);
      res.status(500).json({ 
        error: "Brief processing failed", 
        details: error.message 
      });
    }
  });

  // Content generation endpoint for Visual tab
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      const { model, systemPrompt, userPrompt, prompt, temperature } = req.body;
      
      // Accept either 'userPrompt' or 'prompt' for compatibility
      const content = userPrompt || prompt;
      
      if (!content) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const result = await generateContentDirect(content, systemPrompt || '', model || 'gpt-4o');
      
      res.json({ 
        content: result,
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

  // Image processing endpoint for format conversion and scaling
  app.post("/api/image-processing", upload.single('image'), processImage);

  // Brief interpretation endpoint
  app.post("/api/interpret-brief", async (req: Request, res: Response) => {
    try {
      const { brief, briefContent, model, visualRequirements } = req.body;
      
      // Accept either 'brief' or 'briefContent' for compatibility
      const content = brief || briefContent;
      
      if (!content) {
        return res.status(400).json({ error: "Brief content is required" });
      }

      const systemPrompt = `You are SAGE, a British marketing specialist. Analyze creative briefs and identify visual content needs. Be conversational and helpful.`;
      
      const userPrompt = `Please analyze this creative brief and tell me what visual content we need to create:

${content}

Focus on identifying the specific visual deliverables (number of images, type of content, platforms) and ask if I'd like you to create image generation prompts for them.`;

      const result = await generateContentDirect(userPrompt, systemPrompt, model || 'gpt-4o');
      
      res.json({ 
        success: true,
        interpretation: result,
        prompt: result // For compatibility with existing frontend
      });
    } catch (error: any) {
      console.error('Brief interpretation error:', error);
      res.status(500).json({ 
        error: "Brief interpretation failed", 
        details: error.message 
      });
    }
  });

  // Image Projects API Routes with enhanced error handling
  app.get("/api/image-projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getImageProjects();
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching image projects:", error);
      
      // Enhanced error handling for database connection issues
      if (error.message?.includes('Control plane request failed') || 
          error.code === 'XX000' || 
          error.message?.includes('connection')) {
        console.log("Database connection issue detected, returning empty array to prevent UI breaking");
        res.json([]);
      } else {
        res.status(500).json({ 
          error: "Failed to fetch image projects", 
          details: error.message 
        });
      }
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
      
      const project = await storage.getImageProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Image project not found" });
      }
      
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

  // Campaign Management API Routes (redirected to database)

  // Removed duplicate route - using database version below

  app.post("/api/campaigns", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        INSERT INTO campaigns (
          name, description, status, start_date, end_date, budget,
          objectives, target_audience, brand_guidelines, deliverables,
          team_members, linked_content, linked_projects, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        req.body.name,
        req.body.description || '',
        req.body.status || 'draft',
        req.body.startDate || null,
        req.body.endDate || null,
        req.body.budget || null,
        JSON.stringify(req.body.objectives || []),
        JSON.stringify(req.body.targetAudience || {}),
        JSON.stringify(req.body.brandGuidelines || {}),
        JSON.stringify(req.body.deliverables || []),
        JSON.stringify(req.body.teamMembers || []),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(req.body.metadata || {})
      ]);
      
      const row = result.rows[0];
      const campaign = {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        budget: row.budget,
        objectives: row.objectives || [],
        targetAudience: row.target_audience || {},
        brandGuidelines: row.brand_guidelines || {},
        deliverables: row.deliverables || [],
        teamMembers: row.team_members || [],
        linkedContent: row.linked_content || [],
        linkedProjects: row.linked_projects || [],
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      res.json(campaign);
    } catch (error: any) {
      console.error("Failed to create campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.put("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: "Invalid campaign ID" });
      }
      
      const campaign = await simpleCampaignStorage.updateCampaign(campaignId, req.body);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: "Invalid campaign ID" });
      }
      
      const success = await simpleCampaignStorage.deleteCampaign(campaignId);
      if (!success) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  app.post("/api/campaigns/:id/link-content/:contentId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const contentId = parseInt(req.params.contentId);
      
      if (isNaN(campaignId) || isNaN(contentId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const success = await simpleCampaignStorage.linkContentToCampaign(campaignId, contentId);
      if (!success) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to link content to campaign" });
    }
  });

  app.post("/api/campaigns/:id/link-project/:projectId", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const projectId = parseInt(req.params.projectId);
      
      if (isNaN(campaignId) || isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const success = await simpleCampaignStorage.linkProjectToCampaign(campaignId, projectId);
      if (!success) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to link project to campaign" });
    }
  });

  // Campaign Migration Routes
  // Get all campaigns
  app.get("/api/campaigns", async (_req: Request, res: Response) => {
    try {
      console.log("Fetching campaigns from database...");
      const result = await pool.query(`
        SELECT * FROM campaigns ORDER BY created_at DESC
      `);
      
      console.log("Database query result:", result.rows.length, "campaigns found");
      
      const campaigns = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        budget: row.budget,
        objectives: row.objectives || [],
        targetAudience: row.target_audience || {},
        brandGuidelines: row.brand_guidelines || {},
        deliverables: row.deliverables || [],
        teamMembers: row.team_members || [],
        linkedContent: row.linked_content || [],
        linkedProjects: row.linked_projects || [],
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      console.log("Processed campaigns:", campaigns.length);
      res.json(campaigns);
    } catch (error: any) {
      console.error("Failed to fetch campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Get campaign by ID with linked assets
  app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Get campaign
      const campaignResult = await pool.query(`
        SELECT * FROM campaigns WHERE id = $1
      `, [campaignId]);
      
      if (campaignResult.rows.length === 0) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const row = campaignResult.rows[0];
      const campaign = {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        budget: row.budget,
        objectives: row.objectives || [],
        targetAudience: row.target_audience || {},
        brandGuidelines: row.brand_guidelines || {},
        deliverables: row.deliverables || [],
        teamMembers: row.team_members || [],
        linkedContent: row.linked_content || [],
        linkedProjects: row.linked_projects || [],
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      // Get briefings associated with this campaign
      let briefings = [];
      const briefingResult = await pool.query(`
        SELECT * FROM generated_contents 
        WHERE content_type = 'briefing' 
        AND (campaign_id = $1 OR id = ANY($2))
        ORDER BY created_at DESC
      `, [campaignId, campaign.linkedContent]);
      briefings = briefingResult.rows;
      
      // Get linked content
      let content = [];
      if (campaign.linkedContent && campaign.linkedContent.length > 0) {
        const contentResult = await pool.query(`
          SELECT * FROM generated_contents WHERE id = ANY($1)
        `, [campaign.linkedContent]);
        content = contentResult.rows;
      }
      
      // Get linked projects
      let projects = [];
      if (campaign.linkedProjects && campaign.linkedProjects.length > 0) {
        const projectsResult = await pool.query(`
          SELECT * FROM image_projects WHERE id = ANY($1)
        `, [campaign.linkedProjects]);
        projects = projectsResult.rows;
      }
      
      // Parse briefing deliverables if briefings exist
      let parsedDeliverables: any[] = [];
      if (briefings.length > 0) {
        // Use the first briefing to extract deliverables
        const mainBriefing = briefings[0];
        const parsed = parseBriefingDeliverables(mainBriefing.content);
        parsedDeliverables = matchDeliverablesWithAssets(parsed.deliverables, content, projects);
        
        // Update campaign objectives and target audience if they're empty
        if (campaign.objectives.length === 0 && parsed.objectives.length > 0) {
          campaign.objectives = parsed.objectives;
        }
        if (!campaign.targetAudience.primary && parsed.targetAudience) {
          campaign.targetAudience.primary = parsed.targetAudience;
        }
      }

      const completedCount = parsedDeliverables.filter(d => d.status === 'completed').length;
      const totalCount = parsedDeliverables.length > 0 ? parsedDeliverables.length : campaign.deliverables.length;

      res.json({
        campaign,
        assets: {
          content,
          projects,
          briefings: briefings
        },
        deliverables: parsedDeliverables,
        stats: {
          totalContent: content.length,
          totalProjects: projects.length,
          completedDeliverables: completedCount,
          totalDeliverables: totalCount
        }
      });
    } catch (error: any) {
      console.error("Failed to fetch campaign:", error);
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns/migrate", async (_req: Request, res: Response) => {
    try {
      const { migrateToCampaignSystem } = await import('./campaign-migration');
      const result = await migrateToCampaignSystem();
      res.json({
        success: true,
        message: "Campaign migration completed successfully",
        ...result
      });
    } catch (error: any) {
      console.error("Campaign migration failed:", error);
      res.status(500).json({ 
        error: "Migration failed", 
        details: error.message 
      });
    }
  });

  app.post("/api/campaigns/reset", async (_req: Request, res: Response) => {
    try {
      const { resetCampaignAssignments } = await import('./campaign-migration');
      await resetCampaignAssignments();
      res.json({
        success: true,
        message: "Campaign assignments reset successfully"
      });
    } catch (error: any) {
      console.error("Failed to reset campaign assignments:", error);
      res.status(500).json({ 
        error: "Reset failed", 
        details: error.message 
      });
    }
  });

  // Chat endpoint for SAGE conversations
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
      const decision = await promptRouter.routePrompt(
        message, 
        context?.researchContext || '', 
        routerConfig,
        { stage: 'discovery', projectType: 'content', complexity: 'moderate', priority: 'speed' }
      );

      console.log(`[Chat] Routed to ${decision.provider} with model ${decision.model}`);

      // Build system prompt for SAGE
      const systemPrompt = `You are SAGE (Strategic Adaptive Generative Engine), a professional marketing specialist with 20 years of experience. You use she/her pronouns and maintain memory across all application modules and can reference previous conversations. You have voice input processing capabilities and can guide users through the app interface.

VOICE MODE CONTEXT: When the user is using voice interaction (speaking rather than typing), adapt your response style:
- Keep responses conversational and concise (1-3 sentences maximum)
- Be direct and natural rather than lengthy or detailed
- Focus on key points without extensive elaboration
- Use a friendly, professional conversational tone suitable for spoken dialogue

You communicate in clear, professional marketing language. No dialect, slang, or regional expressions - just straightforward professional communication. You're friendly but businesslike, knowledgeable, and focused on delivering marketing expertise.

CONVERSATION CONTEXT: ${context?.researchContext || 'No additional context'}

You are helpful, knowledgeable, and maintain continuity across conversations. Keep responses conversational and focused on helping with marketing, content creation, and strategic planning.`;

      let chatReply = '';

      // Execute the routed prompt using the prompt router with session history
      const routedResponse = await promptRouter.executeRoutedPrompt(
        decision,
        message,
        context?.researchContext || '',
        systemPrompt,
        context?.sessionHistory || []
      );

      chatReply = routedResponse.content;

      res.json({ 
        content: chatReply,
        model: `${routedResponse.actualProvider}-${routedResponse.actualModel}`,
        provider: routedResponse.actualProvider,
        routing: decision.rationale,
        fallback: routedResponse.actualProvider !== decision.provider ? `Fell back to ${routedResponse.actualProvider}` : undefined,
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

  // Text-to-speech endpoint
  app.post("/api/text-to-speech", async (req: Request, res: Response) => {
    try {
      // Use ElevenLabs voice selection
      const { text, voiceId = '5l5f8iK3YPeGga21rQIX' } = req.body; // Updated voice selection

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }

      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(500).json({ error: 'ElevenLabs API key not configured' });
      }

      console.log(`TTS request: ${text.length} characters`);

      // Clean text for natural speech without accent modifications
      const processedText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n+/g, ' ')
        // Add natural pauses and emphasis
        .replace(/\./g, '... ')  // Longer pauses for natural flow
        .replace(/!/g, '! ')     // Emphasis pauses
        .replace(/\?/g, '? ')    // Question pauses
        .trim();

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: processedText,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.85,
            style: 1.0,
            use_speaker_boost: true
          },
          output_format: "mp3_22050_32"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        return res.status(response.status).json({ error: 'Text-to-speech generation failed' });
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.byteLength.toString());
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(audioBuffer);

    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Pinecone API Routes
  app.get('/api/pinecone/status', async (_req: Request, res: Response) => {
    try {
      const status = await checkPineconeStatus();
      res.json(status);
    } catch (error) {
      console.error('[Pinecone] Status check error:', error);
      res.status(500).json({ 
        configured: false,
        connected: false,
        error: 'Failed to check Pinecone status' 
      });
    }
  });

  app.post('/api/pinecone/chat', async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
      }
      
      console.log('[Pinecone] Chat request with', messages.length, 'messages');
      
      // Format messages for Pinecone
      const pineconeMessages: PineconeMessage[] = messages.map((msg: any) => ({
        role: msg.role || 'user',
        content: msg.content
      }));
      
      // Chat with Pinecone Assistant (stream parameter removed as SDK doesn't support it)
      const response = await chatWithPinecone(pineconeMessages);
      
      // Format response with sources
      res.json({
        content: response.content,
        sources: response.sources,
        provider: 'pinecone',
        model: 'pinecone-helper',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('[Pinecone] Chat error:', error);
      res.status(500).json({ 
        error: 'Failed to chat with Pinecone',
        details: error.message 
      });
    }
  });

  // Learning Engine API Routes
  app.use('/api/learning', learningRouter);

  return server;
}