import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  users, type User, type InsertUser,
  savedPrompts, type SavedPrompt as DbSavedPrompt, type InsertSavedPrompt,
  savedPersonas, type SavedPersona as DbSavedPersona, type InsertSavedPersona,
  generatedContents, type GeneratedContent, type InsertGeneratedContent,
  briefConversations, type BriefConversation, type InsertBriefConversation,
  ContentType
} from "@shared/schema";

export interface SavedPrompt {
  id: string;
  name: string;
  systemPrompt?: string;
  userPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedPersona {
  id: string;
  name: string;
  description: string;
  instruction: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Prompt Library methods
  getPrompts(): Promise<SavedPrompt[]>;
  getPrompt(id: string): Promise<SavedPrompt | undefined>;
  savePrompt(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPrompt>;
  updatePrompt(id: string, prompt: Partial<Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPrompt | undefined>;
  deletePrompt(id: string): Promise<boolean>;
  
  // Persona Library methods
  getPersonas(): Promise<SavedPersona[]>;
  getPersona(id: string): Promise<SavedPersona | undefined>;
  savePersona(persona: Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPersona>;
  updatePersona(id: string, persona: Partial<Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPersona | undefined>;
  deletePersona(id: string): Promise<boolean>;
  
  // Generated Content methods
  getGeneratedContents(contentType?: string): Promise<GeneratedContent[]>;
  getGeneratedContent(id: number): Promise<GeneratedContent | undefined>;
  saveGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  updateGeneratedContent(id: number, content: Partial<InsertGeneratedContent>): Promise<GeneratedContent | undefined>;
  deleteGeneratedContent(id: number): Promise<boolean>;
  
  // Brief Conversation methods
  getBriefConversations(): Promise<BriefConversation[]>;
  getBriefConversation(id: number): Promise<BriefConversation | undefined>;
  saveBriefConversation(conversation: InsertBriefConversation): Promise<BriefConversation>;
  updateBriefConversation(id: number, conversation: Partial<InsertBriefConversation>): Promise<BriefConversation | undefined>;
  deleteBriefConversation(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Prompt Library Implementation
  async getPrompts(): Promise<SavedPrompt[]> {
    const dbPrompts = await db.select().from(savedPrompts).orderBy(savedPrompts.updatedAt);
    
    // Convert the DB format to the interface format
    return dbPrompts.map(dbPrompt => ({
      id: dbPrompt.id.toString(),
      name: dbPrompt.name,
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    }));
  }

  async getPrompt(id: string): Promise<SavedPrompt | undefined> {
    const [dbPrompt] = await db.select().from(savedPrompts).where(eq(savedPrompts.id, parseInt(id)));
    
    if (!dbPrompt) return undefined;
    
    return {
      id: dbPrompt.id.toString(),
      name: dbPrompt.name,
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    };
  }

  async savePrompt(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPrompt> {
    const [dbPrompt] = await db.insert(savedPrompts).values({
      name: prompt.name,
      systemPrompt: prompt.systemPrompt || null,
      userPrompt: prompt.userPrompt || null,
    }).returning();
    
    return {
      id: dbPrompt.id.toString(),
      name: dbPrompt.name,
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    };
  }

  async updatePrompt(id: string, promptUpdate: Partial<Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPrompt | undefined> {
    const [dbPrompt] = await db.update(savedPrompts)
      .set({
        ...promptUpdate,
        updatedAt: new Date()
      })
      .where(eq(savedPrompts.id, parseInt(id)))
      .returning();
    
    if (!dbPrompt) return undefined;
    
    return {
      id: dbPrompt.id.toString(),
      name: dbPrompt.name,
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    };
  }

  async deletePrompt(id: string): Promise<boolean> {
    await db.delete(savedPrompts).where(eq(savedPrompts.id, parseInt(id)));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }

  // Persona Library Implementation
  async getPersonas(): Promise<SavedPersona[]> {
    const dbPersonas = await db.select().from(savedPersonas).orderBy(savedPersonas.updatedAt);
    
    // Convert the DB format to the interface format
    return dbPersonas.map(dbPersona => ({
      id: dbPersona.id.toString(),
      name: dbPersona.name,
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    }));
  }

  async getPersona(id: string): Promise<SavedPersona | undefined> {
    const [dbPersona] = await db.select().from(savedPersonas).where(eq(savedPersonas.id, parseInt(id)));
    
    if (!dbPersona) return undefined;
    
    return {
      id: dbPersona.id.toString(),
      name: dbPersona.name,
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    };
  }

  async savePersona(persona: Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPersona> {
    const [dbPersona] = await db.insert(savedPersonas).values({
      name: persona.name,
      description: persona.description || null,
      instruction: persona.instruction,
    }).returning();
    
    return {
      id: dbPersona.id.toString(),
      name: dbPersona.name,
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    };
  }

  async updatePersona(id: string, personaUpdate: Partial<Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPersona | undefined> {
    const [dbPersona] = await db.update(savedPersonas)
      .set({
        ...personaUpdate,
        updatedAt: new Date()
      })
      .where(eq(savedPersonas.id, parseInt(id)))
      .returning();
    
    if (!dbPersona) return undefined;
    
    return {
      id: dbPersona.id.toString(),
      name: dbPersona.name,
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    };
  }

  async deletePersona(id: string): Promise<boolean> {
    await db.delete(savedPersonas).where(eq(savedPersonas.id, parseInt(id)));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }

  // Generated Content Implementation
  async getGeneratedContents(): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContents).orderBy(generatedContents.updatedAt);
  }

  async getGeneratedContent(id: number): Promise<GeneratedContent | undefined> {
    const [content] = await db.select().from(generatedContents).where(eq(generatedContents.id, id));
    return content;
  }

  async saveGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent> {
    const [result] = await db.insert(generatedContents).values(content).returning();
    return result;
  }

  async updateGeneratedContent(id: number, content: Partial<InsertGeneratedContent>): Promise<GeneratedContent | undefined> {
    const [result] = await db.update(generatedContents)
      .set({
        ...content,
        updatedAt: new Date()
      })
      .where(eq(generatedContents.id, id))
      .returning();
    
    return result;
  }

  async deleteGeneratedContent(id: number): Promise<boolean> {
    await db.delete(generatedContents).where(eq(generatedContents.id, id));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }
}

export const storage = new DatabaseStorage();
