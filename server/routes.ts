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
import { performDeepResearch } from "./research-engine";
import { reasoningEngine } from "./reasoning-engine";
import { promptRouter, type PromptRouterConfig } from "./prompt-router";
import { detectLorealBrief, generateLorealInstagramContent } from "./loreal-brief-handler";

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

  // Content generation with L'Oréal detection
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

      // Enhanced system prompt for better content generation
      const enhancedSystemPrompt = systemPrompt + `

Important: Generate comprehensive, well-structured content that directly addresses the user's request. 
- For briefs, create actual deliverables (posts, emails, etc.) not just descriptions
- Use professional formatting with HTML tags for structure
- Include specific, actionable content that can be immediately used
- For emails, include subject lines, body copy, and calls to action
- Create professional, publication-ready content that matches the brief requirements exactly`;

      // Try Anthropic first
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
      const extractDeliverables = (briefContent: string): string[] => {
        const deliverables: string[] = [];
        const lines = briefContent.toLowerCase().split('\n');
        
        // Look for explicit deliverables sections
        let inDeliverablesSection = false;
        for (const line of lines) {
          if (line.includes('deliverable') || line.includes('requirement') || line.includes('needed:') || line.includes('create:')) {
            inDeliverablesSection = true;
          }
          
          // Extract specific content types
          if (line.includes('blog post') || line.includes('blog content')) deliverables.push('blog post');
          if (line.includes('instagram') || line.includes('social media post')) deliverables.push('Instagram posts');
          if (line.includes('email') && !line.includes('@')) deliverables.push('email campaign');
          if (line.includes('headline') || line.includes('tagline')) deliverables.push('headlines');
          if (line.includes('press release')) deliverables.push('press release');
          if (line.includes('product description')) deliverables.push('product description');
        }
        
        const uniqueDeliverables: string[] = [];
        deliverables.forEach(item => {
          if (!uniqueDeliverables.includes(item)) {
            uniqueDeliverables.push(item);
          }
        });
        return uniqueDeliverables;
      };

      const briefDeliverables = extractDeliverables(userPrompt);
      const hasSpecificDeliverables = briefDeliverables.length > 0;

      // Enhanced system prompt that prioritizes client's instructions
      let enhancedSystemPrompt = systemPrompt;
      
      if (!systemPrompt || systemPrompt.trim().length === 0) {
        enhancedSystemPrompt = `You are a professional content creator executing creative briefs.

CRITICAL INSTRUCTIONS:
- Read the brief carefully and identify the exact deliverables requested
- Create ONLY the content specified (e.g., Instagram posts, emails, headlines, blog posts)
- DO NOT repeat, summarize, or explain the brief
- Use the exact tone, audience, and specifications from the brief
- Include all required elements (headlines, CTAs, copy points, etc.)
- Format output with proper HTML: <h1>, <h2>, <h3> for headings, <strong> for emphasis, <ul>/<li> for lists
- For social media posts, include the actual post copy, hashtags, and captions
- For emails, include subject lines, body copy, and calls to action
- Create professional, publication-ready content that matches the brief requirements exactly`;
      }

      // Add specific deliverable guidance if detected
      if (hasSpecificDeliverables) {
        enhancedSystemPrompt += `\n\nDETECTED DELIVERABLES: ${briefDeliverables.join(', ')}
FOCUS: Create these specific deliverables based on the brief content. Each deliverable should be complete and ready for publication.`;
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
        console.log('[Content Generation] Detected briefing content, using simplified OpenAI execution');
        console.log('[Content Generation] Deliverables detected:', briefDeliverables.join(', ') || 'none specific');
        
        // Use existing generateContentDirect function
        generatedContent = await generateContentDirect(userPrompt, enhancedSystemPrompt, 'gpt-4o-mini');
        usedProvider = 'openai';
        usedModel = 'gpt-4o-mini';
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
      res.status(500).json({ 
        error: 'Content generation failed',
        message: error.message
      });
    }
  });

  // Generate content endpoint
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
        result = await generateContentDirect(prompt, systemPrompt, model || 'gpt-4o');
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
      const { prompt, size, quality } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const result = await generateImage(prompt, size, quality);
      res.json(result);
    } catch (error: any) {
      console.error('Image generation error:', error);
      res.status(500).json({ error: "Image generation failed", details: error.message });
    }
  });

  // Image editing endpoint
  app.post("/api/edit-image", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const { prompt, mask } = req.body;
      const result = await processImage(req.file.path, prompt, mask);
      res.json(result);
    } catch (error: any) {
      console.error('Image editing error:', error);
      res.status(500).json({ error: "Image editing failed", details: error.message });
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

  // Brief interpretation endpoint
  app.post("/api/interpret-brief", async (req: Request, res: Response) => {
    try {
      const { briefContent, visualRequirements } = req.body;
      
      if (!briefContent) {
        return res.status(400).json({ error: "Brief content is required" });
      }

      const systemPrompt = `You are SAGE, a creative brief interpreter. Analyze the provided brief and extract key visual requirements, messaging, and deliverables. Focus on actionable creative direction.`;
      
      const userPrompt = `Analyze this creative brief and provide structured interpretation:

${briefContent}

${visualRequirements ? `Additional visual requirements: ${visualRequirements}` : ''}

Please provide:
1. Key messaging and positioning
2. Visual direction and style requirements
3. Specific deliverables needed
4. Target audience insights
5. Creative recommendations`;

      const result = await generateContentDirect(userPrompt, systemPrompt, 'gpt-4o');
      
      res.json({ interpretation: result });
    } catch (error: any) {
      console.error('Brief interpretation error:', error);
      res.status(500).json({ 
        error: "Brief interpretation failed", 
        details: error.message 
      });
    }
  });

  return server;
}