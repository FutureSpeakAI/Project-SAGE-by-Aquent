import { users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private prompts: Map<string, SavedPrompt>;
  private personas: Map<string, SavedPersona>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.prompts = new Map();
    this.personas = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Prompt Library Implementation
  async getPrompts(): Promise<SavedPrompt[]> {
    return Array.from(this.prompts.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getPrompt(id: string): Promise<SavedPrompt | undefined> {
    return this.prompts.get(id);
  }

  async savePrompt(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPrompt> {
    const id = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const savedPrompt: SavedPrompt = {
      ...prompt,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.prompts.set(id, savedPrompt);
    return savedPrompt;
  }

  async updatePrompt(id: string, promptUpdate: Partial<Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPrompt | undefined> {
    const existingPrompt = this.prompts.get(id);
    if (!existingPrompt) return undefined;

    const updatedPrompt: SavedPrompt = {
      ...existingPrompt,
      ...promptUpdate,
      updatedAt: new Date()
    };

    this.prompts.set(id, updatedPrompt);
    return updatedPrompt;
  }

  async deletePrompt(id: string): Promise<boolean> {
    return this.prompts.delete(id);
  }

  // Persona Library Implementation
  async getPersonas(): Promise<SavedPersona[]> {
    return Array.from(this.personas.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getPersona(id: string): Promise<SavedPersona | undefined> {
    return this.personas.get(id);
  }

  async savePersona(persona: Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPersona> {
    const id = `persona_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const savedPersona: SavedPersona = {
      ...persona,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.personas.set(id, savedPersona);
    return savedPersona;
  }

  async updatePersona(id: string, personaUpdate: Partial<Omit<SavedPersona, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedPersona | undefined> {
    const existingPersona = this.personas.get(id);
    if (!existingPersona) return undefined;

    const updatedPersona: SavedPersona = {
      ...existingPersona,
      ...personaUpdate,
      updatedAt: new Date()
    };

    this.personas.set(id, updatedPersona);
    return updatedPersona;
  }

  async deletePersona(id: string): Promise<boolean> {
    return this.personas.delete(id);
  }
}

export const storage = new MemStorage();
