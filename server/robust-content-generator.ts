import { Request, Response } from "express";
import OpenAI from "openai";
import * as AnthropicAPI from "./anthropic";
import * as GeminiAPI from "./gemini";

export interface ContentGenerationRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export class RobustContentGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 20000,
      maxRetries: 1,
    });
  }

  async generateContent(req: Request, res: Response): Promise<void> {
    const { model, systemPrompt, userPrompt, temperature } = req.body as ContentGenerationRequest;

    if (!userPrompt) {
      res.status(400).json({ error: "User prompt is required" });
      return;
    }

    console.log(`[Robust Generation] Attempting with model: ${model}`);

    // Try OpenAI first
    if (model.startsWith('gpt-')) {
      const openaiResult = await this.tryOpenAI(model, systemPrompt, userPrompt, temperature);
      if (openaiResult.success) {
        res.json({ content: openaiResult.content, provider: 'openai' });
        return;
      }
      console.log('OpenAI failed, trying Anthropic fallback');
    }

    // Try Anthropic as fallback
    const anthropicResult = await this.tryAnthropic(userPrompt, systemPrompt, temperature);
    if (anthropicResult.success) {
      res.json({ 
        content: anthropicResult.content, 
        provider: 'anthropic',
        fallback: true,
        message: 'Generated using Anthropic due to OpenAI issues'
      });
      return;
    }
    console.log('Anthropic failed, trying Gemini fallback');

    // Try Gemini as second fallback
    const geminiResult = await this.tryGemini(userPrompt, systemPrompt, temperature);
    if (geminiResult.success) {
      res.json({ 
        content: geminiResult.content, 
        provider: 'gemini',
        fallback: true,
        message: 'Generated using Gemini due to API issues'
      });
      return;
    }
    console.log('All providers failed, trying simplified OpenAI');

    // Final fallback: simplified OpenAI request
    const simplifiedResult = await this.trySimplifiedOpenAI(userPrompt);
    if (simplifiedResult.success) {
      res.json({ 
        content: simplifiedResult.content, 
        provider: 'openai-simplified',
        fallback: true,
        message: 'Generated using simplified prompt due to API complexity issues'
      });
      return;
    }

    // All methods failed
    res.status(503).json({
      error: "Content generation temporarily unavailable",
      message: "All AI providers are experiencing issues. Please try again in a few minutes.",
      details: "OpenAI, Anthropic, and Gemini APIs are all unavailable"
    });
  }

  private async tryOpenAI(model: string, systemPrompt: string, userPrompt: string, temperature?: number) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt || "You are a helpful assistant."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: temperature || 0.7,
        max_tokens: 4000,
      });

      const content = completion.choices[0].message.content || "";
      return { success: true, content };
    } catch (error: any) {
      console.error('OpenAI error:', error.message);
      return { success: false, error: error.message };
    }
  }

  private async tryAnthropic(userPrompt: string, systemPrompt?: string, temperature?: number) {
    try {
      const content = await AnthropicAPI.generateContent({
        model: "claude-sonnet-4-20250514",
        prompt: userPrompt,
        systemPrompt: systemPrompt || "You are a helpful assistant.",
        temperature: temperature || 0.7,
        maxTokens: 4000
      });
      return { success: true, content };
    } catch (error: any) {
      console.error('Anthropic error:', error.message);
      return { success: false, error: error.message };
    }
  }

  private async tryGemini(userPrompt: string, systemPrompt?: string, temperature?: number) {
    try {
      const content = await GeminiAPI.generateContent({
        model: "gemini-1.5-pro",
        prompt: userPrompt,
        systemPrompt: systemPrompt || "You are a helpful assistant.",
        temperature: temperature || 0.7,
        maxTokens: 4000
      });
      return { success: true, content };
    } catch (error: any) {
      console.error('Gemini error:', error.message);
      return { success: false, error: error.message };
    }
  }

  private async trySimplifiedOpenAI(userPrompt: string) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: userPrompt.substring(0, 1000) // Simplified shorter prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = completion.choices[0].message.content || "";
      return { success: true, content };
    } catch (error: any) {
      console.error('Simplified OpenAI error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const robustContentGenerator = new RobustContentGenerator();