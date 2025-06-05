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
  
  const prompt = request.systemPrompt 
    ? `${request.systemPrompt}\n\nUser: ${request.prompt}` 
    : request.prompt;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
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