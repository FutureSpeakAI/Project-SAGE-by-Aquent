import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface GeminiGenerateContentRequest {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  sessionHistory?: Array<{role: string, content: string}>;
}

export interface GeminiGenerateImageRequest {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  numberOfImages?: number;
}

export const generateContent = async (request: GeminiGenerateContentRequest): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: request.model });
  
  // Enhanced system prompt for brief execution consistency
  let enhancedSystemPrompt = request.systemPrompt || '';
  
  // Detect brief execution requests
  const isBriefExecution = request.prompt.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)');
  
  if (isBriefExecution && !enhancedSystemPrompt.includes('professional content creator')) {
    enhancedSystemPrompt = "You are a professional content creator executing creative briefs. Based on the provided creative brief, create the specific content deliverables requested. Focus on creating engaging, professional content that fulfills the brief's objectives. Do not repeat or summarize the brief - create the actual content it describes. Use proper HTML formatting with <h1>, <h2>, <h3> for headings, <strong> for emphasis, <ul>/<li> for lists.";
  }
  
  // Build conversation history for Gemini
  let conversationPrompt = enhancedSystemPrompt ? `${enhancedSystemPrompt}\n\n` : '';
  
  // Add session history
  if (request.sessionHistory) {
    request.sessionHistory.forEach(msg => {
      if (msg.role === 'user') {
        conversationPrompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        conversationPrompt += `Assistant: ${msg.content}\n\n`;
      }
    });
  }
  
  // Add current message
  conversationPrompt += `User: ${request.prompt}`;

  console.log('[Gemini] Making API request with model:', request.model);
  console.log('[Gemini] Prompt length:', conversationPrompt.length);
  console.log('[Gemini] Session history entries:', request.sessionHistory?.length || 0);
  
  const result = await model.generateContent(conversationPrompt);
  const response = await result.response;
  let content = response.text();
  
  console.log('[Gemini] API request completed successfully');
  
  // Apply consistent formatting if not brief execution
  if (!isBriefExecution) {
    // Convert markdown to HTML for consistency
    content = content.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    content = content.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    content = content.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  return content;
};

export const generateImage = async (request: GeminiGenerateImageRequest): Promise<{ images: string[] }> => {
  const model = genAI.getGenerativeModel({ model: request.model || 'imagen-3.0-generate-001' });
  
  const result = await model.generateContent([
    {
      text: request.prompt
    }
  ]);
  
  const response = await result.response;
  
  // Note: Gemini image generation may return base64 encoded images or URLs
  // This is a placeholder implementation - actual response format depends on API
  return {
    images: [response.text()] // This would need to be adapted based on actual API response
  };
};

export const GEMINI_MODELS = {
  chat: [
    'gemini-2.0-flash',  // Latest production model (Dec 2024)
    'gemini-2.0-flash-lite',  // Cost-optimized variant
    'gemini-1.5-pro-002',  // Fallback for complex tasks
    'gemini-1.5-flash-002',  // Previous fast model
    'gemini-1.0-pro'  // Legacy support
  ],
  image: [
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001'
  ]
};

// Helper function to select best model based on context
export const selectGeminiModel = (isComplex: boolean = false, preferSpeed: boolean = true): string => {
  if (process.env.GEMINI_ONLY_MODE === 'true') {
    // In Gemini-only mode, use the best available models
    if (isComplex) {
      return 'gemini-2.0-flash';  // 2.0 Flash is superior to 1.5 Pro now
    }
    return preferSpeed ? 'gemini-2.0-flash-lite' : 'gemini-2.0-flash';
  }
  // Default fallback
  return 'gemini-1.5-flash-002';
};