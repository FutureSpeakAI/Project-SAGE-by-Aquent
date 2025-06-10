import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContent, generateContentDirect, generateImage } from "./openai";
import * as GeminiAPI from "./gemini";
import * as AnthropicAPI from "./anthropic";
import { processBriefFile, analyzeBriefText, extractTextFromFile } from "./brief-processing";
import path from 'path';
import { processImage } from "./image-processing";
import { upload } from './index';
import OpenAI from "openai";
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FormData from 'form-data';
import { performDeepResearch } from "./research-engine";
import { reasoningEngine } from "./reasoning-engine";
import { promptRouter, type PromptRouterConfig } from "./prompt-router";
import { detectLorealBrief, generateLorealInstagramContent } from "./loreal-brief-handler";
import { generateBreathEaseEmails } from "./healthcare-content-generator";

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

      // Route to preferred provider with model optimization for healthcare content
      console.log(`[Content Generation] Provider: ${preferredProvider}, Model: ${model}`);
      if (preferredProvider === 'openai' || model.startsWith('gpt-')) {
        // For complex healthcare content, use gpt-4o-mini for reliability
        const optimizedModel = model === 'gpt-4o' && userPrompt.length > 200 ? 'gpt-4o-mini' : model;
        console.log(`[Content Generation] Routing to OpenAI/${optimizedModel}`);
        try {
          const result = await generateContentDirect(userPrompt, enhancedSystemPrompt, optimizedModel);
          res.json({ 
            content: result, 
            provider: 'openai',
            model: optimizedModel,
            routed: true
          });
          return;
        } catch (openaiError: any) {
          console.log('[Content Generation] OpenAI failed, trying Anthropic fallback:', openaiError.message);
        }
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
      const { model: requestModel, systemPrompt = '', userPrompt, temperature } = req.body;
      
      if (!userPrompt) {
        return res.status(400).json({ error: 'User prompt is required' });
      }

      console.log('[Content Generation] Processing briefing-based content generation');
      console.log('[Content Generation] User prompt length:', userPrompt.length);
      console.log('[Content Generation] System prompt received:', systemPrompt ? 'Yes' : 'No');

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
      
      if (!systemPrompt || systemPrompt.trim().length === 0) {
        enhancedSystemPrompt = `You are a professional healthcare content creator. Create comprehensive, detailed content exactly as specified in the brief.

REQUIREMENTS:
- Generate ALL requested deliverables (emails, posts, articles, etc.)
- For healthcare emails: Include detailed subject lines, comprehensive body copy (400-600 words), clinical benefits, and strong CTAs
- Use proper HTML formatting: <h1>, <h2>, <p>, <ul>, <li>
- Each deliverable must be complete and publication-ready
- Focus on clinical efficacy, patient outcomes, and healthcare provider value
- DO NOT summarize the brief - create the actual content requested`;
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

      // For briefing content, prioritize Anthropic for better instruction following
      const isBriefingContent = userPrompt.includes('CREATIVE BRIEF') || userPrompt.includes('Based on the creative brief');
      
      let generatedContent: string;
      let usedProvider: string = 'anthropic';
      let usedModel: string = 'claude-sonnet-4-20250514';

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

        try {
          // Try GPT-4o first, fallback to GPT-3.5-turbo if timeout
          let model = 'gpt-4o';
          let timeout = 25000;
          
          const makeRequest = async (selectedModel: string, timeoutMs: number) => {
            return fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
              },
              body: JSON.stringify({
                model: selectedModel,
                messages: [
                  { 
                    role: 'system', 
                    content: enhancedSystemPrompt
                  },
                  { role: 'user', content: optimizedPrompt }
                ],
                temperature: temperature || 0.7,
                max_tokens: maxTokens
              }),
              signal: AbortSignal.timeout(timeoutMs)
            });
          };

          let response;
          let actualModel = 'gpt-4o';
          try {
            response = await makeRequest('gpt-4o', 30000);
          } catch (error) {
            console.log('[Content Generation] GPT-4o timeout, using GPT-3.5-turbo');
            actualModel = 'gpt-3.5-turbo';
            response = await makeRequest('gpt-3.5-turbo', 15000);
          }
          
          if (response.ok) {
            const data = await response.json();
            generatedContent = data.choices[0]?.message?.content || 'Content generation unavailable';
            usedProvider = 'openai';
            usedModel = actualModel;
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Content Generation] API Error:', response.status, errorData);
            throw new Error(`OpenAI API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
          }
        } catch (apiError: any) {
          console.error('[Content Generation] Full API Error:', apiError);
          if (apiError.name === 'AbortError' || apiError.message.includes('timeout')) {
            throw new Error('Content generation timed out. The request took too long to process.');
          }
          throw new Error(`API Error: ${apiError.message}`);
        }
      } else {
        // Use the prompt router for non-briefing content
        const routingDecision = await promptRouter.routeRequest(config);
        console.log(`[Content Generation] Routing to ${routingDecision.provider} with model ${routingDecision.model}`);

        // Execute the generation based on routing decision
        if (routingDecision.provider === 'anthropic') {
          generatedContent = await AnthropicAPI.generateContent({
            model: routingDecision.model,
            prompt: userPrompt,
            systemPrompt: enhancedSystemPrompt,
            temperature: temperature || 0.7,
            maxTokens: 3000
          });
        } else if (routingDecision.provider === 'gemini') {
          generatedContent = await GeminiAPI.generateContent({
            model: routingDecision.model,
            prompt: userPrompt,
            systemPrompt: enhancedSystemPrompt,
            temperature: temperature || 0.7,
            maxTokens: 3000
          });
        } else {
          // Default to OpenAI
          generatedContent = await generateContentDirect(userPrompt, enhancedSystemPrompt, routingDecision.model);
          usedProvider = 'openai';
          usedModel = routingDecision.model;
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

      console.log('Image editing request:', { 
        hasImage: !!image, 
        hasMask: !!mask, 
        prompt: prompt.substring(0, 50) + '...',
        model,
        size 
      });

      // Convert image URL to buffer for OpenAI API
      let imageBuffer: Buffer;
      try {
        if (image.startsWith('data:')) {
          // Handle data URL
          const base64Data = image.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          // Handle HTTP URL
          const response = await fetch(image);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }
      } catch (error: any) {
        console.error('Error processing image URL:', error);
        return res.status(400).json({ error: "Invalid image URL or format" });
      }

      // Handle mask if provided for inpainting
      let maskBuffer: Buffer | undefined;
      if (mask) {
        try {
          const base64Data = mask.split(',')[1];
          maskBuffer = Buffer.from(base64Data, 'base64');
        } catch (error: any) {
          console.error('Error processing mask:', error);
          return res.status(400).json({ error: "Invalid mask format" });
        }
      }

      // Create temporary files for proper OpenAI API compatibility
      const tempImagePath = path.join(process.cwd(), `temp_image_${Date.now()}.png`);
      fs.writeFileSync(tempImagePath, imageBuffer);
      
      let tempMaskPath: string | null = null;
      if (maskBuffer) {
        tempMaskPath = path.join(process.cwd(), `temp_mask_${Date.now()}.png`);
        fs.writeFileSync(tempMaskPath, maskBuffer);
        console.log('Performing inpainting with mask');
      } else {
        console.log('Performing outpainting/extension');
      }

      try {
        // Create FormData with file streams
        const form = new FormData();
        form.append('image', fs.createReadStream(tempImagePath), {
          filename: 'image.png',
          contentType: 'image/png'
        });
        form.append('prompt', prompt.trim());
        form.append('n', String(parseInt(String(n)) || 1));
        form.append('size', size || "1024x1024");
        
        if (tempMaskPath) {
          form.append('mask', fs.createReadStream(tempMaskPath), {
            filename: 'mask.png',
            contentType: 'image/png'
          });
        }

        // Call OpenAI API directly with fetch
        const response = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            ...form.getHeaders()
          },
          body: form
        });

        const result = await response.json();

        // Clean up temporary files
        fs.unlinkSync(tempImagePath);
        if (tempMaskPath) fs.unlinkSync(tempMaskPath);

        if (!response.ok) {
          throw new Error(result.error?.message || `OpenAI API error: ${response.status}`);
        }

        if (!result.data || result.data.length === 0) {
          throw new Error('No edited image returned from API');
        }

        return res.json({
          success: true,
          images: result.data.map((img: any) => ({
            url: img.url,
            revised_prompt: img.revised_prompt || prompt
          }))
        });
      } catch (apiError) {
        // Clean up files on error
        try {
          fs.unlinkSync(tempImagePath);
          if (tempMaskPath) fs.unlinkSync(tempMaskPath);
        } catch (cleanupError) {
          console.log('Failed to clean up temp files:', cleanupError);
        }
        throw apiError;
      }

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
      const session = await storage.createChatSession(req.body);
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
      const persona = await storage.getPersona(parseInt(req.params.id));
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
      const persona = await storage.createPersona(req.body);
      res.status(201).json(persona);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create persona" });
    }
  });

  app.put("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const persona = await storage.updatePersona(parseInt(req.params.id), req.body);
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
      await storage.deletePersona(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete persona" });
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
      const conversation = await storage.createBriefConversation(req.body);
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
      const content = await storage.createGeneratedContent(req.body);
      res.status(201).json(content);
    } catch (error: any) {
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

  // Generated images CRUD operations
  app.get("/api/generated-images", async (_req: Request, res: Response) => {
    try {
      const images = await storage.getGeneratedImages();
      res.json(images);
    } catch (error: any) {
      console.error('Failed to fetch generated images:', error);
      res.status(500).json({ error: "Failed to fetch generated images" });
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

      // Extract text from file buffer
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const extractedText = await extractTextFromFile(req.file.buffer, fileExt);
      
      // Analyze the extracted text
      const analysis = await analyzeBriefText(extractedText);
      
      // Save to generated contents as briefing type
      const savedContent = await storage.saveGeneratedContent({
        title: analysis.title || `Brief - ${new Date().toLocaleDateString()}`,
        content: analysis.content,
        contentType: 'briefing',
        metadata: {
          filename: req.file.originalname,
          filesize: req.file.size,
          uploadedAt: new Date().toISOString(),
          category: analysis.category || 'general',
          ...analysis.metadata
        }
      });

      res.json({
        success: true,
        content: analysis.content,
        title: analysis.title,
        category: analysis.category,
        id: savedContent.id,
        saved: true,
        metadata: analysis.metadata
      });
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

  // Image Projects API Routes
  app.get("/api/image-projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getImageProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching image projects:", error);
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

  return server;
}