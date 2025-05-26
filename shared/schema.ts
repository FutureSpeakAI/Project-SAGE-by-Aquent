import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define an enum for content types
export enum ContentType {
  GENERAL = 'general',
  BRIEFING = 'briefing',
  VISUAL = 'visual'
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Table for storing saved prompts
export const savedPrompts = pgTable("saved_prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").default("General"),
  systemPrompt: text("system_prompt"),
  userPrompt: text("user_prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSavedPromptSchema = createInsertSchema(savedPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedPrompt = z.infer<typeof insertSavedPromptSchema>;
export type SavedPrompt = typeof savedPrompts.$inferSelect;

// Table for storing saved personas
export const savedPersonas = pgTable("saved_personas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").default("General"),
  description: text("description"),
  instruction: text("instruction").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSavedPersonaSchema = createInsertSchema(savedPersonas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedPersona = z.infer<typeof insertSavedPersonaSchema>;
export type SavedPersona = typeof savedPersonas.$inferSelect;

// Table for storing generated content/outputs
export const generatedContents = pgTable("generated_contents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentType: text("content_type").default('general').notNull(), // 'general' or 'briefing'
  systemPrompt: text("system_prompt"),
  userPrompt: text("user_prompt"),
  model: text("model"),
  temperature: text("temperature"), // Store as text to handle potential floating point issues
  metadata: json("metadata").$type<Record<string, any>>(), // Additional data that might be useful
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGeneratedContentSchema = createInsertSchema(generatedContents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;
export type GeneratedContent = typeof generatedContents.$inferSelect;

// Table for storing brief conversations
export const briefConversations = pgTable("brief_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  messages: json("messages").$type<Array<{role: string, content: string}>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBriefConversationSchema = createInsertSchema(briefConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBriefConversation = z.infer<typeof insertBriefConversationSchema>;
export type BriefConversation = typeof briefConversations.$inferSelect;

// Table for storing image projects
export const imageProjects = pgTable("image_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertImageProjectSchema = createInsertSchema(imageProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImageProject = z.infer<typeof insertImageProjectSchema>;
export type ImageProject = typeof imageProjects.$inferSelect;

// Table for storing generated images
export const generatedImages = pgTable("generated_images", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url").notNull(),
  style: text("style"),
  size: text("size"),
  quality: text("quality"),
  model: text("model").default("gpt-image-1"),
  projectId: integer("project_id").references(() => imageProjects.id, { onDelete: 'set null' }),
  isVariation: boolean("is_variation").default(false),
  metadata: json("metadata").$type<Record<string, any>>(), // Additional data like negative prompts, seed, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGeneratedImageSchema = createInsertSchema(generatedImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGeneratedImage = z.infer<typeof insertGeneratedImageSchema>;
export type GeneratedImage = typeof generatedImages.$inferSelect;

// Table for storing project memories (brand guidelines, style docs, etc.)
export const projectMemories = pgTable("project_memories", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  memoryType: text("memory_type").notNull(), // 'brand_guidelines', 'style_guide', 'tone_of_voice', 'regulatory_requirements'
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectMemorySchema = createInsertSchema(projectMemories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectMemory = z.infer<typeof insertProjectMemorySchema>;
export type ProjectMemory = typeof projectMemories.$inferSelect;

// Table for storing free prompt conversations with context
export const freePromptSessions = pgTable("free_prompt_sessions", {
  id: serial("id").primaryKey(),
  sessionName: text("session_name").notNull(),
  messages: json("messages").$type<Array<{role: string, content: string, timestamp: string}>>().notNull(),
  contextSettings: json("context_settings").$type<{
    selectedPersona?: number;
    selectedPrompts?: number[];
    selectedMemories?: number[];
    temperature: number;
    model: string;
    customInstructions?: string;
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFreePromptSessionSchema = createInsertSchema(freePromptSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFreePromptSession = z.infer<typeof insertFreePromptSessionSchema>;
export type FreePromptSession = typeof freePromptSessions.$inferSelect;
