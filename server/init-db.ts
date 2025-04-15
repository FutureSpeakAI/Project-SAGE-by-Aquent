// This script will run before the application starts to ensure the database is properly initialized
import { db } from './db';
import { users, savedPrompts, savedPersonas, generatedContents, briefConversations } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // Check if the database is accessible
    await db.execute(sql`SELECT 1`);
    console.log('Database connection successful!');
    
    // Create tables if they don't exist
    await createTablesIfNotExist();
    
    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

async function createTablesIfNotExist() {
  console.log('Creating tables if they do not exist...');
  
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
  
  console.log('Tables created/verified successfully!');
}

// Run the initialization
initializeDatabase();