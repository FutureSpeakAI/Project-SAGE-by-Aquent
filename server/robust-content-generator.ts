import { Request, Response } from "express";
import OpenAI from "openai";
import * as AnthropicAPI from "./anthropic";
import * as GeminiAPI from "./gemini";
import { ContentFormatter } from "./content-formatter";
import { EmergencyFallback } from "./emergency-fallback";

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

    // Skip problematic OpenAI calls and go straight to working fallbacks
    if (model.startsWith('gpt-')) {
      // Try a quick OpenAI attempt with timeout
      try {
        const quickResult = await Promise.race([
          this.tryOpenAI(model, systemPrompt, userPrompt, temperature),
          new Promise(resolve => setTimeout(() => resolve({ success: false }), 8000))
        ]) as any;
        
        if (quickResult.success) {
          res.json({ content: quickResult.content, provider: 'openai' });
          return;
        }
      } catch (error) {
        console.log('OpenAI quick attempt failed, using fallbacks');
      }
    }

    // Try Anthropic as primary fallback
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

    // Try simplified OpenAI as reliable fallback
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

    // Final fallback: Gemini
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

    // All methods failed - provide a fallback response
    console.log('All AI providers failed, providing structured fallback content');
    const fallbackContent = ContentFormatter.generateFallbackContent(userPrompt);
    res.json({
      content: fallbackContent,
      provider: 'fallback',
      fallback: true,
      message: 'Generated structured content due to temporary AI service unavailability'
    });
  }

  private async tryOpenAI(model: string, systemPrompt: string, userPrompt: string, temperature?: number) {
    try {
      // Detect if this is executing deliverables from a brief
      const isExecutingFromBrief = userPrompt.toLowerCase().includes('brief') || 
                                   userPrompt.toLowerCase().includes('campaign') ||
                                   (userPrompt.toLowerCase().includes('create') && 
                                    (userPrompt.toLowerCase().includes('post') || 
                                     userPrompt.toLowerCase().includes('social') ||
                                     userPrompt.toLowerCase().includes('content')));

      let enhancedSystemPrompt = systemPrompt || "You are a helpful assistant.";
      
      if (isExecutingFromBrief) {
        enhancedSystemPrompt += "\n\nCRITICAL: You are executing deliverables based on a creative brief. When given a brief, analyze what deliverables are needed and create them directly. For social media requests, create actual post copy with hashtags. For content requests, create the actual content. DO NOT create another brief or strategy document - execute the work specified in the brief.";
      }

      enhancedSystemPrompt += "\n\nFormatting Instructions:\n- Use HTML tags: <h1>, <h2>, <h3> for headings\n- Use <strong> and <em> for emphasis\n- Format lists with <ul>, <ol>, and <li> tags\n- Provide comprehensive, detailed content\n- Do not include currency symbols, placeholder text, or formatting artifacts\n- Start immediately with the content (no introductory phrases)";

      const completion = await this.openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: enhancedSystemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: temperature || 0.7,
        max_tokens: 4000,
      });

      let content = completion.choices[0].message.content || "";
      
      // Clean up formatting artifacts using ContentFormatter
      content = ContentFormatter.cleanAndFormat(content);
      
      return { success: true, content };
    } catch (error: any) {
      console.error('OpenAI error:', error.message);
      return { success: false, error: error.message };
    }
  }

  private async tryAnthropic(userPrompt: string, systemPrompt?: string, temperature?: number) {
    try {
      // Detect if this is executing deliverables from a brief
      const isExecutingFromBrief = userPrompt.toLowerCase().includes('brief') || 
                                   userPrompt.toLowerCase().includes('campaign') ||
                                   (userPrompt.toLowerCase().includes('create') && 
                                    (userPrompt.toLowerCase().includes('post') || 
                                     userPrompt.toLowerCase().includes('social') ||
                                     userPrompt.toLowerCase().includes('content')));

      // Also detect social media post requests specifically
      const isSocialPostRequest = userPrompt.toLowerCase().includes('social post') || 
                                 userPrompt.toLowerCase().includes('social media') ||
                                 userPrompt.toLowerCase().includes('create posts') ||
                                 (userPrompt.toLowerCase().includes('post') && 
                                  (userPrompt.toLowerCase().includes('facebook') || 
                                   userPrompt.toLowerCase().includes('instagram') || 
                                   userPrompt.toLowerCase().includes('twitter') || 
                                   userPrompt.toLowerCase().includes('linkedin') ||
                                   userPrompt.toLowerCase().includes('tiktok')));

      let finalSystemPrompt = systemPrompt || "You are a helpful assistant.";

      if (isExecutingFromBrief || isSocialPostRequest) {
        finalSystemPrompt = "You are executing deliverables based on a creative brief or request. When given a brief, analyze what deliverables are needed and create them directly. For social media requests, create actual post copy with hashtags. For content requests, create the actual content. DO NOT create another brief or strategy document - execute the work specified. Format posts as: **Post 1:** [actual post text] #hashtag1 #hashtag2 **Visual:** [description].";
      }

      const content = await AnthropicAPI.generateContent({
        model: "claude-sonnet-4-20250514",
        prompt: userPrompt,
        systemPrompt: finalSystemPrompt,
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
      // Detect if this is executing deliverables from a brief or social media request
      const isExecutingFromBrief = userPrompt.toLowerCase().includes('brief') || 
                                   userPrompt.toLowerCase().includes('campaign') ||
                                   (userPrompt.toLowerCase().includes('create') && 
                                    (userPrompt.toLowerCase().includes('post') || 
                                     userPrompt.toLowerCase().includes('social') ||
                                     userPrompt.toLowerCase().includes('content')));

      const isSocialPostRequest = userPrompt.toLowerCase().includes('social post') || 
                                 userPrompt.toLowerCase().includes('social media') ||
                                 userPrompt.toLowerCase().includes('create posts') ||
                                 (userPrompt.toLowerCase().includes('post') && 
                                  (userPrompt.toLowerCase().includes('facebook') || 
                                   userPrompt.toLowerCase().includes('instagram') || 
                                   userPrompt.toLowerCase().includes('twitter') || 
                                   userPrompt.toLowerCase().includes('linkedin') ||
                                   userPrompt.toLowerCase().includes('tiktok')));

      let systemPrompt = "You are a professional content creator. Generate well-formatted, comprehensive content with proper structure. Use HTML tags for formatting: <h1>, <h2>, <h3> for headings, <strong> for emphasis, <ul>/<li> for lists. Do not include placeholder symbols, currency signs, or formatting artifacts.";

      if (isExecutingFromBrief || isSocialPostRequest) {
        systemPrompt = "CRITICAL: You are executing deliverables based on a creative brief. When given a brief, analyze what deliverables are needed and create them directly. For social media requests, create actual post copy with hashtags. For content requests, create the actual content. DO NOT create another brief or strategy document - execute the work specified in the brief. Format posts as: **Post 1:** [actual post text] #hashtag1 #hashtag2 **Visual:** [description].";
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      let content = completion.choices[0].message.content || "";
      
      // Clean up formatting artifacts using ContentFormatter
      content = ContentFormatter.cleanAndFormat(content);
      
      return { success: true, content };
    } catch (error: any) {
      console.error('Simplified OpenAI error:', error.message);
      return { success: false, error: error.message };
    }
  }

  private cleanContentFormatting(content: string): string {
    // Remove currency artifacts and placeholder symbols
    content = content.replace(/\$\d+/g, ''); // Remove $3, $1, etc.
    content = content.replace(/^\s*[\$\#\*\-]+\s*/gm, ''); // Remove leading symbols
    content = content.replace(/\n{3,}/g, '\n\n'); // Clean up excessive line breaks
    content = content.replace(/^(Platform|Campaign Duration|Objective):\s*\$\d+\s*/gm, '$1: '); // Fix specific formatting issues
    
    // Convert markdown headers to HTML if not already formatted
    content = content.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    content = content.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    content = content.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    
    // Convert markdown bold to HTML
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    return content.trim();
  }
}

export const robustContentGenerator = new RobustContentGenerator();