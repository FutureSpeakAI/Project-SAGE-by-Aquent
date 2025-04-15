export interface GenerateRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

export interface GenerateResponse {
  content: string;
}
