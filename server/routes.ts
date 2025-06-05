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

// Helper function to determine if reasoning loop is needed
function shouldUseReasoningLoop(message: string, researchContext: string): boolean {
  const lowerMessage = message.toLowerCase();
  const lowerContext = researchContext.toLowerCase();
  
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
    'strategy', 'why did', 'what made', 'success factors',
    'driving', 'behind the', 'analysis of', 'insights into'
  ];
  
  const allIndicators = [...comprehensiveIndicators, ...comparativeIndicators, ...strategicIndicators];
  
  return allIndicators.some(indicator => 
    lowerMessage.includes(indicator) || lowerContext.includes(indicator)
  );
}

import { handleOptimizedTTS } from "./voice-optimization";
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
        imageGeneration: {
          openai: ['dall-e-3', 'dall-e-2'],
          gemini: GeminiAPI.GEMINI_MODELS.image
        }
      };
      
      res.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ error: 'Failed to fetch available models' });
    }
  });
  
  // Multi-provider content generation endpoint
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      const { model, systemPrompt, userPrompt, temperature } = req.body;
      
      if (!model || !userPrompt) {
        return res.status(400).json({ error: 'Model and userPrompt are required' });
      }

      let result: string;
      
      if (model.startsWith('gpt-')) {
        // OpenAI models - use existing function
        return await generateContent(req, res);
      } else if (AnthropicAPI.ANTHROPIC_MODELS.includes(model)) {
        // Anthropic models
        result = await AnthropicAPI.generateContent({
          model,
          prompt: userPrompt,
          systemPrompt,
          temperature,
          maxTokens: 4000
        });
      } else if (GeminiAPI.GEMINI_MODELS.chat.includes(model)) {
        // Gemini models
        result = await GeminiAPI.generateContent({
          model,
          prompt: userPrompt,
          systemPrompt,
          temperature,
          maxTokens: 4000
        });
      } else {
        return res.status(400).json({ error: 'Unsupported model' });
      }
      
      res.json({ content: result });
    } catch (error) {
      console.error('Content generation error:', error);
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });
  
  app.post("/api/generate", async (req: Request, res: Response) => {
    // Redirect to the new endpoint for backward compatibility
    return await generateContent(req, res);
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
  
  // Creative brief interpretation endpoint
  app.post("/api/process-brief", processBrief);
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
      
      // Create OpenAI instance
      const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Call OpenAI API
      const completion = await openAIClient.chat.completions.create({
        model: model || "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are an expert at transforming creative briefs into effective image generation prompts. Your job is to extract the key visual elements from a creative brief and create a detailed, optimized prompt for image generation." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      });
      
      // Extract the generated prompt from the response
      const generatedPrompt = completion.choices[0].message.content || "";
      
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

      // Use OpenAI directly with minimal configuration
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Debug logging
      console.log('Chat request context:', JSON.stringify(context, null, 2));
      console.log('Research context value:', context?.researchContext);
      
      // Check if this is a research-enhanced request
      if (context?.researchContext && context.researchContext.trim().length > 0) {
        console.log('Activating deep research mode...');
        console.log('Research query:', message);
        console.log('Research context:', context.researchContext);
        
        // Determine if this requires advanced reasoning or simple research
        const requiresReasoning = shouldUseReasoningLoop(message, context.researchContext);
        
        let researchResults: string;
        let reasoningMetadata = '';
        
        if (requiresReasoning) {
          console.log('Activating self-reasoning loop...');
          const reasoningResult = await reasoningEngine.performReasoningLoop(message, context.researchContext);
          researchResults = reasoningResult.finalInsights;
          reasoningMetadata = `\n\n[Analysis completed using ${reasoningResult.totalQueries} research queries in ${Math.round(reasoningResult.processingTime/1000)}s. Completeness: ${Math.round(reasoningResult.completenessScore*100)}%]`;
          console.log('Reasoning loop completed:', {
            queries: reasoningResult.totalQueries,
            completeness: reasoningResult.completenessScore,
            time: reasoningResult.processingTime
          });
        } else {
          console.log('Using direct research...');
          researchResults = await performDeepResearch(message, context.researchContext);
        }
        
        console.log('Research results length:', researchResults.length);
        console.log('Research results preview:', researchResults.substring(0, 500) + '...');
        
        // Build system prompt with real research data
        const systemPrompt = `You are SAGE (Strategic Adaptive Generative Engine), the central intelligence hub for the Aquent Content AI platform. You are a British marketing specialist and creative entrepreneur with 20 years of experience from London. You use she/her pronouns and work as a collaborator to help creative marketers speed up their work.

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

CRITICAL INSTRUCTION: The user has requested a detailed research report. You MUST provide a comprehensive, thorough response using ALL the research data below. Do NOT summarize or condense the information. Present the full details from the research data.

=== COMPREHENSIVE RESEARCH DATA ===
${researchResults}${reasoningMetadata}
=== END RESEARCH DATA ===

MANDATORY RESPONSE REQUIREMENTS:
1. Present ALL campaigns mentioned in the research data with complete details
2. Include ALL specific information: dates, budgets, agencies, strategies, outcomes, metrics
3. Use direct quotes and specific data points from the research
4. Maintain the full depth and detail of the research data
5. Include all source citations provided in the research data
6. If the user requests "everything you can find" or "comprehensive report," provide the complete research data, not a summary

Respond only with conversational text - no buttons, badges, or UI elements. Provide specific, actionable insights based exclusively on the research data above. Remember: you're helping fellow creatives thrive in their work while embodying the values of the industry's leading creative staffing firm.`;

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: message }
        ];

        // Adjust response length and style for voice conversations
        const maxTokens = context?.isVoiceConversation ? 800 : 4000;
        const voiceInstructions = context?.isVoiceConversation 
          ? "\n\nIMPORTANT: This is a voice conversation. Keep your response conversational, natural, and concise (2-3 sentences max). Speak as if you're having a friendly chat with a colleague." 
          : "";

        // Check if user requested comprehensive/detailed research report
        const isComprehensiveRequest = message.toLowerCase().includes('comprehensive') || 
                                     message.toLowerCase().includes('detailed') || 
                                     message.toLowerCase().includes('everything you can find') ||
                                     message.toLowerCase().includes('deep research report');

        if (isComprehensiveRequest && researchResults.length > 1000) {
          // For comprehensive requests, provide the full research data with minimal AI processing
          const directResponse = `Based on current research data, here's a comprehensive report on your query:

${researchResults}

This research was conducted using real-time data sources to provide you with current, accurate information about the campaigns and strategies you requested.`;
          
          return res.json({ 
            content: directResponse,
            model: "research-direct",
            timestamp: new Date().toISOString()
          });
        }

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: 'system' as const, content: systemPrompt + voiceInstructions },
            { role: 'user' as const, content: message }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        });

        const reply = completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";
        
        return res.json({ 
          content: reply,
          model: "gpt-4o",
          timestamp: new Date().toISOString()
        });
      }

      // Standard response without research
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

Respond only with conversational text - no buttons, badges, or UI elements. When users ask about memory, voice capabilities, or context sharing between modules, confirm these capabilities are active. Always maintain the approachable expertise of someone who's been in the trenches of creative marketing while embodying Aquent's commitment to making work matter.`;

      // Adjust response length and style for voice conversations
      const maxTokens = context?.isVoiceConversation ? 600 : 1500;
      const voiceInstructions = context?.isVoiceConversation 
        ? "\n\nIMPORTANT: This is a voice conversation. Keep your response conversational, natural, and concise (2-3 sentences max). Speak as if you're having a friendly chat with a colleague." 
        : "";

      // Simple message structure
      const messages = [
        { role: 'system' as const, content: systemPrompt + voiceInstructions },
        { role: 'user' as const, content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      });

      const reply = completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";
      
      res.json({ 
        content: reply,
        model: "gpt-4o",
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
