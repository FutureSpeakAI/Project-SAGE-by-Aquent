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
  // Enhanced system prompt for brief execution consistency
  let enhancedSystemPrompt = request.systemPrompt || '';
  
  // Detect brief execution requests
  const isBriefExecution = request.prompt.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)');
  
  if (isBriefExecution && !enhancedSystemPrompt.includes('professional content creator')) {
    enhancedSystemPrompt = "You are a professional content creator executing creative briefs. Based on the provided creative brief, create the specific content deliverables requested. Focus on creating engaging, professional content that fulfills the brief's objectives. Do not repeat or summarize the brief - create the actual content it describes. Use proper HTML formatting with <h1>, <h2>, <h3> for headings, <strong> for emphasis, <ul>/<li> for lists.";
  }

  const message = await anthropic.messages.create({
    model: request.model,
    max_tokens: request.maxTokens || 4000,
    temperature: request.temperature || 0.7,
    system: enhancedSystemPrompt,
    messages: [
      { role: 'user', content: request.prompt }
    ],
  });

  let content = message.content[0].type === 'text' ? message.content[0].text : '';
  
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

export const ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307'
];