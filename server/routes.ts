import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
          const fallbackResult = await generateContent(userPrompt, enhancedSystemPrompt, 'gpt-4o-mini');
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

  // Brief analysis endpoint
  app.post("/api/analyze-brief", async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const analysis = await processBrief(content);
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

  return server;
}