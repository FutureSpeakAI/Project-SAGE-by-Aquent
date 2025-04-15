import OpenAI from "openai";
import { Request, Response } from "express";

export interface GenerateContentRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

export const generateContent = async (req: Request, res: Response) => {
  try {
    const { apiKey, model, systemPrompt, userPrompt, temperature } = req.body as GenerateContentRequest;

    if (!apiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    if (!userPrompt) {
      return res.status(400).json({ message: "User prompt is required" });
    }

    // Initialize OpenAI with the provided API key
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const openai = new OpenAI({ apiKey });

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
      return res.status(401).json({ message: "Invalid API key. Please check your OpenAI API key and try again." });
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
