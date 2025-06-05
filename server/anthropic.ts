import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnthropicGenerateContentRequest {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export const generateContent = async (request: AnthropicGenerateContentRequest): Promise<string> => {
  const message = await anthropic.messages.create({
    model: request.model,
    max_tokens: request.maxTokens || 4000,
    temperature: request.temperature || 0.7,
    system: request.systemPrompt || '',
    messages: [
      { role: 'user', content: request.prompt }
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
};

export const ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307'
];