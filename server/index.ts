import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, pool } from './db';
import { sql } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import { initializeLearningEngine } from '../shared/learning-engine';
import { initializePinecone } from './services/pinecone';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Log Gemini-only mode status on startup
if (process.env.GEMINI_ONLY_MODE === 'true') {
  console.log('🚀 GEMINI-ONLY MODE ENABLED - All AI requests will be routed to Google Gemini');
}

const app = express();
// Increase JSON payload size limit to 50MB to handle base64 encoded images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Configure multer for memory storage (no files saved to disk)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to initialize the database tables
async function initializeDatabase() {
  try {
    // Skip if database is not available
    if (!db) {
      log('Database connection not available. Skipping initialization.');
      return false;
    }

    // Check if database connection is working
    log('Checking database connection...');
    await db.execute(sql`SELECT 1`);
    log('Database connection successful');

    // Create tables if they don't exist
    log('Ensuring all database tables exist...');
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);
    
    // Create saved_prompts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS saved_prompts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        system_prompt TEXT,
        user_prompt TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create saved_personas table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS saved_personas (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        instruction TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create generated_contents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS generated_contents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'general',
        system_prompt TEXT,
        user_prompt TEXT,
        model TEXT,
        temperature TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create brief_conversations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brief_conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        messages JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    log('Database tables initialized successfully');
    return true;
  } catch (error) {
    log(`Database initialization error: ${error}`);
    return false;
  }
}

(async () => {
  // Initialize database tables before starting the application
  const dbInitialized = await initializeDatabase();
  if (!dbInitialized) {
    log('WARNING: Database initialization failed. Application may have limited functionality.');
  }

  // Initialize learning engine with pool connection
  if (pool && dbInitialized) {
    try {
      const learningEngine = initializeLearningEngine(pool);
      await learningEngine.initialize();
      log('Learning engine initialized successfully');
    } catch (error) {
      log(`Learning engine initialization failed: ${error}`);
    }
  }

  // Initialize Pinecone Assistant if API key is available
  if (process.env.PINECONE_API_KEY) {
    try {
      const pineconeInitialized = await initializePinecone();
      if (pineconeInitialized) {
        log('Pinecone Assistant initialized successfully');
      } else {
        log('Pinecone Assistant initialization failed');
      }
    } catch (error) {
      log(`Pinecone initialization error: ${error}`);
    }
  } else {
    log('Pinecone API key not found - RAG search will be disabled');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
