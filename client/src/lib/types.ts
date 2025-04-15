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

// Prompt Library Types
export interface SavedPrompt {
  id: string;
  name: string;
  systemPrompt?: string;
  userPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptRequest {
  name: string;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface UpdatePromptRequest {
  name?: string;
  systemPrompt?: string;
  userPrompt?: string;
}

// Persona Library Types
export interface SavedPersona {
  id: string;
  name: string;
  description: string;
  instruction: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonaRequest {
  name: string;
  description?: string;
  instruction: string;
}

export interface UpdatePersonaRequest {
  name?: string;
  description?: string;
  instruction?: string;
}
