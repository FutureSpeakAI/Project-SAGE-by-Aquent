import OpenAI from "openai";
import { Request, Response } from "express";
import { chat } from "@replit/ai-modelfarm";

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

    // Check if we're using a Replit project-specific API key
    const isReplitProjectKey = process.env.OPENAI_API_KEY.startsWith('sk-proj-');
    
    // Log which API mode we're using
    console.log(`Using ${isReplitProjectKey ? 'Replit ModelFarm' : 'standard OpenAI'} API`);
    
    let content = "";
    
    if (isReplitProjectKey) {
      // Use the Replit ModelFarm SDK for project-specific keys
      try {
        console.log("Attempting to use ModelFarm API with project key");
        
        // Use the chat function from the ModelFarm package
        const response = await chat({
          apiKey: process.env.OPENAI_API_KEY,
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
        
        // Check if the chat response was successful
        if (response.ok) {
          content = response.value.choices[0].message.content || "";
        } else {
          // Handle error from the ModelFarm API
          console.error("ModelFarm API error:", response.error);
          throw new Error(response.error.message || "Error generating content with ModelFarm");
        }
      } catch (modelFarmError) {
        console.error("ModelFarm API error:", modelFarmError);
        
        // If ModelFarm has a network error, try falling back to direct OpenAI API
        console.log("ModelFarm failed, attempting fallback to direct OpenAI API");
        try {
          // Try direct OpenAI access with the same key
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
          
          content = completion.choices[0].message.content || "";
          console.log("Fallback to direct OpenAI API successful");
        } catch (fallbackError) {
          console.error("Fallback to direct OpenAI API failed:", fallbackError);
          throw modelFarmError; // Throw original error
        }
      }
    } else {
      // Use standard OpenAI API for regular API keys
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
      
      content = completion.choices[0].message.content || "";
    }

    return res.status(200).json({ content });
  } catch (error: any) {
    console.error("Error generating content:", error);
    
    // Handle common API errors
    if (error.status === 401 || (error.response && error.response.status === 401)) {
      console.error("API key error details:", error.error || error);
      return res.status(401).json({ 
        message: "Invalid API key. Please check your API key and try again.", 
        details: "The server is using an invalid or expired API key. Please contact the administrator."
      });
    } 
    
    if (error.status === 429 || (error.response && error.response.status === 429)) {
      return res.status(429).json({ message: "Rate limit exceeded. Please try again later or check your plan limits." });
    }
    
    if (error.status === 500 || (error.response && error.response.status === 500)) {
      return res.status(500).json({ message: "API server error. Please try again later." });
    }
    
    return res.status(500).json({ message: error.message || "An error occurred while generating content" });
  }
};
