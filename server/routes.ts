import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContent } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // OpenAI content generation endpoint
  app.post("/api/generate", generateContent);

  const httpServer = createServer(app);

  return httpServer;
}
