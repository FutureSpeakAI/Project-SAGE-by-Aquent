import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, SavedPrompt, SavedPersona } from "./storage";
import { generateContent, generateImage } from "./openai";
import { processBrief } from "./brief-processing";
import { processImage } from "./image-processing";
import { upload } from './index';
import OpenAI from "openai";
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
  
  // OpenAI content generation endpoint
  app.post("/api/generate-content", generateContent);
  app.post("/api/generate", generateContent); // Keep old endpoint for backward compatibility
  
  // OpenAI image generation endpoint
  app.post("/api/generate-image", generateImage);
  
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

  // Simple chat endpoint for Free Prompt agent
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, model, temperature } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Use OpenAI directly with minimal configuration
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Simple message structure
      const messages = [
        { 
          role: 'system' as const, 
          content: 'You are a helpful AI assistant for content creation and marketing. Provide detailed, practical responses in plain text. Do not create buttons, badges, or any UI elements in your responses. Just provide helpful information and advice.' 
        },
        { role: 'user' as const, content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1500,
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
