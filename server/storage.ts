import { db } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import { 
  users, type User, type InsertUser,
  savedPrompts, type SavedPrompt as DbSavedPrompt, type InsertSavedPrompt,
  savedPersonas, type SavedPersona as DbSavedPersona, type InsertSavedPersona,
  generatedContents, type GeneratedContent, type InsertGeneratedContent,
  briefConversations, type BriefConversation, type InsertBriefConversation,
  generatedImages, type GeneratedImage, type InsertGeneratedImage,
  imageProjects, type ImageProject, type InsertImageProject,
  chatSessions, type ChatSession, type InsertChatSession,
  campaigns, type Campaign, type InsertCampaign,
  ContentType
} from "@shared/schema";

// Flag to check if database is available
const isDatabaseAvailable = !!db;

export interface SavedPrompt {
  id: string;
  name: string;
  category: string;
  systemPrompt?: string;
  userPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedPersona {
  id: string;
  name: string;
  category: string;
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
  
  // Generated Image methods
  getGeneratedImages(): Promise<GeneratedImage[]>;
  getGeneratedImage(id: number): Promise<GeneratedImage | undefined>;
  saveGeneratedImage(image: InsertGeneratedImage): Promise<GeneratedImage>;
  updateGeneratedImage(id: number, image: Partial<InsertGeneratedImage>): Promise<GeneratedImage | undefined>;
  deleteGeneratedImage(id: number): Promise<boolean>;
  
  // Image Project methods
  getImageProjects(): Promise<ImageProject[]>;
  getImageProject(id: number): Promise<ImageProject | undefined>;
  saveImageProject(project: InsertImageProject): Promise<ImageProject>;
  updateImageProject(id: number, project: Partial<InsertImageProject>): Promise<ImageProject | undefined>;
  deleteImageProject(id: number): Promise<boolean>;
  getGeneratedImagesByProjectId(projectId: number): Promise<GeneratedImage[]>;
  
  // Chat Session methods
  getChatSessions(): Promise<ChatSession[]>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  saveChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | undefined>;
  deleteChatSession(id: number): Promise<boolean>;
  
  // Campaign methods
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  saveCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  getCampaignAssets(campaignId: number): Promise<{
    briefings: GeneratedContent[];
    content: GeneratedContent[];
    images: GeneratedImage[];
    projects: ImageProject[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not available");
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Prompt Library Implementation
  async getPrompts(): Promise<SavedPrompt[]> {
    if (!db) return [];
    const dbPrompts = await db.select().from(savedPrompts).orderBy(savedPrompts.updatedAt);
    
    // Convert the DB format to the interface format
    return dbPrompts.map(dbPrompt => ({
      id: dbPrompt.id.toString(),
      name: dbPrompt.name,
      category: dbPrompt.category || "General",
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    }));
  }

  async getPrompt(id: string): Promise<SavedPrompt | undefined> {
    if (!db) return undefined;
    const [dbPrompt] = await db.select().from(savedPrompts).where(eq(savedPrompts.id, parseInt(id)));
    
    if (!dbPrompt) return undefined;
    
    return {
      id: dbPrompt.id.toString(),
      name: dbPrompt.name,
      category: dbPrompt.category || "General",
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    };
  }

  async savePrompt(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPrompt> {
    if (!db) throw new Error("Database not available");
    const [dbPrompt] = await db.insert(savedPrompts).values({
      name: prompt.name,
      category: prompt.category || "General",
      systemPrompt: prompt.systemPrompt || null,
      userPrompt: prompt.userPrompt || null,
    }).returning();
    
    return {
      id: dbPrompt.id.toString(),
      name: dbPrompt.name,
      category: dbPrompt.category || "General",
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    };
  }

  async updatePrompt(id: string, promptUpdate: Partial<Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPrompt | undefined> {
    if (!db) return undefined;
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
      category: dbPrompt.category || "General",
      systemPrompt: dbPrompt.systemPrompt || undefined,
      userPrompt: dbPrompt.userPrompt || undefined,
      createdAt: dbPrompt.createdAt,
      updatedAt: dbPrompt.updatedAt
    };
  }

  async deletePrompt(id: string): Promise<boolean> {
    if (!db) return false;
    await db.delete(savedPrompts).where(eq(savedPrompts.id, parseInt(id)));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }

  // Persona Library Implementation
  async getPersonas(): Promise<SavedPersona[]> {
    if (!db) return [];
    const dbPersonas = await db.select().from(savedPersonas).orderBy(savedPersonas.updatedAt);
    
    // Convert the DB format to the interface format
    return dbPersonas.map(dbPersona => ({
      id: dbPersona.id.toString(),
      name: dbPersona.name,
      category: dbPersona.category || "General",
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    }));
  }

  async getPersona(id: string): Promise<SavedPersona | undefined> {
    if (!db) return undefined;
    const [dbPersona] = await db.select().from(savedPersonas).where(eq(savedPersonas.id, parseInt(id)));
    
    if (!dbPersona) return undefined;
    
    return {
      id: dbPersona.id.toString(),
      name: dbPersona.name,
      category: dbPersona.category || "General",
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    };
  }

  async savePersona(persona: Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPersona> {
    if (!db) throw new Error("Database not available");
    const [dbPersona] = await db.insert(savedPersonas).values({
      name: persona.name,
      category: persona.category || "General",
      description: persona.description || null,
      instruction: persona.instruction,
    }).returning();
    
    return {
      id: dbPersona.id.toString(),
      name: dbPersona.name,
      category: dbPersona.category || "General",
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    };
  }

  async updatePersona(id: string, personaUpdate: Partial<Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPersona | undefined> {
    if (!db) return undefined;
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
      category: dbPersona.category || "General",
      description: dbPersona.description || "",
      instruction: dbPersona.instruction,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt
    };
  }

  async deletePersona(id: string): Promise<boolean> {
    if (!db) return false;
    await db.delete(savedPersonas).where(eq(savedPersonas.id, parseInt(id)));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }

  // Generated Content Implementation
  async getGeneratedContents(contentType?: string): Promise<GeneratedContent[]> {
    if (!db) return [];
    if (contentType) {
      return await db.select()
        .from(generatedContents)
        .where(eq(generatedContents.contentType, contentType))
        .orderBy(generatedContents.updatedAt);
    }
    return await db.select().from(generatedContents).orderBy(generatedContents.updatedAt);
  }

  async getGeneratedContent(id: number): Promise<GeneratedContent | undefined> {
    if (!db) return undefined;
    const [content] = await db.select().from(generatedContents).where(eq(generatedContents.id, id));
    return content;
  }

  async saveGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent> {
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(generatedContents).values(content).returning();
    return result;
  }

  async updateGeneratedContent(id: number, content: Partial<InsertGeneratedContent>): Promise<GeneratedContent | undefined> {
    if (!db) return undefined;
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
    if (!db) return false;
    await db.delete(generatedContents).where(eq(generatedContents.id, id));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }
  
  // Brief Conversation Implementation
  async getBriefConversations(): Promise<BriefConversation[]> {
    if (!db) return [];
    return await db.select().from(briefConversations).orderBy(briefConversations.updatedAt);
  }
  
  async getBriefConversation(id: number): Promise<BriefConversation | undefined> {
    if (!db) return undefined;
    const [conversation] = await db.select().from(briefConversations).where(eq(briefConversations.id, id));
    return conversation;
  }
  
  async saveBriefConversation(conversation: InsertBriefConversation): Promise<BriefConversation> {
    if (!db) throw new Error("Database not available");
    const { title, messages } = conversation;
    // Ensure messages is an array of { role: string, content: string }
    const validMessages = Array.isArray(messages) ? 
      messages.map(m => {
        // Safely access properties from potentially unknown object
        const msg = m as any;
        return {
          role: typeof msg.role === 'string' ? msg.role : 'user',
          content: typeof msg.content === 'string' ? msg.content : ''
        };
      }) : [];
      
    const [result] = await db.insert(briefConversations).values({
      title,
      messages: validMessages
    }).returning();
    return result;
  }
  
  async updateBriefConversation(id: number, conversation: Partial<InsertBriefConversation>): Promise<BriefConversation | undefined> {
    if (!db) return undefined;
    const { title, messages } = conversation;
    
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };
    
    if (title) {
      updateData.title = title;
    }
    
    if (messages) {
      // Ensure messages is an array of { role: string, content: string }
      const validMessages = Array.isArray(messages) ? 
        messages.map(m => {
          // Safely access properties from potentially unknown object
          const msg = m as any;
          return {
            role: typeof msg.role === 'string' ? msg.role : 'user',
            content: typeof msg.content === 'string' ? msg.content : ''
          };
        }) : [];
      
      updateData.messages = validMessages;
    }
    
    const [result] = await db.update(briefConversations)
      .set(updateData)
      .where(eq(briefConversations.id, id))
      .returning();
    
    return result;
  }
  
  async deleteBriefConversation(id: number): Promise<boolean> {
    if (!db) return false;
    await db.delete(briefConversations).where(eq(briefConversations.id, id));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }

  // Generated Image Implementation
  async getGeneratedImages(): Promise<GeneratedImage[]> {
    if (!db) return [];
    return await db.select().from(generatedImages).orderBy(generatedImages.updatedAt);
  }

  async getGeneratedImage(id: number): Promise<GeneratedImage | undefined> {
    if (!db) return undefined;
    const [image] = await db.select().from(generatedImages).where(eq(generatedImages.id, id));
    return image;
  }

  async saveGeneratedImage(image: InsertGeneratedImage): Promise<GeneratedImage> {
    if (!db) throw new Error("Database not available");
    // Set default values for the new fields
    const imageWithDefaults = {
      ...image,
      model: image.model || "gpt-image-1",
      projectId: image.projectId || null,
      isVariation: image.isVariation || false
    };
    const [result] = await db.insert(generatedImages).values(imageWithDefaults).returning();
    return result;
  }

  async updateGeneratedImage(id: number, image: Partial<InsertGeneratedImage>): Promise<GeneratedImage | undefined> {
    if (!db) return undefined;
    const [result] = await db.update(generatedImages)
      .set({
        ...image,
        updatedAt: new Date()
      })
      .where(eq(generatedImages.id, id))
      .returning();
    
    return result;
  }

  async deleteGeneratedImage(id: number): Promise<boolean> {
    if (!db) return false;
    await db.delete(generatedImages).where(eq(generatedImages.id, id));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }
  
  // Image Project Implementation
  async getImageProjects(): Promise<ImageProject[]> {
    if (!db) return [];
    return await db.select().from(imageProjects).orderBy(imageProjects.updatedAt);
  }
  
  async getImageProject(id: number): Promise<ImageProject | undefined> {
    if (!db) return undefined;
    const [project] = await db.select().from(imageProjects).where(eq(imageProjects.id, id));
    return project;
  }
  
  async saveImageProject(project: InsertImageProject): Promise<ImageProject> {
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(imageProjects).values(project).returning();
    return result;
  }
  
  async updateImageProject(id: number, project: Partial<InsertImageProject>): Promise<ImageProject | undefined> {
    if (!db) return undefined;
    const [result] = await db.update(imageProjects)
      .set({
        ...project,
        updatedAt: new Date()
      })
      .where(eq(imageProjects.id, id))
      .returning();
    
    return result;
  }
  
  async deleteImageProject(id: number): Promise<boolean> {
    if (!db) return false;
    // First, disassociate any images from this project
    await db.update(generatedImages)
      .set({ projectId: null })
      .where(eq(generatedImages.projectId, id));
      
    // Then delete the project
    await db.delete(imageProjects).where(eq(imageProjects.id, id));
    // Since we don't have access to count, just return true if no error was thrown
    return true;
  }
  
  async getGeneratedImagesByProjectId(projectId: number): Promise<GeneratedImage[]> {
    if (!db) return [];
    return await db.select()
      .from(generatedImages)
      .where(eq(generatedImages.projectId, projectId))
      .orderBy(generatedImages.createdAt);
  }
  
  // Chat Session Implementation
  async getChatSessions(): Promise<ChatSession[]> {
    if (!db) return [];
    return await db.select().from(chatSessions).orderBy(chatSessions.updatedAt);
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    if (!db) return undefined;
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session;
  }

  async saveChatSession(session: InsertChatSession): Promise<ChatSession> {
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(chatSessions).values(session).returning();
    return result;
  }

  async updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    if (!db) return undefined;
    const [result] = await db.update(chatSessions)
      .set({
        ...session,
        updatedAt: new Date()
      })
      .where(eq(chatSessions.id, id))
      .returning();
    
    return result;
  }

  async deleteChatSession(id: number): Promise<boolean> {
    if (!db) return false;
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
    return true;
  }
}

// Memory Storage implementation for when database is not available
export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private prompts: SavedPrompt[] = [];
  private personas: SavedPersona[] = [];
  private generatedContents: GeneratedContent[] = [];
  private briefConversations: BriefConversation[] = [];
  private generatedImages: GeneratedImage[] = [];
  private imageProjects: ImageProject[] = [];
  private chatSessions: ChatSession[] = [];
  private nextUserId = 1;
  private nextPromptId = 1;
  private nextPersonaId = 1;
  private nextContentId = 1;
  private nextConversationId = 1;
  private nextImageId = 1;
  private nextProjectId = 1;
  private nextSessionId = 1;

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = { ...user, id: this.nextUserId++ };
    this.users.push(newUser);
    return newUser;
  }

  // Prompt Library methods
  async getPrompts(): Promise<SavedPrompt[]> {
    return this.prompts;
  }

  async getPrompt(id: string): Promise<SavedPrompt | undefined> {
    return this.prompts.find(p => p.id === id);
  }

  async savePrompt(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPrompt> {
    const now = new Date();
    const newPrompt: SavedPrompt = {
      ...prompt,
      id: String(this.nextPromptId++),
      createdAt: now,
      updatedAt: now
    };
    this.prompts.push(newPrompt);
    return newPrompt;
  }

  async updatePrompt(id: string, prompt: Partial<Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPrompt | undefined> {
    const index = this.prompts.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    const updated: SavedPrompt = {
      ...this.prompts[index],
      ...prompt,
      updatedAt: new Date()
    };
    this.prompts[index] = updated;
    return updated;
  }

  async deletePrompt(id: string): Promise<boolean> {
    const index = this.prompts.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.prompts.splice(index, 1);
    return true;
  }

  // Persona Library methods
  async getPersonas(): Promise<SavedPersona[]> {
    return this.personas;
  }

  async getPersona(id: string): Promise<SavedPersona | undefined> {
    return this.personas.find(p => p.id === id);
  }

  async savePersona(persona: Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPersona> {
    const now = new Date();
    const newPersona: SavedPersona = {
      ...persona,
      id: String(this.nextPersonaId++),
      createdAt: now,
      updatedAt: now
    };
    this.personas.push(newPersona);
    return newPersona;
  }

  async updatePersona(id: string, persona: Partial<Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPersona | undefined> {
    const index = this.personas.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    const updated: SavedPersona = {
      ...this.personas[index],
      ...persona,
      updatedAt: new Date()
    };
    this.personas[index] = updated;
    return updated;
  }

  async deletePersona(id: string): Promise<boolean> {
    const index = this.personas.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.personas.splice(index, 1);
    return true;
  }

  // Generated Content methods
  async getGeneratedContents(contentType?: string): Promise<GeneratedContent[]> {
    if (contentType) {
      return this.generatedContents.filter(c => c.contentType === contentType);
    }
    return this.generatedContents;
  }

  async getGeneratedContent(id: number): Promise<GeneratedContent | undefined> {
    return this.generatedContents.find(c => c.id === id);
  }

  async saveGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent> {
    const now = new Date();
    // Handle null values properly
    const newContent: GeneratedContent = {
      id: this.nextContentId++,
      title: content.title,
      content: content.content,
      contentType: content.contentType || 'general',
      systemPrompt: content.systemPrompt || null,
      userPrompt: content.userPrompt || null,
      model: content.model || null,
      temperature: content.temperature || null,
      metadata: content.metadata || null,
      createdAt: now,
      updatedAt: now
    };
    this.generatedContents.push(newContent);
    return newContent;
  }

  async updateGeneratedContent(id: number, content: Partial<InsertGeneratedContent>): Promise<GeneratedContent | undefined> {
    const index = this.generatedContents.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    
    const updated: GeneratedContent = {
      ...this.generatedContents[index],
      ...content,
      updatedAt: new Date()
    };
    this.generatedContents[index] = updated;
    return updated;
  }

  async deleteGeneratedContent(id: number): Promise<boolean> {
    const index = this.generatedContents.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.generatedContents.splice(index, 1);
    return true;
  }

  // Brief Conversation methods
  async getBriefConversations(): Promise<BriefConversation[]> {
    return this.briefConversations;
  }

  async getBriefConversation(id: number): Promise<BriefConversation | undefined> {
    return this.briefConversations.find(c => c.id === id);
  }

  async saveBriefConversation(conversation: InsertBriefConversation): Promise<BriefConversation> {
    const now = new Date();
    // Ensure messages is properly handled
    const validMessages = Array.isArray(conversation.messages) ? 
      conversation.messages.map(m => {
        const msg = m as any;
        return {
          role: typeof msg.role === 'string' ? msg.role : 'user',
          content: typeof msg.content === 'string' ? msg.content : ''
        };
      }) : [];
    
    const newConversation: BriefConversation = {
      id: this.nextConversationId++,
      title: conversation.title,
      messages: validMessages,
      createdAt: now,
      updatedAt: now
    };
    this.briefConversations.push(newConversation);
    return newConversation;
  }

  async updateBriefConversation(id: number, conversation: Partial<InsertBriefConversation>): Promise<BriefConversation | undefined> {
    const index = this.briefConversations.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    
    const existingConversation = this.briefConversations[index];
    
    // Handle updates properly
    let validMessages = existingConversation.messages;
    if (conversation.messages) {
      validMessages = Array.isArray(conversation.messages) ? 
        conversation.messages.map(m => {
          const msg = m as any;
          return {
            role: typeof msg.role === 'string' ? msg.role : 'user',
            content: typeof msg.content === 'string' ? msg.content : ''
          };
        }) : existingConversation.messages;
    }
    
    const updated: BriefConversation = {
      id: existingConversation.id,
      title: conversation.title || existingConversation.title,
      messages: validMessages,
      createdAt: existingConversation.createdAt,
      updatedAt: new Date()
    };
    
    this.briefConversations[index] = updated;
    return updated;
  }

  async deleteBriefConversation(id: number): Promise<boolean> {
    const index = this.briefConversations.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.briefConversations.splice(index, 1);
    return true;
  }

  // Generated Image methods

  async getGeneratedImages(): Promise<GeneratedImage[]> {
    return this.generatedImages;
  }

  async getGeneratedImage(id: number): Promise<GeneratedImage | undefined> {
    return this.generatedImages.find(img => img.id === id);
  }

  async saveGeneratedImage(image: InsertGeneratedImage): Promise<GeneratedImage> {
    const now = new Date();
    const newImage: GeneratedImage = {
      id: this.nextImageId++,
      title: image.title,
      prompt: image.prompt,
      imageUrl: image.imageUrl,
      style: image.style || null,
      size: image.size || null,
      quality: image.quality || null,
      model: image.model || "gpt-image-1",
      projectId: image.projectId || null,
      isVariation: image.isVariation || false,
      metadata: image.metadata || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.generatedImages.push(newImage);
    return newImage;
  }

  async updateGeneratedImage(id: number, image: Partial<InsertGeneratedImage>): Promise<GeneratedImage | undefined> {
    const index = this.generatedImages.findIndex(img => img.id === id);
    if (index === -1) return undefined;
    
    const updated: GeneratedImage = {
      ...this.generatedImages[index],
      ...image,
      updatedAt: new Date()
    };
    
    this.generatedImages[index] = updated;
    return updated;
  }

  async deleteGeneratedImage(id: number): Promise<boolean> {
    const index = this.generatedImages.findIndex(img => img.id === id);
    if (index === -1) return false;
    
    this.generatedImages.splice(index, 1);
    return true;
  }
  
  // Image Project methods
  async getImageProjects(): Promise<ImageProject[]> {
    return this.imageProjects;
  }
  
  async getImageProject(id: number): Promise<ImageProject | undefined> {
    return this.imageProjects.find(project => project.id === id);
  }
  
  async saveImageProject(project: InsertImageProject): Promise<ImageProject> {
    const now = new Date();
    const newProject: ImageProject = {
      id: this.nextProjectId++,
      name: project.name,
      description: project.description || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.imageProjects.push(newProject);
    return newProject;
  }
  
  async updateImageProject(id: number, project: Partial<InsertImageProject>): Promise<ImageProject | undefined> {
    const index = this.imageProjects.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    const updated: ImageProject = {
      ...this.imageProjects[index],
      ...project,
      updatedAt: new Date()
    };
    
    this.imageProjects[index] = updated;
    return updated;
  }
  
  async deleteImageProject(id: number): Promise<boolean> {
    const index = this.imageProjects.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    // Remove project ID from any associated images
    this.generatedImages.forEach(img => {
      if (img.projectId === id) {
        img.projectId = null;
      }
    });
    
    this.imageProjects.splice(index, 1);
    return true;
  }
  
  async getGeneratedImagesByProjectId(projectId: number): Promise<GeneratedImage[]> {
    return this.generatedImages.filter(img => img.projectId === projectId);
  }
  
  // Chat Session methods
  async getChatSessions(): Promise<ChatSession[]> {
    return this.chatSessions;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    return this.chatSessions.find(s => s.id === id);
  }

  async saveChatSession(session: InsertChatSession): Promise<ChatSession> {
    const now = new Date();
    const newSession: ChatSession = {
      id: this.nextSessionId++,
      name: session.name,
      messages: session.messages,
      createdAt: now,
      updatedAt: now
    };
    this.chatSessions.push(newSession);
    return newSession;
  }

  async updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    const index = this.chatSessions.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    const updated: ChatSession = {
      ...this.chatSessions[index],
      ...session,
      updatedAt: new Date()
    };
    this.chatSessions[index] = updated;
    return updated;
  }

  async deleteChatSession(id: number): Promise<boolean> {
    const index = this.chatSessions.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.chatSessions.splice(index, 1);
    return true;
  }

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    if (!db) return [];
    return await db.select().from(campaigns).orderBy(campaigns.updatedAt);
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    if (!db) return undefined;
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async saveCampaign(campaign: InsertCampaign): Promise<Campaign> {
    if (!db) throw new Error("Database not available");
    const [saved] = await db.insert(campaigns).values(campaign).returning();
    return saved;
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    if (!db) return undefined;
    const [updated] = await db
      .update(campaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getCampaignAssets(campaignId: number): Promise<{
    briefings: GeneratedContent[];
    content: GeneratedContent[];
    images: GeneratedImage[];
    projects: ImageProject[];
  }> {
    if (!db) return { briefings: [], content: [], images: [], projects: [] };

    // Get all content associated with this campaign
    const allContent = await db.select().from(generatedContents)
      .where(eq(generatedContents.campaignId, campaignId));

    const briefings = allContent.filter(c => c.contentType === 'briefing');
    const content = allContent.filter(c => c.contentType !== 'briefing');

    // Get image projects associated with this campaign
    const projects = await db.select().from(imageProjects)
      .where(eq(imageProjects.campaignId, campaignId));

    // Get images from those projects
    const projectIds = projects.map(p => p.id);
    const images = projectIds.length > 0 
      ? await db.select().from(generatedImages)
          .where(generatedImages.projectId.in(projectIds))
      : [];

    return { briefings, content, images, projects };
  }
}

// Use DatabaseStorage if database is available, otherwise use MemoryStorage
export const storage: IStorage = isDatabaseAvailable 
  ? new DatabaseStorage() 
  : new MemoryStorage();
