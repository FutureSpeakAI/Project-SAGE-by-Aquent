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

// Table for storing generated images
export const generatedImages = pgTable("generated_images", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url").notNull(),
  style: text("style"),
  size: text("size"),
  quality: text("quality"),
  model: text("model").default("dall-e-3"),
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
