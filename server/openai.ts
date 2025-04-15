import OpenAI from "openai";
import { Request, Response } from "express";

export interface GenerateContentRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

export const generateContent = async (req: Request, res: Response) => {
  try {
    const { model, systemPrompt, userPrompt, temperature } = req.body as GenerateContentRequest;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "Server API key configuration is missing" });
    }

    if (!userPrompt) {
      return res.status(400).json({ message: "User prompt is required" });
    }

    // Initialize OpenAI with the API key from environment variables
    // Configure OpenAI client to handle project-specific API keys (sk-proj-...)
    // Support both standard OpenAI API and project-based configurations
    // Create configuration object with required properties
    const openaiConfig: any = { 
      apiKey: process.env.OPENAI_API_KEY,
    };
    
    // Add optional configuration for project-specific keys
    if (process.env.OPENAI_API_BASE_URL) {
      openaiConfig.baseURL = process.env.OPENAI_API_BASE_URL;
    }
    
    // Add organization ID if available
    if (process.env.OPENAI_ORG_ID) {
      openaiConfig.organization = process.env.OPENAI_ORG_ID;
    }
    
    // Check if using a project key format and add default base URL if needed
    if (process.env.OPENAI_API_KEY?.startsWith('sk-proj-')) {
      // For project-specific keys, we may need a specific base URL
      if (!openaiConfig.baseURL) {
        // Use project-specific API endpoint if no custom base URL is provided
        openaiConfig.baseURL = 'https://api.replit.com/v1/openai';
      }
    }
    
    // Initialize the OpenAI client with the configuration
    const openai = new OpenAI(openaiConfig);

    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o",
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
    });

    const content = completion.choices[0].message.content || "";

    return res.status(200).json({ content });
  } catch (error: any) {
    console.error("Error generating content:", error);
    
    // Handle common OpenAI API errors
    if (error.status === 401) {
      console.error("OpenAI API key error details:", error.error);
      return res.status(401).json({ 
        message: "Invalid API key. Please check your OpenAI API key and try again.", 
        details: "The server is using an invalid or expired API key. Please contact the administrator."
      });
    } 
    
    if (error.status === 429) {
      return res.status(429).json({ message: "Rate limit exceeded. Please try again later or check your OpenAI plan limits." });
    }
    
    if (error.status === 500) {
      return res.status(500).json({ message: "OpenAI server error. Please try again later." });
    }
    
    return res.status(500).json({ message: error.message || "An error occurred while generating content" });
  }
};
