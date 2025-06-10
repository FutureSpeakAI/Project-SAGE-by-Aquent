import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface GeminiGenerateContentRequest {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
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
  
  const prompt = enhancedSystemPrompt 
    ? `${enhancedSystemPrompt}\n\nUser: ${request.prompt}` 
    : request.prompt;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let content = response.text();
  
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
    'gemini-1.5-pro-002',
    'gemini-1.5-flash-002',
    'gemini-1.0-pro'
  ],
  image: [
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001'
  ]
};