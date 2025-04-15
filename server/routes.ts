import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, SavedPrompt, SavedPersona } from "./storage";
import { generateContent } from "./openai";
import { 
  GeneratedContent, 
  InsertGeneratedContent, 
  BriefConversation, 
  InsertBriefConversation,
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
      const [prompts, personas, contents, conversations] = await Promise.all([
        storage.getPrompts(),
        storage.getPersonas(),
        storage.getGeneratedContents(),
        storage.getBriefConversations()
      ]);
      
      res.json({
        prompts,
        personas,
        contents,
        conversations,
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
      const { prompts, personas, contents, conversations } = req.body;
      
      // Track import stats
      const stats = {
        promptsImported: 0,
        personasImported: 0,
        contentsImported: 0,
        conversationsImported: 0
      };
      
      // Import prompts
      if (Array.isArray(prompts)) {
        for (const prompt of prompts) {
          try {
            await storage.savePrompt({
              name: prompt.name,
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
  
  // OpenAI content generation endpoint
  app.post("/api/generate", generateContent);

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
      const { name, systemPrompt, userPrompt } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Prompt name is required" });
      }
      
      if (!systemPrompt && !userPrompt) {
        return res.status(400).json({ error: "Either system prompt or user prompt must be provided" });
      }
      
      const savedPrompt = await storage.savePrompt({
        name,
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
      const { name, systemPrompt, userPrompt } = req.body;
      
      if (!name && !systemPrompt && !userPrompt) {
        return res.status(400).json({ error: "At least one field must be provided for update" });
      }
      
      const updatedPrompt = await storage.updatePrompt(id, {
        ...(name && { name }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(userPrompt !== undefined && { userPrompt })
      });
      
      if (!updatedPrompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      
      res.json(updatedPrompt);
    } catch (error) {
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
      const { name, description, instruction } = req.body;
      
      if (!name || !instruction) {
        return res.status(400).json({ error: "Name and instruction are required" });
      }
      
      const savedPersona = await storage.savePersona({
        name,
        description: description || "",
        instruction
      });
      
      res.status(201).json(savedPersona);
    } catch (error) {
      res.status(500).json({ error: "Failed to save persona" });
    }
  });

  app.put("/api/personas/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, instruction } = req.body;
      
      if (!name && !description && !instruction) {
        return res.status(400).json({ error: "At least one field must be provided for update" });
      }
      
      const updatedPersona = await storage.updatePersona(id, {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(instruction && { instruction })
      });
      
      if (!updatedPersona) {
        return res.status(404).json({ error: "Persona not found" });
      }
      
      res.json(updatedPersona);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
